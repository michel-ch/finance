// Import flow — 3-step CSV → staging → commit pipeline.
// Per master-spec §18.5 + §6: Source select → Column map → Review staging.
// Overrides window.FC.ImportScreen (load AFTER extra-screens.jsx).

(function () {
  const { Icon, MoneyDisplay, formatMoney } = window.FC;

  // ─── CSV parsing (vanilla, supports quoted fields) ───────────
  // Sniff the field separator from the first few non-empty lines so semicolon
  // and tab-separated bank exports work without a UI choice.
  function detectDelim(sample) {
    const lines = sample.split(/\r?\n/).filter(l => l.length).slice(0, 10);
    if (!lines.length) return ',';
    const cands = [';', '\t', ',', '|'];
    let best = ',', bestScore = 0;
    for (const d of cands) {
      const counts = lines.map(l => l.split(d).length);
      const max = Math.max.apply(null, counts);
      if (max < 2) continue;
      const consistent = counts.filter(c => c === max).length;
      const score = max * consistent;
      if (score > bestScore) { bestScore = score; best = d; }
    }
    return best;
  }

  function parseCsv(text) {
    const sep = detectDelim(text.slice(0, 4096));
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i + 1];
      if (inQuotes) {
        if (c === '"' && n === '"') { field += '"'; i++; }
        else if (c === '"') { inQuotes = false; }
        else { field += c; }
      } else {
        if (c === '"') { inQuotes = true; }
        else if (c === sep) { row.push(field); field = ''; }
        else if (c === '\n' || c === '\r') {
          if (c === '\r' && n === '\n') i++;
          row.push(field); field = '';
          if (row.some(v => v.length)) rows.push(row);
          row = [];
        } else { field += c; }
      }
    }
    if (field.length || row.length) { row.push(field); if (row.some(v => v.length)) rows.push(row); }
    return rows;
  }

  function normalizeDesc(s) {
    return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  // Try to coerce a string into a number (handles "1.234,56", "1,234.56", "-12.50")
  function parseAmount(raw) {
    if (raw == null) return NaN;
    let s = String(raw).trim().replace(/[€$£¥\s]/g, '');
    // If both . and , are present, the rightmost is the decimal sep
    if (s.includes('.') && s.includes(',')) {
      const lastDot = s.lastIndexOf('.'), lastComma = s.lastIndexOf(',');
      if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (s.includes(',')) {
      // single comma — treat as decimal (EU style)
      s = s.replace(',', '.');
    }
    return parseFloat(s);
  }

  // Try to coerce a string into ISO date YYYY-MM-DD
  function parseDate(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    // ISO already
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    // DD/MM/YYYY or DD-MM-YYYY
    let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (m) {
      let yr = m[3].length === 2 ? '20' + m[3] : m[3];
      return yr + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
    }
    return null;
  }

  // Detect rows whose column count is an outlier vs the modal — these are usually
  // opening/closing balance summary rows in bank exports. Returns the indices to skip
  // (relative to the full rows[] array including a possible header row) along with the
  // dropped balance rows so the UI can show them as context.
  function detectSkipRows(rows, hasHeader) {
    const start = hasHeader ? 1 : 0;
    const data = rows.slice(start);
    const skip = new Set();
    if (data.length < 3) return { skip, modal: 0 };
    const freq = {};
    data.forEach(r => { freq[r.length] = (freq[r.length] || 0) + 1; });
    let modal = data[0].length, maxCount = 0;
    Object.keys(freq).forEach(k => {
      const n = parseInt(k, 10);
      if (freq[k] > maxCount) { maxCount = freq[k]; modal = n; }
    });
    data.forEach((r, i) => {
      if (r.length < modal * 0.7) skip.add(start + i);
    });
    return { skip, modal };
  }

  // Normalize a transaction description for fuzzy matching: drop the bank's
  // "CB " prefix, strip trailing/embedded dates ("17/03/26"), collapse symbols
  // and whitespace, lowercase. So "CB MP*CARREFOUR     30/04/26" and
  // "CB MP*CARREFOUR 22/04/26" both reduce to "mp carrefour".
  function descKey(s) {
    if (!s) return '';
    return String(s)
      .toLowerCase()
      .replace(/\bcb\b\s*/g, '')
      .replace(/\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/g, '')
      .replace(/[*]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Build category recommendation index from already-saved transactions.
  // Returns { byDesc: {key: catId}, byTag: {tag: catId} } picking the most
  // common categoryId for each key. Used to auto-prefill new staging rows.
  function buildCategoryIndex(txs) {
    const accDesc = {};
    const accTag = {};
    (txs || []).forEach(t => {
      if (!t || !t.categoryId) return;
      const key = descKey(t.description || t.merchant || '');
      if (key) {
        if (!accDesc[key]) accDesc[key] = {};
        accDesc[key][t.categoryId] = (accDesc[key][t.categoryId] || 0) + 1;
      }
      (t.tags || []).forEach(tag => {
        if (!tag) return;
        if (!accTag[tag]) accTag[tag] = {};
        accTag[tag][t.categoryId] = (accTag[tag][t.categoryId] || 0) + 1;
      });
    });
    function dominant(m) {
      const out = {};
      Object.keys(m).forEach(k => {
        const counts = m[k];
        let best = null, bestN = 0;
        Object.keys(counts).forEach(c => {
          if (counts[c] > bestN) { bestN = counts[c]; best = c; }
        });
        if (best) out[k] = best;
      });
      return out;
    }
    return { byDesc: dominant(accDesc), byTag: dominant(accTag) };
  }

  // Multi-value chip input with native datalist autocomplete. Used for tags.
  // Enter or comma commits a tag; Backspace on empty input removes the last chip.
  function TagInput({ value, onChange, listId, placeholder }) {
    const [text, setText] = React.useState('');
    const tags = value || [];
    function add(raw) {
      const v = (raw || '').trim();
      if (!v || tags.indexOf(v) >= 0) return;
      onChange(tags.concat([v]));
      setText('');
    }
    function remove(t) {
      onChange(tags.filter(x => x !== t));
    }
    return (
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
        minHeight: 26, padding: '2px 4px',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
        minWidth: 0,
      }}>
        {tags.map(t => (
          <span key={t} style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '1px 4px 1px 6px', borderRadius: 999,
            background: 'var(--accent-tint)', color: 'var(--accent)',
            fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            {t}
            <button type="button" onClick={() => remove(t)} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'inherit', padding: 0, fontSize: 14, lineHeight: 1,
            }} aria-label={'Remove ' + t}>×</button>
          </span>
        ))}
        <input
          list={listId}
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(text); }
            else if (e.key === 'Backspace' && !text && tags.length) { remove(tags[tags.length - 1]); }
          }}
          onBlur={() => { if (text.trim()) add(text); }}
          placeholder={tags.length ? '' : (placeholder || 'add tag…')}
          style={{
            flex: 1, minWidth: 70, height: 20, padding: '0 4px',
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: 11, fontFamily: 'inherit', color: 'var(--text-primary)',
          }}
        />
      </div>
    );
  }

  // ─── Step 1: Source select ───────────────────────────────────
  function SourceStep({ templates, onPick, onFile }) {
    const fileRef = React.useRef(null);
    const [hover, setHover] = React.useState(false);

    function handleFiles(files) {
      if (!files || !files.length) return;
      const f = files[0];
      const reader = new FileReader();
      reader.onload = e => onFile(f.name, e.target.result);
      reader.readAsText(f);
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>1. Pick a source</h2>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Choose a saved template or drop a new CSV. Everything lands in staging first.
          </div>
        </div>

        {/* Saved templates */}
        <div className="fc-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>
            Saved templates
          </div>
          {templates.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              No templates yet — your first import will offer to save one.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {templates.map(t => (
                <button key={t.id} onClick={() => onPick(t)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  textAlign: 'left', cursor: 'pointer',
                }}>
                  <Icon name="box" size={14} color="var(--accent)" />
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{t.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {(t.mapping || []).filter(m => m !== 'ignore').length} mapped cols
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setHover(true); }}
          onDragLeave={() => setHover(false)}
          onDrop={e => { e.preventDefault(); setHover(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current && fileRef.current.click()}
          style={{
            border: '2px dashed ' + (hover ? 'var(--accent)' : 'var(--border)'),
            background: hover ? 'var(--accent-tint)' : 'var(--surface-sunken)',
            borderRadius: 12, padding: 40,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            cursor: 'pointer',
            transition: 'all 120ms var(--ease)',
          }}
        >
          <Icon name="upload" size={28} color={hover ? 'var(--accent)' : 'var(--text-tertiary)'} />
          <div style={{ fontSize: 15, fontWeight: 600 }}>Drop a CSV here, or click to choose</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Custom CSV — we'll let you map columns next.</div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
          />
        </div>
      </div>
    );
  }

  // ─── Step 2: Column map ──────────────────────────────────────
  const FIELD_OPTIONS = [
    ['ignore', 'Ignore'],
    ['date', 'Date'],
    ['amount', 'Amount'],
    ['description', 'Description'],
    ['category', 'Category'],
    ['account', 'Account'],
  ];

  // Heuristic: a row is a header iff none of its cells parses as a date.
  function looksLikeHeader(row) {
    if (!row || !row.length) return false;
    return !row.some(c => parseDate(c));
  }

  // Content-based field inference for headerless or oddly-named CSVs.
  function inferTypes(dataRows, numCols) {
    const out = new Array(numCols).fill('ignore');
    const seenSingle = new Set();
    const SINGLE = ['date', 'amount', 'category', 'account'];
    for (let idx = 0; idx < numCols; idx++) {
      const samples = dataRows.slice(0, 20).map(r => (r[idx] || '').trim()).filter(Boolean);
      if (!samples.length) continue;
      const dateRatio = samples.filter(s => parseDate(s)).length / samples.length;
      const numRatio = samples.filter(s => !isNaN(parseAmount(s))).length / samples.length;
      const avgLen = samples.reduce((s, x) => s + x.length, 0) / samples.length;
      const uniq = new Set(samples).size;
      let t = 'ignore';
      if (dateRatio > 0.7) t = 'date';
      else if (numRatio > 0.7) t = 'amount';
      else if (avgLen > 12) t = 'description';
      else if (avgLen >= 3 && uniq <= Math.max(3, samples.length / 3)) t = 'category';
      if (SINGLE.indexOf(t) >= 0) {
        if (seenSingle.has(t)) t = 'ignore';
        else seenSingle.add(t);
      }
      out[idx] = t;
    }
    return out;
  }

  function MapStep({ rows, fileName, initialMapping, onBack, onConfirm }) {
    // Use max width across rows — bank exports often bookend transactions with shorter
    // balance summary rows, so rows[0].length under-counts columns.
    const numCols = rows.reduce((m, r) => Math.max(m, (r || []).length), 0);
    const [hasHeader, setHasHeader] = React.useState(() => looksLikeHeader(rows[0]));

    const headerRow = rows[0] || [];
    const headers = Array.from({ length: numCols }, (_, i) =>
      hasHeader ? (headerRow[i] || `Col ${i + 1}`) : `Col ${i + 1}`
    );
    const previewRows = hasHeader ? rows.slice(1, 6) : rows.slice(0, 5);

    const [mapping, setMapping] = React.useState(() => {
      if (initialMapping && initialMapping.length === numCols) return initialMapping.slice();
      const dataRows = hasHeader ? rows.slice(1) : rows;
      // Header-name regex first when present, falling back to content inference.
      if (hasHeader) {
        const headerMap = (rows[0] || []).map(h => {
          const lc = (h || '').toLowerCase();
          if (/date|jour/.test(lc)) return 'date';
          if (/amount|montant|debit|credit|value/.test(lc)) return 'amount';
          if (/desc|libell|merchant|details|narr/.test(lc)) return 'description';
          if (/categ/.test(lc)) return 'category';
          if (/account|compte/.test(lc)) return 'account';
          return null;
        });
        const inferred = inferTypes(dataRows, numCols);
        return headerMap.map((h, i) => h || inferred[i] || 'ignore');
      }
      return inferTypes(dataRows, numCols);
    });

    // Re-infer when the user toggles the header switch.
    const headerToggleRef = React.useRef(hasHeader);
    React.useEffect(() => {
      if (headerToggleRef.current === hasHeader) return;
      headerToggleRef.current = hasHeader;
      const dataRows = hasHeader ? rows.slice(1) : rows;
      setMapping(inferTypes(dataRows, numCols));
    }, [hasHeader, rows, numCols]);

    const [saveTpl, setSaveTpl] = React.useState(false);
    const [tplName, setTplName] = React.useState(fileName.replace(/\.csv$/i, ''));

    const dateIdx = mapping.indexOf('date');
    const amountIdx = mapping.indexOf('amount');
    const canContinue = dateIdx >= 0 && amountIdx >= 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>2. Map columns</h2>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{fileName}</span> · {hasHeader ? rows.length - 1 : rows.length} rows · pick what each column means. Map two columns to <em>Description</em> to merge debit/credit labels.
          </div>
        </div>

        <div className="fc-card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            id="has-header"
            type="checkbox"
            checked={hasHeader}
            onChange={e => setHasHeader(e.target.checked)}
            style={{ accentColor: 'var(--accent)' }}
          />
          <label htmlFor="has-header" style={{ fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
            First row is a header
            <span style={{ color: 'var(--text-tertiary)', marginLeft: 6, fontSize: 12 }}>
              (uncheck for headerless bank exports — auto-detected)
            </span>
          </label>
        </div>

        <div className="fc-card" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--surface-sunken)' }}>
                {headers.map((h, i) => (
                  <th key={i} style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', minWidth: 120 }}>
                    <select
                      value={mapping[i]}
                      onChange={e => {
                        const v = e.target.value;
                        setMapping(m => m.map((x, j) => j === i ? v : x));
                      }}
                      className="fc-input"
                      style={{ height: 28, fontSize: 12, padding: '0 6px', width: '100%' }}
                    >
                      {FIELD_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {h || `Col ${i + 1}`}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((r, ri) => (
                <tr key={ri}>
                  {headers.map((_, ci) => (
                    <td key={ci} style={{
                      padding: '8px 12px',
                      borderBottom: ri === previewRows.length - 1 ? 'none' : '1px solid var(--border)',
                      fontFamily: 'var(--font-mono)',
                      color: mapping[ci] === 'ignore' ? 'var(--text-tertiary)' : 'var(--text-primary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240,
                    }}>{r[ci] || ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Save as template */}
        <div className="fc-card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <input id="save-tpl" type="checkbox" checked={saveTpl} onChange={e => setSaveTpl(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
          <label htmlFor="save-tpl" style={{ fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
            Save this mapping as a template
          </label>
          {saveTpl && (
            <input
              value={tplName}
              onChange={e => setTplName(e.target.value)}
              placeholder="Template name (e.g. BNP Paribas)"
              className="fc-input"
              style={{ height: 30, fontSize: 12, flex: 1, maxWidth: 280 }}
            />
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="fc-btn fc-btn-ghost" style={{ height: 36 }} onClick={onBack}>Back</button>
          <div style={{ flex: 1 }} />
          {!canContinue && (
            <span style={{ fontSize: 12, color: 'var(--warning)', alignSelf: 'center' }}>
              Map at least Date and Amount.
            </span>
          )}
          <button
            className="fc-btn fc-btn-primary"
            style={{ height: 36 }}
            disabled={!canContinue}
            onClick={() => onConfirm(mapping, saveTpl ? tplName : null, hasHeader)}
          >
            Continue to review
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 3: Review staging ──────────────────────────────────
  function ReviewStep({ staging, categories, accounts, csvHeaders, mapping, meta, tagSuggestions, catIndex, onBack, onCommit, blurred }) {
    const [rows, setRows] = React.useState(staging);
    const [showIgnored, setShowIgnored] = React.useState(false);
    // Default account for every imported row that doesn't carry one already.
    // Prefer a row that already has an accountId (from CSV mapping); otherwise
    // first non-archived account.
    const [defaultAccountId, setDefaultAccountId] = React.useState(() => {
      const fromRow = (staging || []).find(r => r.accountId);
      if (fromRow) return fromRow.accountId;
      return (accounts && accounts[0] && accounts[0].id) || '';
    });

    function patchRow(id, patch) {
      setRows(rs => rs.map(r => r.id === id ? Object.assign({}, r, patch) : r));
    }
    function selectAll(v) { setRows(rs => rs.map(r => Object.assign({}, r, { _sel: v }))); }
    function excludeDupes() { setRows(rs => rs.map(r => r.duplicate ? Object.assign({}, r, { _sel: false }) : r)); }
    function categorizeSelected(catId) {
      setRows(rs => rs.map(r => r._sel ? Object.assign({}, r, { categoryId: catId, _suggestedCategory: false }) : r));
    }
    function tagSelected(tag) {
      const t = (tag || '').trim();
      if (!t) return;
      setRows(rs => rs.map(r => r._sel
        ? Object.assign({}, r, { tags: (r.tags || []).indexOf(t) >= 0 ? r.tags : (r.tags || []).concat([t]) })
        : r
      ));
    }

    const selectedCount = rows.filter(r => r._sel).length;
    const dupeCount = rows.filter(r => r.duplicate).length;
    const headers = csvHeaders || [];
    const map = mapping || [];
    // Locate the Transfer category so we can exclude internal account moves
    // from the inflow / outflow totals — they shouldn't be counted as income or expense.
    const transferCatId = React.useMemo(() => {
      const c = (categories || []).find(c => /transfer/i.test(c.name || '') || c.id === 'cat_transfer');
      return c ? c.id : null;
    }, [categories]);
    // Period spans start-of-month-of-first-row → last date seen (in rows or balance banner).
    const period = React.useMemo(() => {
      const ds = [];
      rows.forEach(r => { if (r.date) ds.push(r.date); });
      if (meta && meta.opening) ds.push(meta.opening.date);
      if (meta && meta.closing) ds.push(meta.closing.date);
      if (!ds.length) return null;
      ds.sort();
      const first = ds[0], last = ds[ds.length - 1];
      return { start: first.slice(0, 7) + '-01', end: last };
    }, [rows, meta]);
    // Live inflow / outflow / net across non-transfer rows.
    const totals = React.useMemo(() => {
      let inflow = 0, outflow = 0, count = 0;
      rows.forEach(r => {
        if (transferCatId && r.categoryId === transferCatId) return;
        const a = Number(r.amount) || 0;
        if (a > 0) inflow += a;
        else outflow += a;
        count++;
      });
      return { inflow, outflow: Math.abs(outflow), net: inflow + outflow, count };
    }, [rows, transferCatId]);
    const transferCount = transferCatId ? rows.filter(r => r.categoryId === transferCatId).length : 0;
    // Visible CSV column indices: drop ignored cols unless the user toggled them on.
    const visibleCols = headers
      .map((_, i) => ({ i, m: map[i] || 'ignore' }))
      .filter(x => showIgnored || x.m !== 'ignore')
      .map(x => x.i);
    const ignoredCount = headers.length - visibleCols.length;
    // Datalist for tag autocomplete: existing suggestions ∪ tags currently in staging.
    const allTags = React.useMemo(() => {
      const set = new Set(tagSuggestions || []);
      rows.forEach(r => (r.tags || []).forEach(t => set.add(t)));
      return Array.from(set).sort();
    }, [tagSuggestions, rows]);
    const tagsListId = 'fc-import-tags';

    const thStyle = {
      padding: '8px 10px', textAlign: 'left',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface-sunken)',
      position: 'sticky', top: 0, zIndex: 1,
      fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 700,
      letterSpacing: '0.5px', textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    };
    const tdStyle = {
      padding: '6px 10px', borderBottom: '1px solid var(--border)',
      verticalAlign: 'middle', fontSize: 12,
      whiteSpace: 'nowrap', maxWidth: 240,
      overflow: 'hidden', textOverflow: 'ellipsis',
    };
    const editColBg = 'var(--surface-sunken)';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>3. Review staging</h2>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {rows.length} parsed rows · {dupeCount} possible duplicate{dupeCount === 1 ? '' : 's'}.
            Each row keeps the bank's <strong>Description</strong> read-only on the left. Edit <strong>Custom description</strong>, <strong>Category</strong>, and <strong>Tags</strong> per row before commit (↺ restores the original; ✨ marks a category auto-suggested from a similar past transaction).
          </div>
        </div>

        {/* Default account for this import — applied to every committed row */}
        <div className="fc-card" style={{
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <label htmlFor="fc-import-account" style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
            color: 'var(--text-tertiary)', whiteSpace: 'nowrap',
          }}>Account</label>
          <select
            id="fc-import-account"
            value={defaultAccountId}
            onChange={e => setDefaultAccountId(e.target.value)}
            className="fc-input"
            style={{ height: 32, fontSize: 13, minWidth: 240 }}
            disabled={!accounts || accounts.length === 0}
          >
            {(!accounts || accounts.length === 0) && <option value="">No accounts — create one first</option>}
            {(accounts || []).map(a => (
              <option key={a.id} value={a.id}>
                {a.name}{a.currency ? ' · ' + a.currency : ''}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            Every committed row goes to this account. After import, change individual rows on the Transactions page if needed.
          </span>
        </div>

        {/* Opening / closing balance banner — surfaced from rows skipped as outliers */}
        {meta && (meta.opening || meta.closing) && (
          <div className="fc-card" style={{
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 16,
            background: 'var(--surface-sunken)', fontSize: 12,
          }}>
            <Icon name="info" size={14} color="var(--text-secondary)" />
            <span style={{ color: 'var(--text-secondary)' }}>
              Skipped {meta.skipped} balance row{meta.skipped === 1 ? '' : 's'} (not transactions):
            </span>
            {meta.opening && (
              <span>
                <span style={{ color: 'var(--text-tertiary)' }}>Opening</span>{' '}
                <strong style={{ fontFamily: 'var(--font-mono)' }}>
                  <MoneyDisplay amount={meta.opening.amount} currency="EUR" size="small" blurred={blurred} />
                </strong>{' '}
                <span style={{ color: 'var(--text-tertiary)' }}>on {meta.opening.date}</span>
              </span>
            )}
            {meta.closing && meta.closing !== meta.opening && (
              <span>
                <span style={{ color: 'var(--text-tertiary)' }}>· Closing</span>{' '}
                <strong style={{ fontFamily: 'var(--font-mono)' }}>
                  <MoneyDisplay amount={meta.closing.amount} currency="EUR" size="small" blurred={blurred} />
                </strong>{' '}
                <span style={{ color: 'var(--text-tertiary)' }}>on {meta.closing.date}</span>
              </span>
            )}
          </div>
        )}

        {/* Inflow / outflow / net for the period — transfer category excluded */}
        {rows.length > 0 && (
          <div className="fc-card" style={{
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
            fontSize: 12,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Period</span>
              <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {period ? (period.start + ' → ' + period.end) : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Inflow</span>
              <MoneyDisplay amount={totals.inflow} currency="EUR" size="body" colorize signed blurred={blurred} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Outflow</span>
              <MoneyDisplay amount={-totals.outflow} currency="EUR" size="body" colorize signed blurred={blurred} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Net</span>
              <MoneyDisplay amount={totals.net} currency="EUR" size="body" colorize signed blurred={blurred} />
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
              {totals.count} non-transfer row{totals.count === 1 ? '' : 's'}
              {transferCount > 0 ? ' · ' + transferCount + ' transfer' + (transferCount === 1 ? '' : 's') + ' excluded' : ''}
              {!transferCatId && ' · no Transfer category found'}
            </span>
          </div>
        )}

        {/* Bulk actions */}
        <div className="fc-card" style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button className="fc-btn fc-btn-ghost" style={{ height: 30, fontSize: 12 }} onClick={() => selectAll(true)}>
            Select all
          </button>
          <button className="fc-btn fc-btn-ghost" style={{ height: 30, fontSize: 12 }} onClick={() => selectAll(false)}>
            Clear
          </button>
          <select
            className="fc-input"
            style={{ height: 30, fontSize: 12 }}
            disabled={selectedCount === 0}
            value=""
            onChange={e => { if (e.target.value) categorizeSelected(e.target.value); }}
          >
            <option value="">Categorize selected ({selectedCount})…</option>
            {categories.map(c => (<option key={c.id} value={c.id}>{c.icon || '·'} {c.name}</option>))}
          </select>
          <input
            list={tagsListId}
            type="text"
            placeholder={selectedCount ? `Tag selected (${selectedCount}) — type then Enter` : 'Tag selected…'}
            disabled={selectedCount === 0}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                tagSelected(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
            className="fc-input"
            style={{ height: 30, fontSize: 12, minWidth: 220 }}
          />
          <button
            className="fc-btn fc-btn-ghost"
            style={{ height: 30, fontSize: 12 }}
            disabled={dupeCount === 0}
            onClick={excludeDupes}
          >
            Exclude duplicates ({dupeCount})
          </button>
          {ignoredCount > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
              <input
                type="checkbox"
                checked={showIgnored}
                onChange={e => setShowIgnored(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              Show {ignoredCount} ignored col{ignoredCount === 1 ? '' : 's'}
            </label>
          )}
        </div>

        {/* Shared datalist for tag autocomplete (used by the bulk input + every row's TagInput) */}
        <datalist id={tagsListId}>
          {allTags.map(t => <option key={t} value={t} />)}
        </datalist>

        {/* Spreadsheet view: raw CSV columns + editable Description / Category / Tags + parsed Amount */}
        <div className="fc-card" style={{ padding: 0, overflow: 'auto', maxHeight: '65vh' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={Object.assign({}, thStyle, { width: 32 })}></th>
                {visibleCols.map(i => (
                  <th key={'h' + i} style={thStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{headers[i] || ('Col ' + (i + 1))}</span>
                      <span style={{
                        fontSize: 9, color: map[i] && map[i] !== 'ignore' ? 'var(--accent)' : 'var(--text-tertiary)',
                        fontWeight: 600,
                      }}>{(map[i] || 'ignore') === 'ignore' ? '—' : map[i]}</span>
                    </div>
                  </th>
                ))}
                <th style={Object.assign({}, thStyle, { borderLeft: '2px solid var(--accent)', minWidth: 200 })}>
                  Description
                </th>
                <th style={Object.assign({}, thStyle, { background: editColBg, minWidth: 220 })}>
                  <span style={{ color: 'var(--accent)' }}>Custom description (edit)</span>
                </th>
                <th style={Object.assign({}, thStyle, { background: editColBg, minWidth: 180 })}>
                  <span style={{ color: 'var(--accent)' }}>Category (edit)</span>
                </th>
                <th style={Object.assign({}, thStyle, { background: editColBg, minWidth: 200 })}>
                  <span style={{ color: 'var(--accent)' }}>Tags (multi)</span>
                </th>
                <th style={Object.assign({}, thStyle, { textAlign: 'right', background: editColBg, minWidth: 110 })}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{
                  background: r.duplicate ? 'var(--warning-soft, rgba(245, 158, 11, 0.08))' : 'transparent',
                }}>
                  <td style={Object.assign({}, tdStyle, { textAlign: 'center' })}>
                    <input
                      type="checkbox"
                      checked={!!r._sel}
                      onChange={e => patchRow(r.id, { _sel: e.target.checked })}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    {r.duplicate && (
                      <div title="Duplicate of an existing transaction" style={{
                        fontSize: 9, fontWeight: 700, color: 'var(--warning)',
                        padding: '1px 4px', borderRadius: 3, background: 'rgba(245,158,11,0.15)',
                        marginTop: 2, display: 'inline-block',
                      }}>DUP</div>
                    )}
                  </td>
                  {visibleCols.map(ci => (
                    <td key={'c' + ci} title={(r._raw && r._raw[ci]) || ''} style={Object.assign({}, tdStyle, {
                      fontFamily: 'var(--font-mono)',
                      color: map[ci] === 'ignore' ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    })}>
                      {(r._raw && r._raw[ci]) || ''}
                    </td>
                  ))}
                  <td title={r.descriptionOriginal || ''} style={Object.assign({}, tdStyle, {
                    borderLeft: '2px solid var(--accent)',
                    fontFamily: 'var(--font-mono)',
                    color: r.descriptionOriginal ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    maxWidth: 280,
                  })}>
                    {r.descriptionOriginal || '—'}
                  </td>
                  <td style={Object.assign({}, tdStyle, { background: editColBg, maxWidth: 320 })}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="text"
                        value={r.description || ''}
                        onChange={e => patchRow(r.id, { description: e.target.value })}
                        placeholder={r.descriptionOriginal ? '(empty — will save blank)' : '(no description)'}
                        className="fc-input"
                        style={{ height: 26, fontSize: 12, fontFamily: 'var(--font-mono)', width: '100%', minWidth: 180 }}
                      />
                      {r.descriptionOriginal && r.description !== r.descriptionOriginal && (
                        <button
                          type="button"
                          title="Restore the bank's original description"
                          onClick={() => patchRow(r.id, { description: r.descriptionOriginal })}
                          style={{
                            background: 'transparent', border: '1px solid var(--border)', borderRadius: 4,
                            cursor: 'pointer', color: 'var(--text-secondary)', padding: '0 6px',
                            height: 26, fontSize: 12, lineHeight: 1, flexShrink: 0,
                          }}
                        >↺</button>
                      )}
                    </div>
                  </td>
                  <td style={Object.assign({}, tdStyle, { background: editColBg })}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <select
                        value={r.categoryId || ''}
                        onChange={e => patchRow(r.id, { categoryId: e.target.value || null, _suggestedCategory: false })}
                        className="fc-input"
                        style={{
                          height: 26, fontSize: 12, width: '100%', minWidth: 140,
                          borderColor: r._suggestedCategory ? 'var(--accent)' : undefined,
                        }}
                      >
                        <option value="">Uncategorized</option>
                        {categories.map(c => (<option key={c.id} value={c.id}>{c.icon || '·'} {c.name}</option>))}
                      </select>
                      {r._suggestedCategory && (
                        <span title="Auto-suggested from a similar past transaction — change to confirm" style={{
                          fontSize: 11, color: 'var(--accent)', flexShrink: 0,
                        }}>✨</span>
                      )}
                    </div>
                  </td>
                  <td style={Object.assign({}, tdStyle, { background: editColBg, maxWidth: 320 })}>
                    <TagInput
                      value={r.tags || []}
                      onChange={tags => {
                        // If the row has no category yet (or only an auto-suggestion), check
                        // whether any newly-added tag has a known dominant category.
                        const patch = { tags };
                        if (catIndex && (!r.categoryId || r._suggestedCategory)) {
                          const prev = r.tags || [];
                          const added = tags.filter(t => prev.indexOf(t) < 0);
                          for (let k = 0; k < added.length; k++) {
                            const sug = catIndex.byTag[added[k]];
                            if (sug) { patch.categoryId = sug; patch._suggestedCategory = true; break; }
                          }
                        }
                        patchRow(r.id, patch);
                      }}
                      listId={tagsListId}
                      placeholder="add tag…"
                    />
                  </td>
                  <td style={Object.assign({}, tdStyle, { background: editColBg, textAlign: 'right' })}>
                    <MoneyDisplay amount={r.amount || 0} currency={r.currency || 'EUR'} size="body" colorize signed blurred={blurred} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={visibleCols.length + 6} style={{ padding: 28, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                    No rows parsed from this file.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="fc-btn fc-btn-ghost" style={{ height: 36 }} onClick={onBack}>Back</button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {selectedCount} of {rows.length} selected
          </span>
          <button
            className="fc-btn fc-btn-primary"
            style={{ height: 36 }}
            disabled={selectedCount === 0}
            onClick={() => onCommit(
              rows
                .filter(r => r._sel)
                .map(r => Object.assign({}, r, { accountId: r.accountId || defaultAccountId || null }))
            )}
          >
            <Icon name="check" size={14} /> Commit {selectedCount} transaction{selectedCount === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Container component ─────────────────────────────────────
  window.FC.ImportScreen = function ImportScreen({ data, blurred }) {
    const [step, setStep] = React.useState(1);
    const [fileName, setFileName] = React.useState('');
    const [csvRows, setCsvRows] = React.useState([]);
    const [mapping, setMapping] = React.useState(null);
    const [hasHeader, setHasHeader] = React.useState(true);
    const [staging, setStaging] = React.useState([]);
    const [stagingMeta, setStagingMeta] = React.useState(null);
    const [savedTplName, setSavedTplName] = React.useState(null);
    const [committedMsg, setCommittedMsg] = React.useState(null);

    const FCStore = window.FCStore;
    const templates = FCStore ? FCStore.list('importTemplates') : [];
    const categories = (data && data.categories) || (FCStore ? FCStore.list('categories') : []);
    const accounts = (data && data.accounts) || [];
    const existingTx = (data && data.transactions) || [];

    // Category recommendation index built from already-categorized transactions.
    // Drives auto-prefill in buildStaging (description match) and in the per-row
    // TagInput (when a freshly added tag has a known dominant category).
    const catIndex = React.useMemo(() => buildCategoryIndex(existingTx), [existingTx]);

    // Tag suggestions: union of tags on existing transactions + the tags table.
    const tagSuggestions = React.useMemo(() => {
      const set = new Set();
      existingTx.forEach(t => (t.tags || []).forEach(tag => tag && set.add(tag)));
      if (FCStore) {
        try {
          FCStore.list('tags').forEach(t => {
            const name = typeof t === 'string' ? t : t.name;
            if (name) set.add(name);
          });
        } catch (e) { /* ignore */ }
      }
      return Array.from(set).sort();
    }, [existingTx]);

    // Build mapped staging rows
    function buildStaging(rows, mapping, hasHeader) {
      const out = [];
      const meta = { opening: null, closing: null, skipped: 0 };
      const dateIdx = mapping.indexOf('date');
      const amountIdx = mapping.indexOf('amount');
      // Allow multiple description columns (e.g. split debit/credit labels) — concat with space.
      const descIdxs = mapping.map((m, i) => m === 'description' ? i : -1).filter(i => i >= 0);
      const catIdx = mapping.indexOf('category');
      const acctIdx = mapping.indexOf('account');
      // Existing transactions key for dup detection
      const existKeys = new Set(existingTx.map(t => {
        const a = t.amountOriginal != null ? t.amountOriginal : t.amount;
        return [t.date, a, normalizeDesc(t.description || t.merchant || '')].join('|');
      }));

      const skipInfo = detectSkipRows(rows, hasHeader);
      const start = hasHeader ? 1 : 0;
      for (let i = start; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r.length) continue;
        if (skipInfo.skip.has(i)) {
          // Capture as opening / closing balance for the banner.
          const d = parseDate(r[dateIdx]);
          const a = parseAmount(r[amountIdx]);
          if (d && !isNaN(a)) {
            const entry = { date: d, amount: a, raw: r.slice() };
            if (!meta.opening) meta.opening = entry;
            meta.closing = entry;
            meta.skipped++;
          }
          continue;
        }
        const date = parseDate(r[dateIdx]);
        const amount = parseAmount(r[amountIdx]);
        const description = descIdxs.map(idx => (r[idx] || '').trim()).filter(Boolean).join(' ');
        const catName = catIdx >= 0 ? (r[catIdx] || '').trim() : '';
        const acctName = acctIdx >= 0 ? (r[acctIdx] || '').trim() : '';
        if (!date || isNaN(amount)) continue;
        const catId = catName
          ? (categories.find(c => c.name.toLowerCase() === catName.toLowerCase()) || {}).id || null
          : null;
        const acctId = acctName
          ? (accounts.find(a => (a.name || '').toLowerCase() === acctName.toLowerCase()) || {}).id || null
          : null;
        // If the CSV didn't supply a usable category, look up a recommendation
        // based on the description stem of similar past transactions.
        let finalCatId = catId;
        let suggested = false;
        if (!finalCatId) {
          const k = descKey(description);
          if (k && catIndex.byDesc[k]) {
            finalCatId = catIndex.byDesc[k];
            suggested = true;
          }
        }
        const key = [date, amount, normalizeDesc(description)].join('|');
        const duplicate = existKeys.has(key);
        out.push({
          id: 's_' + i + '_' + Math.random().toString(36).slice(2, 6),
          date, amount,
          description,                  // editable, persisted on commit; starts as the original
          descriptionOriginal: description, // read-only reference to what came from the CSV
          currency: 'EUR',
          categoryId: finalCatId,
          _suggestedCategory: suggested,
          accountId: acctId,
          tags: [],
          duplicate,
          _sel: !duplicate,
          _raw: r.slice(),
        });
      }
      return { staging: out, meta };
    }

    function handleFile(name, text) {
      const parsed = parseCsv(text);
      setFileName(name);
      setCsvRows(parsed);
      setStep(2);
    }
    function handlePickTemplate(t) {
      // Templates store mapping; user still needs a CSV.
      setMapping(t.mapping || null);
      // Also drop into the file picker — re-using step 1 dropzone is fine,
      // but if a template is selected we keep the mapping and require a file.
      const ev = document.createElement('input');
      ev.type = 'file'; ev.accept = '.csv,text/csv';
      ev.onchange = function () {
        if (ev.files && ev.files[0]) {
          const reader = new FileReader();
          reader.onload = e => handleFile(ev.files[0].name, e.target.result);
          reader.readAsText(ev.files[0]);
        }
      };
      ev.click();
    }
    function handleMapConfirm(map, tplName, hh) {
      setMapping(map);
      setHasHeader(hh);
      const { staging: built, meta } = buildStaging(csvRows, map, hh);
      setStaging(built);
      setStagingMeta(meta);
      // Persist to importStaging so the review survives a refresh.
      if (FCStore) { try { FCStore.set('importStaging', built); } catch (e) {} }
      if (tplName && FCStore) {
        FCStore.create('importTemplates', { name: tplName, mapping: map, headers: csvRows[0] || [] });
        setSavedTplName(tplName);
      }
      setStep(3);
    }
    function handleCommit(selectedRows) {
      if (!FCStore) return;
      const nowIso = new Date().toISOString();
      // Newly-introduced tags get added to the tags table so future suggestions include them.
      const knownTags = new Set();
      try { FCStore.list('tags').forEach(t => knownTags.add(typeof t === 'string' ? t : t.name)); } catch (e) {}
      selectedRows.forEach(r => {
        const tags = (r.tags || []).map(t => t.trim()).filter(Boolean);
        // Resolve the account properly: ReviewStep already merged the per-import default
        // into r.accountId, so we just look the row up.
        const acctId = r.accountId || (accounts[0] && accounts[0].id) || null;
        const acct = accounts.find(a => a.id === acctId);
        const acctCurrency = acct && acct.currency ? acct.currency : (r.currency || 'EUR');
        const tx = {
          date: r.date,
          amount: r.amount,
          amountOriginal: r.amount,
          currencyOriginal: r.currency || acctCurrency,
          amountBase: r.amount,
          fxRateSnapshot: 1,
          description: r.description,
          merchant: r.description,
          categoryId: r.categoryId || null,
          category: r.categoryId ? (categories.find(c => c.id === r.categoryId) || {}).name : 'Uncategorized',
          accountId: acctId,
          // Legacy display field used by Transactions screen filters (matched by name).
          account: acct ? acct.name : '',
          currency: r.currency || acctCurrency,
          tags,
          source: 'import',
          createdAt: nowIso,
        };
        FCStore.create('transactions', tx);
        tags.forEach(t => {
          if (!knownTags.has(t)) {
            try { FCStore.create('tags', { name: t }); knownTags.add(t); } catch (e) {}
          }
        });
      });
      // Clear any leftover importStaging
      try { FCStore.set('importStaging', []); } catch (e) {}
      // Notify other screens to refresh.
      window.dispatchEvent(new CustomEvent('fc:tx-saved'));
      setCommittedMsg(`Committed ${selectedRows.length} transaction${selectedRows.length === 1 ? '' : 's'}.`);
      // Reset flow
      setStep(1); setCsvRows([]); setMapping(null); setStaging([]); setStagingMeta(null); setFileName('');
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>Import</h1>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              CSV → staging → commit. Nothing is written until you confirm.
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <Stepper step={step} />
        </div>

        {committedMsg && (
          <div className="fc-card" style={{
            padding: 14, background: 'var(--positive-soft)', borderColor: 'var(--positive)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon name="check" size={16} color="var(--positive)" />
            <span style={{ fontSize: 13, color: 'var(--positive)', fontWeight: 600 }}>{committedMsg}</span>
            {savedTplName && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Template "{savedTplName}" saved.
              </span>
            )}
            <div style={{ flex: 1 }} />
            <button className="fc-btn fc-btn-ghost" style={{ height: 28, fontSize: 12 }} onClick={() => setCommittedMsg(null)}>
              Dismiss
            </button>
          </div>
        )}

        {step === 1 && (
          <SourceStep
            templates={templates}
            onPick={handlePickTemplate}
            onFile={handleFile}
          />
        )}
        {step === 2 && (
          <MapStep
            rows={csvRows}
            fileName={fileName}
            initialMapping={mapping}
            onBack={() => setStep(1)}
            onConfirm={handleMapConfirm}
          />
        )}
        {step === 3 && (() => {
          const maxCols = csvRows.reduce((m, r) => Math.max(m, (r || []).length), 0);
          const headerRow = csvRows[0] || [];
          const csvHeaders = Array.from({ length: maxCols }, (_, i) =>
            hasHeader ? (headerRow[i] || ('Col ' + (i + 1))) : ('Col ' + (i + 1))
          );
          return (
            <ReviewStep
              staging={staging}
              categories={categories}
              accounts={accounts}
              csvHeaders={csvHeaders}
              mapping={mapping || []}
              meta={stagingMeta}
              tagSuggestions={tagSuggestions}
              catIndex={catIndex}
              blurred={blurred}
              onBack={() => setStep(2)}
              onCommit={handleCommit}
            />
          );
        })()}
      </div>
    );
  };

  function Stepper({ step }) {
    const steps = ['Source', 'Map', 'Review'];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {steps.map((label, i) => {
          const n = i + 1;
          const active = n === step, done = n < step;
          return (
            <React.Fragment key={n}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 10px', borderRadius: 999,
                background: active ? 'var(--accent-tint)' : 'transparent',
                color: active ? 'var(--accent)' : (done ? 'var(--text-secondary)' : 'var(--text-tertiary)'),
                fontSize: 12, fontWeight: 600,
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 9,
                  background: active ? 'var(--accent)' : (done ? 'var(--positive)' : 'var(--surface-sunken)'),
                  color: active || done ? '#fff' : 'var(--text-tertiary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                }}>{done ? '✓' : n}</span>
                <span>{label}</span>
              </div>
              {n < steps.length && <span style={{ width: 12, height: 1, background: 'var(--border)' }} />}
            </React.Fragment>
          );
        })}
      </div>
    );
  }
})();
