// Auth & session management — localStorage-based, local-first.
// Per master-spec §5: schema is multi-user-ready, but v1 has a single implicit profile.
// We add a simple email+password gate to demonstrate login/logout, plus optional PIN.

(function () {
  var KEY_PROFILES = 'fc.profiles.v1';
  var KEY_SESSION  = 'fc.session.v1';
  var KEY_PIN_LOCK = 'fc.pinLocked.v1';

  function load(k, def) {
    try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; }
  }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

  function hash(s) {
    // Lightweight non-cryptographic hash. This is local-only auth — not server security.
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return String(h);
  }

  function nowIso() { return new Date().toISOString(); }

  var FCAuth = {
    listProfiles: function () { return load(KEY_PROFILES, []); },

    hasAnyProfile: function () { return this.listProfiles().length > 0; },

    currentProfile: function () {
      var s = load(KEY_SESSION, null);
      if (!s) return null;
      var p = this.listProfiles().find(function (x) { return x.id === s.profileId; });
      return p || null;
    },

    isLoggedIn: function () { return !!this.currentProfile(); },

    isPinLocked: function () {
      var p = this.currentProfile();
      if (!p || !p.pin) return false;
      return load(KEY_PIN_LOCK, false) === true;
    },

    setPinLocked: function (locked) { save(KEY_PIN_LOCK, !!locked); },

    signup: function (data) {
      // data: { name, email, password, baseCurrency, activeCurrencies }
      var profiles = this.listProfiles();
      if (profiles.some(function (p) { return p.email.toLowerCase() === data.email.toLowerCase(); })) {
        throw new Error('An account with this email already exists.');
      }
      var initials = (data.name || data.email).split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
      var profile = {
        id: 'p_' + Date.now(),
        name: data.name,
        email: data.email,
        passwordHash: hash(data.password),
        initials: initials,
        baseCurrency: data.baseCurrency || 'EUR',
        activeCurrencies: data.activeCurrencies || ['EUR', 'USD', 'GBP'],
        createdAt: nowIso(),
        pin: null,
        theme: 'dark',
        accent: 'teal',
        density: 'comfortable',
        privacyDefault: false,
        idleLockMinutes: 0,
        startBlurred: false,
        householdId: 'h_' + Date.now(),
      };
      profiles.push(profile);
      save(KEY_PROFILES, profiles);
      this.login(data.email, data.password);
      return profile;
    },

    login: function (email, password) {
      var profiles = this.listProfiles();
      var match = profiles.find(function (p) {
        return p.email.toLowerCase() === email.toLowerCase() && p.passwordHash === hash(password);
      });
      if (!match) throw new Error('Wrong email or password.');
      save(KEY_SESSION, { profileId: match.id, loggedInAt: nowIso() });
      // PIN lock is only relevant if a PIN is set; reset on fresh login.
      save(KEY_PIN_LOCK, !!match.pin);
      return match;
    },

    logout: function () {
      localStorage.removeItem(KEY_SESSION);
      localStorage.removeItem(KEY_PIN_LOCK);
    },

    updateProfile: function (patch) {
      var s = load(KEY_SESSION, null);
      if (!s) return null;
      var profiles = this.listProfiles();
      var i = profiles.findIndex(function (p) { return p.id === s.profileId; });
      if (i < 0) return null;
      profiles[i] = Object.assign({}, profiles[i], patch);
      save(KEY_PROFILES, profiles);
      return profiles[i];
    },

    setPin: function (pin) {
      var p = this.currentProfile();
      if (!p) return;
      this.updateProfile({ pin: pin ? hash(pin) : null });
    },

    verifyPin: function (pin) {
      var p = this.currentProfile();
      if (!p || !p.pin) return true;
      return hash(pin) === p.pin;
    },

    firstRoute: function () {
      if (!this.hasAnyProfile()) return 'signup.html';
      if (!this.isLoggedIn()) return 'login.html';
      var p = this.currentProfile();
      if (!p.onboarded) return 'desktop/onboarding.html';
      return 'desktop/home.html';
    },

    /**
     * Guard: call at the top of every protected page.
     * Redirects to login if not authenticated, or to PIN unlock if locked.
     */
    requireSession: function (opts) {
      opts = opts || {};
      var here = location.pathname.split('/').pop();
      if (!this.isLoggedIn()) {
        var prefix = location.pathname.indexOf('/desktop/') >= 0 ? '../' : '';
        location.replace(prefix + 'login.html');
        return false;
      }
      if (this.isPinLocked() && here !== 'pin.html') {
        var prefix2 = location.pathname.indexOf('/desktop/') >= 0 ? '../' : '';
        location.replace(prefix2 + 'pin.html');
        return false;
      }
      return true;
    },
  };

  window.FCAuth = FCAuth;
})();
