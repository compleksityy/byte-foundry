(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const app = $("#app");
  const SAVE_KEY = "bytefoundry.save.v3";
  const OLD_KEY = "bytefoundry.v1";
  const DEPTS = window.DEPTS || [];

  // ---------------------------------------------------------------------------
  // Upgrades (preserved). Each has a clear human-speaking explanation.
  // ---------------------------------------------------------------------------
  const UPGRADES = [
    { id: "compiler", name: "Compiler flags", description: "Question rewards and XP are doubled.", cost: 400, type: "reward", multiplier: 2 },
    { id: "cooling", name: "Liquid cooling", description: "All node output is doubled.", cost: 1500, type: "production", multiplier: 2 },
    { id: "nightshift", name: "Second shift", description: "Question rewards and XP are tripled.", cost: 12000, type: "reward", multiplier: 3 },
    { id: "uplink", name: "Fibre uplink", description: "All node output is tripled.", cost: 60000, type: "production", multiplier: 3 },
    { id: "quantum", name: "Quantum core", description: "Everything - rewards, XP and output - is doubled.", cost: 500000, type: "all", multiplier: 2 }
  ];

  // ---------------------------------------------------------------------------
  // Plots (land game). Each plot type costs cycles, earns cycles per second,
  // and periodically breaks down so it needs a paid repair before it keeps
  // earning. uptime is a [min, max] seconds window between repairs.
  // ---------------------------------------------------------------------------
  const PLOT_TYPES = [
    { id: "plot1", name: "Scrap lot", price: 500, rate: 2, repair: 120, uptime: [60, 180] },
    { id: "plot2", name: "Workshop", price: 2500, rate: 9, repair: 550, uptime: [90, 240] },
    { id: "plot3", name: "Fab floor", price: 12000, rate: 40, repair: 2500, uptime: [120, 300] },
    { id: "plot4", name: "Cleanroom", price: 60000, rate: 180, repair: 11000, uptime: [150, 360] }
  ];

  // ---------------------------------------------------------------------------
  // Themes. Each maps to a CSS class on <html> that overrides the --* color
  // variables, so switching feels instant and any new page picks it up.
  // ---------------------------------------------------------------------------
  const THEMES = [
    { id: "default", name: "Acid" },
    { id: "ember", name: "Ember" },
    { id: "ocean", name: "Ocean" },
    { id: "mono", name: "Mono" },
    { id: "light", name: "Light" }
  ];
  const themeIds = THEMES.map((t) => t.id);
  const applyTheme = () => {
    document.documentElement.classList.remove(...themeIds.map((id) => "theme-" + id));
    if (themeIds.includes(state.theme)) document.documentElement.classList.add("theme-" + state.theme);
  };
  const plotType = (id) => PLOT_TYPES.find((t) => t.id === id) || PLOT_TYPES[0];
  const plotCost = (type) => {
    const owned = state.plots ? state.plots.filter((p) => p.type === type.id).length : 0;
    return Math.ceil(type.price * Math.pow(1.18, owned));
  };
  const plotProduction = () => (state.plots || []).filter((p) => !p.broken).reduce((t, p) => t + p.rate, 0);
  const nextBreakIn = (type) => type.uptime[0] + Math.floor(Math.random() * (type.uptime[1] - type.uptime[0] + 1));
  const newPlot = (type) => ({
    id: type.id + "-" + (state.plots ? state.plots.length : 0) + "-" + Math.floor(Math.random() * 1e6),
    type: type.id, rate: type.rate, repair: type.repair,
    broken: false, nextBreak: Date.now() + nextBreakIn(type) * 1000
  });
  const fixPlot = (p) => {
    if (!p || !p.type) return null;
    const t = plotType(p.type);
    return {
      id: p.id || (p.type + "-" + Math.random()),
      type: t.id, rate: Number(p.rate) || t.rate, repair: Number(p.repair) || t.repair,
      broken: !!p.broken, nextBreak: Number(p.nextBreak) || (Date.now() + nextBreakIn(t) * 1000)
    };
  };

  // ---------------------------------------------------------------------------
  // Difficulty levels. d maps to a difficulty tag range (1-4).
  // ---------------------------------------------------------------------------
  const DIFFICULTIES = [
    { id: 1, code: "BEG", name: "Beginner", blurb: "New to this? Start here. Small numbers, worked examples, generous hints." },
    { id: 2, code: "INT", name: "Intermediate", blurb: "You know the basics. More steps, fewer hints, GCSE-level ideas." },
    { id: 3, code: "ADV", name: "Advanced", blurb: "Confident already. Complex calculations and multi-step Python." },
    { id: 4, code: "EXP", name: "Expert", blurb: "A serious challenge. Two's complement, debugging and tricky logic." }
  ];
  const diff = () => DIFFICULTIES.find((d) => d.id === state.difficulty) || DIFFICULTIES[0];

  // ---------------------------------------------------------------------------
  // Achievements: thresholds on real stats, each with a title and description.
  // ---------------------------------------------------------------------------
  const ACHIEVEMENTS = [
    { id: "first", title: "First compile", desc: "Answer your first question correctly.", check: (s) => s.lifetimeCorrect >= 1 },
    { id: "streak5", title: "On a roll", desc: "Reach a 5-question streak.", check: (s) => s.bestStreak >= 5 },
    { id: "streak20", title: "Unstoppable", desc: "Reach a 20-question streak.", check: (s) => s.bestStreak >= 20 },
    { id: "q25", title: "Apprentice", desc: "Clear 25 questions correctly.", check: (s) => s.lifetimeCorrect >= 25 },
    { id: "q100", title: "Ops veteran", desc: "Clear 100 questions correctly.", check: (s) => s.lifetimeCorrect >= 100 },
    { id: "q250", title: "Senior engineer", desc: "Clear 250 questions correctly.", check: (s) => s.lifetimeCorrect >= 250 },
    { id: "dept1", title: "First foundry", desc: "Master one department.", check: (s) => s.masteries.length >= 1 },
    { id: "dept2", title: "Two for two", desc: "Master two departments.", check: (s) => s.masteries.length >= 2 },
    { id: "dept5", title: "Full hardware", desc: "Master all five departments.", check: (s) => s.masteries.length >= 5 },
    { id: "buy10", title: "Autonomous", desc: "Install 10 nodes in total.", check: (s) => DEPTS.reduce((t, d) => t + (s.departments[d.id] ? s.departments[d.id].nodes : 0), 0) >= 10 },
    { id: "level5", title: "Level 5", desc: "Reach level 5.", check: (s) => Math.floor(s.xp / 100) >= 5 },
    { id: "level10", title: "Level 10", desc: "Reach level 10.", check: (s) => Math.floor(s.xp / 100) >= 10 },
    { id: "million", title: "Cycle king", desc: "Hold 1,000,000 cycles at once.", check: (s) => s.cycles >= 1000000 },
    { id: "alllessons", title: "Well read", desc: "Read every department briefing.", check: (s) => DEPTS.every((d) => s.departments[d.id] && s.departments[d.id].lessonRead) }
  ];
  const checkAchievements = () => {
    let earned = 0;
    ACHIEVEMENTS.forEach((a) => {
      if (!state.achievements.includes(a.id) && a.check(state)) { state.achievements.push(a.id); earned += 1; }
    });
    return earned;
  };

  // ---------------------------------------------------------------------------
  // Fresh save. Masters carry per-department question progress and nodes.
  // ---------------------------------------------------------------------------
  const freshDept = () => ({ unlocked: false, completed: [], nodes: 0, lessonRead: false, current: null, masteryAttempts: 0 });
  const freshSave = () => {
    const departments = {};
    DEPTS.forEach((d, i) => { departments[d.id] = freshDept(); departments[d.id].unlocked = i === 0 || d.id === "bin" || d.id === "hex"; });
    return {
      cycles: 0, lifetime: 0, streak: 0, bestStreak: 0,
      daily: 0, lastActive: null, xp: 0, lifetimeCorrect: 0, lifetimeWrong: 0,
      upgrades: [], achievements: [], masteries: [], plots: [],
      difficulty: 1, reducedMotion: false, theme: "default",
      selected: "bin", page: "home",
      lastSaved: Date.now(), departments,
      deviceId: Math.random().toString(36).slice(2, 8).toUpperCase()
    };
  };

  function loadSave() {
    let data = null;
    try {
      data = JSON.parse(localStorage.getItem(SAVE_KEY) || localStorage.getItem(OLD_KEY) || "null");
    } catch (_) { data = null; }
    const base = freshSave();
    const state = Object.assign(base, data || {});
    if (data && !data.lastSaved && data.t) state.lastSaved = data.t;
    // Preserve v1/v2 department mapping where present.
    if (data && data.departments) {
      // already handled by spread above
    } else if (data && (data.d || data.cyc !== undefined)) {
      const legacy = data.d || data.departments || {};
      state.departments = base.departments;
      if (data.cyc !== undefined) state.cycles = data.cyc;
      if (data.total !== undefined) state.lifetime = data.total;
      if (Array.isArray(data.up)) state.upgrades = state.upgrades.concat(data.up);
      if (data.sel) state.selected = Object.keys(state.departments).includes(data.sel) ? data.sel : "bin";
      Object.keys(legacy).forEach((id) => {
        if (state.departments[id]) {
          const o = legacy[id];
          state.departments[id] = {
            unlocked: o.unlocked !== undefined ? !!o.unlocked : (o.on !== undefined ? !!o.on : false),
            completed: Array.isArray(o.completed) ? o.completed : Array.isArray(o.done) ? o.done : [],
            nodes: Math.max(0, Number(o.nodes) || 0),
            lessonRead: !!(o.lessonRead || o.read),
            current: Number.isInteger(o.current) ? o.current : null,
            masteryAttempts: 0
          };
        }
      });
    }
    // Ensure the first department is unlocked even on an old empty save.
    DEPTS.forEach((d, i) => {
      if (!state.departments[d.id]) state.departments[d.id] = freshDept();
      // bin and hex are always available regardless of cycles or progression.
      if (i === 0 || d.id === "bin" || d.id === "hex") state.departments[d.id].unlocked = true;
    });
    state.upgrades = Array.isArray(state.upgrades) ? state.upgrades : [];
    state.achievements = Array.isArray(state.achievements) ? state.achievements : [];
    state.masteries = Array.isArray(state.masteries) ? state.masteries : [];
    state.cycles = Math.max(0, Number(state.cycles) || 0);
    state.lifetime = Math.max(0, Number(state.lifetime) || 0);
    state.lifetimeCorrect = Math.max(0, Number(state.lifetimeCorrect) || 0);
    state.lifetimeWrong = Math.max(0, Number(state.lifetimeWrong) || 0);
    state.xp = Math.max(0, Number(state.xp) || 0);
    state.streak = Math.max(0, Number(state.streak) || 0);
    state.bestStreak = Math.max(state.streak, Number(state.bestStreak) || 0);
    state.difficulty = [1, 2, 3, 4].includes(Number(state.difficulty)) ? Number(state.difficulty) : 1;
    if (!DEPTS.some((d) => d.id === state.selected)) state.selected = "bin";
    if (!["home", "learn", "learn-read", "practice", "departments", "upgrades", "progress"].includes(state.page)) state.page = "home";
    // Re-derive masteries from a v2 save that had all 100 done but no masteries yet.
    if (state.masteries.length === 0) {
      DEPTS.forEach((d) => {
        const p = state.departments[d.id];
        if (p && p.completed.length >= d.bank.length) state.masteries.push(d.id);
      });
    }
    // Land plot state (added in a later save version).
    if (!Array.isArray(state.plots)) state.plots = [];
    state.plots = state.plots.map(fixPlot).filter(Boolean);
    // Theme preference (added in a later save version).
    if (!themeIds.includes(state.theme)) state.theme = "default";
    // A stable per-install id so an imported save from another device can be
    // flagged instead of silently replacing this one.
    if (typeof state.deviceId !== "string" || state.deviceId.length < 4) state.deviceId = Math.random().toString(36).slice(2, 8).toUpperCase();
    return state;
  }

  const state = loadSave();

  // When the user wipes their save, suppress further writes (including the
  // beforeunload/interval saves) so the cleared state is not written back.
  let suppressSave = false;

  // ---------------------------------------------------------------------------
  // Runtime UI state.
  // ---------------------------------------------------------------------------
  let activeTab = "practice";           // inside the practice page: practice / lesson / nodes
  let feedback = "";
  let feedbackType = "";
  let hintVisible = false;
  let lastFrame = Date.now();
  let quizSeed = 0;                     // re-pick a mastery question

  // ---------------------------------------------------------------------------
  // Helpers.
  // ---------------------------------------------------------------------------
  const number = (n) => {
    if (!Number.isFinite(n)) return "0";
    if (n < 1000) return n < 10 ? n.toFixed(1) : Math.floor(n).toLocaleString("en-GB");
    const units = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
    for (const [value, suffix] of units) if (n >= value) return (n / value).toFixed(2) + suffix;
    return String(Math.floor(n));
  };
  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const bin = (n, w) => n.toString(2).padStart(w || 8, "0");
  const normalise = (value) => String(value).trim().replace(/\s+/g, " ").toLowerCase().replace(/^0+(?=\d)/, "");
  const deptState = (dept) => state.departments[dept.id];
  const selectedDept = () => DEPTS.find((dept) => dept.id === state.selected) || DEPTS[0];
  const multiplier = (type) => UPGRADES.filter((upgrade) => state.upgrades.includes(upgrade.id) && (upgrade.type === type || upgrade.type === "all")).reduce((total, upgrade) => total * upgrade.multiplier, 1);
  const mastery = (dept) => 1 + deptState(dept).completed.length * 0.03;
  const production = () => DEPTS.reduce((total, dept) => total + deptState(dept).nodes * dept.rate * mastery(dept), 0) * multiplier("production");
  const reward = (dept) => Math.round(dept.reward * Math.min(1 + state.streak * 0.1, 3) * multiplier("reward") * (0.85 + state.difficulty * 0.15));
  const nodeCost = (dept) => Math.ceil(dept.node * Math.pow(1.15, deptState(dept).nodes));
  const previousUnlocked = (index) => index === 0 || deptState(DEPTS[index - 1]).completed.length >= 15;
  const level = () => Math.floor(state.xp / 100) + 1;
  const levelProgress = () => (state.xp % 100) / 100;
  const totalAnswered = () => state.lifetimeCorrect + state.lifetimeWrong;
  const accuracy = () => (totalAnswered() ? Math.round((state.lifetimeCorrect / totalAnswered()) * 100) : 0);
  const totalNodes = () => DEPTS.reduce((t, d) => t + deptState(d).nodes, 0);
  const totalCorrect = () => DEPTS.reduce((sum, dept) => sum + deptState(dept).completed.length, 0);
  const totalQuestions = () => DEPTS.reduce((sum, dept) => sum + dept.bank.length, 0);
  const totalPassive = () => production() + plotProduction();

  const addCycles = (amount) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    state.cycles += amount;
    state.lifetime += amount;
  };
  const addXP = (amount) => { if (Number.isFinite(amount) && amount > 0) state.xp += amount; };

  // ---------------------------------------------------------------------------
  // Save code (export / import). Confirms "will my progress survive this PC?"
  // A compact binary blob (~100-250 chars) plus a small header. The per-install
  // deviceId is included so an imported save from another device is clearly
  // flagged rather than silently replacing the local one. Any code is copyable
  // by design (a backup must be portable), so this warns instead of pretending
  // to be a lock — students are told sharing codes just clones someone's save.
  // ---------------------------------------------------------------------------
  const idOf = (list, id) => list.findIndex((x) => x === id);
  const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytesToB64 = (bytes) => {
    let out = "", i = 0;
    for (; i + 2 < bytes.length; i += 3) {
      const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
    }
    if (i + 1 === bytes.length) { const n = bytes[i]; out += B64[(n >> 2) & 63] + B64[(n & 3) << 4] + "=="; }
    else if (i + 2 === bytes.length) { const n = (bytes[i] << 8) | bytes[i + 1]; out += B64[(n >> 10) & 63] + B64[(n >> 4) & 63] + B64[(n & 15) << 2] + "="; }
    return out;
  };
  const b64ToBytes = (b64) => {
    const map = {}; for (let i = 0; i < B64.length; i++) map[B64[i]] = i;
    const clean = b64.replace(/=+$/, ""); const bytes = [];
    for (let i = 0; i < clean.length; i += 4) {
      const a = map[clean[i]], b = map[clean[i + 1]], c = clean[i + 2] !== undefined ? map[clean[i + 2]] : null, d = clean[i + 3] !== undefined ? map[clean[i + 3]] : null;
      bytes.push((a << 2) | (b >> 4));
      if (c !== null) bytes.push(((b & 15) << 4) | (c >> 2));
      if (d !== null) bytes.push(((c & 3) << 6) | d);
    }
    return bytes;
  };
  // ByteWriter: little-endian value packing into a growable byte array.
  const WRITER = () => {
    const b = [];
    return {
      u8(v) { b.push(v & 255); },
      u16(v) { b.push(v & 255, (v >> 8) & 255); },
      u32(v) { const x = v >>> 0; b.push(x & 255, (x >> 8) & 255, (x >> 16) & 255, (x >> 24) & 255); },
      f64(v) { const dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, v, true); for (let i = 0; i < 8; i++) b.push(dv.getUint8(i)); },
      bytes() { return b; }
    };
  };
  const READER = (b) => {
    let p = 0;
    return {
      u8() { return b[p++] & 255; },
      u16() { const v = (b[p] | (b[p + 1] << 8)) & 65535; p += 2; return v; },
      u32() { const v = (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0; p += 4; return v; },
      f64() { const dv = new DataView(new Uint8Array(b.slice(p, p + 8)).buffer); p += 8; return dv.getFloat64(0, true); },
      atEnd() { return p >= b.length; }
    };
  };
  const FORMAT_VERSION = 1;
  const exportCode = () => {
    const w = WRITER();
    w.u8(FORMAT_VERSION);
    w.f64(Math.min(state.cycles, 1e12));
    w.f64(Math.min(state.lifetime, 1e12));
    w.u32(state.xp >>> 0);
    w.u16(state.streak & 65535);
    w.u16(state.bestStreak & 65535);
    w.u32(state.lifetimeCorrect >>> 0);
    w.u32(state.lifetimeWrong >>> 0);
    w.u8(state.difficulty);
    w.u8(Math.max(0, themeIds.indexOf(state.theme)));
    // upgrades (bit per known upgrade)
    let upBits = 0; UPGRADES.forEach((u) => { if (state.upgrades.includes(u.id)) upBits |= 1 << UPGRADES.indexOf(u); }); w.u8(upBits);
    // achievements (bit per known achievement)
    let achBits = 0; ACHIEVEMENTS.forEach((a) => { if (state.achievements.includes(a.id)) achBits |= 1 << ACHIEVEMENTS.indexOf(a); });
    for (let i = 0; i < 2; i++) w.u8((achBits >> (i * 8)) & 255);
    // masteries + lessonRead + nodes + completed per department (in DEPTS order)
    let masBits = 0; DEPTS.forEach((d) => { if (state.masteries.includes(d.id)) masBits |= 1 << DEPTS.indexOf(d); }); w.u8(masBits);
    let readBits = 0; DEPTS.forEach((d) => { if (deptState(d).lessonRead) readBits |= 1 << DEPTS.indexOf(d); }); w.u8(readBits);
    DEPTS.forEach((d) => w.u16(deptState(d).nodes & 65535));
    DEPTS.forEach((d) => {
      const n = d.bank.length, nbytes = Math.ceil(n / 8), mask = new Array(nbytes).fill(0);
      deptState(d).completed.forEach((idx) => { if (idx >= 0 && idx < n) mask[idx >> 3] |= 1 << (idx & 7); });
      for (let i = 0; i < nbytes; i++) w.u8(mask[i]);
    });
    return "BY" + FORMAT_VERSION + ":" + state.deviceId + ":" + bytesToB64(w.bytes());
  };
  const importCode = (code) => {
    code = String(code || "").trim().replace(/\s+/g, "");
    const m = /^BY(\d):([A-Z0-9]{4,8}):([A-Za-z0-9+/=]+)$/.exec(code);
    if (!m) return { ok: false, error: "That doesn't look like a valid save code." };
    const theirs = m[2], isThisDevice = theirs === state.deviceId;
    let bytes;
    try { bytes = b64ToBytes(m[3]); } catch (_) { return { ok: false, error: "The save code is not readable." }; }
    const r = READER(bytes);
    const v = r.u8();
    if (v !== FORMAT_VERSION) return { ok: false, error: "Unsupported save version." };
    const s = freshSave();
    s.deviceId = state.deviceId; // keep this install's identity after restore
    s.cycles = Math.floor(r.f64()); s.lifetime = Math.floor(r.f64());
    s.xp = r.u32(); s.streak = r.u16(); s.bestStreak = r.u16();
    s.lifetimeCorrect = r.u32(); s.lifetimeWrong = r.u32();
    const diffByte = r.u8();
    s.difficulty = [1, 2, 3, 4].includes(diffByte) ? diffByte : 1;
    const themeIdx = r.u8(); s.theme = themeIds[themeIdx] || "default";
    const upBits = r.u8(); UPGRADES.forEach((u, i) => { if (upBits & (1 << i)) s.upgrades.push(u.id); });
    const achLo = r.u8(), achHi = r.u8(); const achBits = achLo | (achHi << 8);
    ACHIEVEMENTS.forEach((a, i) => { if (achBits & (1 << i)) s.achievements.push(a.id); });
    const masBits = r.u8(); DEPTS.forEach((d, i) => { if (masBits & (1 << i)) s.masteries.push(d.id); });
    const readBits = r.u8(); DEPTS.forEach((d, i) => { if (readBits & (1 << i)) s.departments[d.id].lessonRead = true; });
    DEPTS.forEach((d) => { s.departments[d.id].nodes = r.u16(); });
    DEPTS.forEach((d) => {
      const n = d.bank.length, nbytes = Math.ceil(n / 8); const cm = [];
      for (let i = 0; i < nbytes; i++) cm.push(r.u8());
      const idxs = [];
      for (let i = 0; i < n; i++) if (cm[i >> 3] & (1 << (i & 7))) idxs.push(i);
      s.departments[d.id].completed = idxs;
    });
    if (!r.atEnd()) return { ok: false, error: "The save code is corrupt." };
    return { ok: true, s, isThisDevice };
  };

  function save() {
    if (suppressSave) return;
    state.lastSaved = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (_) { showFeedback("Browser storage is full or unavailable. Progress may not persist.", "bad"); }
  }
  function showFeedback(message, type) { feedback = message; feedbackType = type || ""; }

  // The difficulty determines which tag band a department draws practice questions from.
  // Higher difficulty shifts the mix toward harder questions; every band still
  // has a fallback so students can always clear all 100 questions.
  // Difficulty is a strict ladder: each level draws only its own tier (1-4),
  // so beginner is genuinely easy and expert genuinely hard. When a tier is
  // exhausted the game falls back to the HARDEST remaining question, so a
  // student can always clear all 100 while difficulty stays as high as possible.
  const bands = { 1: [1], 2: [2], 3: [3], 4: [4] };

  // Fisher–Yates shuffle (returns a new array).
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  // Per (department, difficulty) shuffled queues of bank indices, so each
  // difficulty level serves its questions in a fresh random order per run.
  let questionQueue = {};

  function selectQuestion(dept) {
    const progress = deptState(dept);
    if (progress.current !== null && !progress.completed.includes(progress.current)) return;
    const unanswered = () => dept.bank.map((_, i) => i).filter((i) => !progress.completed.includes(i));
    const band = bands[state.difficulty] || [1];
    const key = dept.id + ":" + state.difficulty;
    // Rebuild a shuffled queue when we have none left to show in this tier.
    let q = questionQueue[key] || [];
    const usable = (list) => list.filter((i) => !progress.completed.includes(i));
    if (usable(q).length === 0) {
      q = shuffle(unanswered().filter((i) => band.includes(dept.bank[i].d)));
      questionQueue[key] = q;
    }
    let next = usable(q)[0];
    if (next === undefined) {
      // The tier is exhausted — fall back to any remaining question, at random.
      const all = unanswered();
      if (!all.length) return null;
      next = all[Math.floor(Math.random() * all.length)];
    }
    progress.current = next;
  }

  // ---------------------------------------------------------------------------
  // Routing. page is the top-level destination; activeTab splits practice.
  // ---------------------------------------------------------------------------
  function navigate(page, deptId) {
    state.page = page;
    if (deptId && DEPTS.some((d) => d.id === deptId)) state.selected = deptId;
    if (page !== "practice") activeTab = "practice";
    feedback = ""; hintVisible = false;
    save();
    render();
    window.scrollTo(0, 0);
  }

  function nav() {
    const pages = [
      ["home", "Home"],
      ["learn", "Learn"],
      ["practice", "Practice"],
      ["land", "Land"],
      ["departments", "Departments"],
      ["upgrades", "Upgrades"],
      ["progress", "Progress"]
    ];
    return `<nav class="main-nav" aria-label="Main navigation">
      ${pages.map(([id, label]) => {
        const active = state.page === id || (id === "learn" && state.page === "learn-read");
        return `<button class="nav-item${active ? " active" : ""}" data-nav="${id}">${label}</button>`;
      }).join("")}
    </nav>`;
  }

  function themeSwitcher() {
    return `<span class="theme-picker" role="group" aria-label="Colour theme">
      <span class="theme-label" aria-hidden="true">THEME</span>
      ${THEMES.map((t) => {
        const on = state.theme === t.id;
        return `<button class="theme-dot${on ? " active" : ""}" data-action="set-theme" data-theme="${t.id}" title="${t.name}" aria-label="${t.name} theme"${on ? ` aria-pressed="true"` : ""}></button>`;
      }).join("")}
    </span>`;
  }

  const SAVE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>`;
  // A one-click save-to-file control in the top bar (export). Import lives on
  // the Progress page so nobody accidentally wipes their save from the header.
  function saveButton() {
    return `<span class="save-picker"><button class="save-btn" data-action="export-save" type="button" title="Download a backup of your progress" aria-label="Download your progress as a file">${SAVE_ICON}</button></span>`;
  }

  function difficultyPicker(compact) {
    return `<div class="difficulty-picker" role="radiogroup" aria-label="Choose your difficulty level">
      <span class="diff-label">${compact ? "DIFFICULTY" : "HOW CHALLENGING DO YOU WANT IT?"}</span>
      <div class="diff-options">
        ${DIFFICULTIES.map((d) => {
          const on = state.difficulty === d.id;
          return `<button class="diff-option${on ? " active" : ""}" role="radio" aria-checked="${on}" data-action="set-difficulty" data-difficulty="${d.id}">
            <span class="diff-code">${d.code}</span><span class="diff-name">${d.name}</span>
          </button>`;
        }).join("")}
      </div>
      ${compact ? "" : `<p class="diff-blurb">${diff().blurb}</p>`}
    </div>`;
  }

  function headerStats() {
    const s = $("#stat"); if (s) s.textContent = number(state.cycles);
    const x = $("#stat-xp"); if (x) x.textContent = `LV ${level()}`;
  }

  // ---------------------------------------------------------------------------
  // HOME
  // ---------------------------------------------------------------------------
  function renderHome() {
    const mastered = state.masteries.length;
    const nextAction = totalCorrect() === 0
      ? { text: "Read your first briefing to get started", guide: "Practice" }
      : { text: "Keep practising to clear questions and earn credits", guide: "Practice" };
    return `<section class="home-grid">
      <div class="home-hero panel">
        <div class="eyebrow">WELCOME TO THE FOUNDRY</div>
        <h1>Hello, engineer<span class="blink">_</span></h1>
        <p>byte.foundry teaches you how computers really work - binary, hexadecimal and Python - through short lessons, practice challenges and a factory you grow as you learn. Answer questions correctly to build your operation and unlock new departments.</p>
        <div class="home-cta-row">
          <button class="button" data-nav="learn">Read the briefings</button>
          <button class="button secondary" data-nav="practice">Start practising</button>
        </div>
      </div>
      <div class="home-next panel">
        <div class="eyebrow">YOUR LEVEL</div>
        <div class="level-num">LV ${level()}</div>
        <div class="progress-track"><div class="progress-fill" style="width:${Math.round(levelProgress() * 100)}%"></div></div>
        <p class="dim-muted">${state.xp % 100} / 100 XP to level ${level() + 1}</p>
        <p class="home-next-text">${nextAction.text}</p>
        <button class="button secondary" data-nav="${nextAction.guide}">${nextAction.guide} →</button>
      </div>
      <div class="home-stats panel">
        <div class="eyebrow">AT A GLANCE</div>
        <div class="home-stat-list">
          <div class="home-stat"><span>Questions cleared</span><strong>${totalCorrect()}/${totalQuestions()}</strong></div>
          <div class="home-stat"><span>Accuracy</span><strong>${accuracy()}%</strong></div>
          <div class="home-stat"><span>Current streak</span><strong>${state.streak}</strong></div>
          <div class="home-stat"><span>Passive income</span><strong>${number(totalPassive())}/s</strong></div>
          <div class="home-stat"><span>Departments mastered</span><strong>${mastered}/${DEPTS.length}</strong></div>
          <div class="home-stat"><span>Cycles owned</span><strong>${number(state.cycles)}</strong></div>
        </div>
      </div>
      <div class="home-difficulty panel">
        <div class="eyebrow">SET THE LEVEL OF CHALLENGE</div>
        <p class="dim-muted">You can change this any time - your progress is kept. Harder settings earn more credits.</p>
        ${difficultyPicker(false)}
      </div>
    </div>`;
  }

  // ---------------------------------------------------------------------------
  // LEARN - the lesson list (the five departments as lessons).
  // ---------------------------------------------------------------------------
  function renderLearn() {
    return `<div class="page-head"><div><div class="eyebrow">LEARN // SELECT A LESSON</div><h1>Learn before you build_</h1></div><p>Every department starts with a short briefing that teaches the ideas, then a final test. Read it, then put it into practice.</p></div>
      <div class="learn-list">
        ${DEPTS.map((d, i) => {
          const p = deptState(d);
          const complete = p.lessonRead;
          return `<article class="learn-card panel">
            <div class="learn-card-top"><span class="dept-code">${d.code}</span><span class="dept-name">${escapeHTML(d.name)}</span>${complete ? `<span class="tag-ok">BRIEFING READ</span>` : `<span class="tag-new">NEW</span>`}</div>
            <p class="learn-tagline">${escapeHTML(d.tagline)}</p>
            <div class="learn-progress"><span>${p.completed.length} questions cleared</span><div class="progress-track"><div class="progress-fill" style="width:${p.completed.length}%"></div></div></div>
            <button class="button${complete ? " secondary" : ""}" data-action="read-lesson-nav" data-id="${d.id}">${complete ? "Re-read lesson" : "Read the lesson"}</button>
          </article>`;
        }).join("")}
      </div>`;
  }

  // A single lesson being read.
  function renderLessonRead() {
    const dept = selectedDept();
    const p = deptState(dept);
    const L = dept.lesson;
    const bonus = dept.reward * 10 * multiplier("reward");
    const sections = L.sections.map((s) => `<div class="lesson-section"><h2>${escapeHTML(s.title)}</h2>${s.body}</div>`).join("");
    let demo = "";
    if (dept.demo) demo = `<div class="lesson-demo"><h2>Try it yourself</h2><p>${escapeHTML(L.demoNote)}</p>${demoPanel(dept)}</div>`;
    let knowledge = "";
    if (!p.lessonRead) {
      knowledge = `<div class="lesson-quiz"><h2>Quick knowledge check</h2><p>Make sure the idea sticks before you earn the briefing bonus.</p><div class="kq-question">${escapeHTML(dept.lessonCheck.q)}</div><form class="answer-form" id="lesson-check-form"><input class="answer-input" id="lesson-check-answer" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="your answer..." aria-label="Knowledge check answer"><button class="button" type="submit">Check answer</button></form>${feedback ? `<div class="feedback ${feedbackType}">${escapeHTML(feedback)}</div>` : ""}</div>`;
    }
    return `<div class="breadcrumb"><button class="text-button" data-nav="learn">← Back to lessons</button> / ${escapeHTML(dept.name)}</div>
      <div class="page-head"><div><div class="eyebrow">LESSON // ${dept.code}</div><h1>${escapeHTML(dept.name)}</h1></div><p>${escapeHTML(dept.tagline)}</p></div>
      <div class="lesson-layout">
        <div class="panel lesson-main">
          <div class="lesson-objectives"><div class="eyebrow">WHAT YOU WILL LEARN</div>${L.objectives.map((o) => `<p>· ${escapeHTML(o)}</p>`).join("")}</div>
          ${sections}
          ${demo}
          ${knowledge}
          <div class="lesson-footer"><span>${p.lessonRead ? "BRIEFING COMPLETE" : `BRIEFING BONUS: +${number(bonus)} CYC`}</span>
            ${p.lessonRead ? `<button class="button secondary" data-action="go-practice" data-id="${dept.id}">Practice ${dept.code}</button>` : ""}
          </div>
        </div>
        <div class="lesson-side">
          <div class="panel side-panel"><div class="eyebrow">MASTERY TEST</div><h3>${escapeHTML(dept.mastery.name)}</h3><p>Clear all ${dept.bank.length} questions, then attempt the departmental mastery test.</p><p class="side-progress">Mastered: ${state.masteries.includes(dept.id) ? "YES" : "NOT YET"}</p></div>
          <div class="panel side-panel"><div class="eyebrow">FOUNDRY REWARD</div><p>Every correct answer here pays <strong class="acid">+${number(reward(dept))} CYC</strong> now, and your installed nodes in this department keep earning while you're away.</p><button class="button secondary" data-action="go-practice" data-id="${dept.id}">Practice ${dept.code} →</button></div>
        </div>
      </div>`;
  }

  function demoPanel(dept) {
    // An interactive demonstration used by the binary / adder / subtractor lessons.
    const id = dept.id;
    if (id === "bin") {
      return `<div class="demo-play">
        <div class="demo-controls">
          <label class="demo-input"><span>Denary number</span><input id="demo-denary" class="answer-input" type="number" min="0" max="255" value="75"></label>
        </div>
        <div class="demo-bits" id="demo-bits"></div>
        <p class="dim-muted" id="demo-readout">Type a number and watch it become binary.</p>
      </div>`;
    }
    if (id === "add" || id === "sub") {
      const sign = id === "add" ? "Add" : "Subtract";
      return `<div class="demo-play">
        <div class="demo-controls">
          <label class="demo-input"><span>Left number (1-15)</span><input id="demo-left" class="answer-input" type="number" min="1" max="15" value="5"></label>
          <label class="demo-input"><span>Right number (1-15)</span><input id="demo-right" class="answer-input" type="number" min="1" max="15" value="6"></label>
          <button class="button" data-action="demo-calc">${sign}</button>
        </div>
        <div class="demo-summary" id="demo-summary"></div>
      </div>`;
    }
    return "";
  }

  // ---------------------------------------------------------------------------
  // PRACTICE - the terminal for the selected department.
  // ---------------------------------------------------------------------------
  function practiceTabs() {
    const dept = selectedDept();
    const cleared = deptState(dept).completed.length >= dept.bank.length;
    const tabs = [["practice", "Practice"], ["lesson", "Briefing"], ["nodes", "Hardware"]];
    if (cleared) tabs.push(["mastery", "Mastery"]);
    return `<nav class="tabs" aria-label="Sections in the ${escapeHTML(dept.name)} department">
      ${tabs.map(([id, label]) => `<button class="tab${activeTab === id ? " active" : ""}" data-action="tab" data-tab="${id}" ${id === "mastery" && state.masteries.includes(dept.id) ? "aria-disabled='true'" : ""}>${label}${id === "mastery" && state.masteries.includes(dept.id) ? " ✓" : ""}</button>`).join("")}
    </nav>`;
  }

  function renderPracticePage() {
    const dept = selectedDept();
    if (!deptState(dept).unlocked) {
      const previous = DEPTS[DEPTS.indexOf(dept) - 1];
      return `<div class="breadcrumb"><button class="text-button" data-nav="departments">← View departments</button></div>
        <div class="page-head dept-head"><div><div class="eyebrow">PRACTICE // ${dept.code} — ${escapeHTML(dept.name)}</div><h1>${escapeHTML(dept.name)}</h1></div>${difficultyPicker(true)}</div>
        <div class="panel locked-panel" style="padding:28px;">
          <div class="eyebrow">ACCESS RESTRICTED // ${dept.code}</div>
          <h2 style="margin:8px 0;">${escapeHTML(dept.name)} is not online yet</h2>
          <p>${previous ? `Clear 15 questions in ${escapeHTML(previous.name)}, then unlock ${escapeHTML(dept.name)} from the Departments page to practise here.` : "This department is not available yet."}</p>
          <div class="home-cta-row" style="margin-top:16px;">
            <button class="button" data-nav="departments">Open Departments</button>
            ${previous ? `<button class="button secondary" data-action="go-practice" data-id="${previous.id}">Practise ${escapeHTML(previous.code)} instead</button>` : ""}
          </div>
        </div>`;
    }
    const body = activeTab === "lesson" ? renderLessonTab(dept)
      : activeTab === "nodes" ? renderNodesTab(dept)
      : activeTab === "mastery" ? renderMasteryTab(dept)
      : renderTerminalTab(dept);
    return `<div class="breadcrumb"><button class="text-button" data-nav="learn">← Choose a department</button></div>
      <div class="page-head dept-head"><div><div class="eyebrow">PRACTICE // ${dept.code} — ${escapeHTML(dept.name)}</div><h1>${escapeHTML(dept.name)}</h1></div>${difficultyPicker(true)}</div>
      <div class="panel">${practiceTabs()}${body}</div>`;
  }

  function renderTerminalTab(dept) {
    const progress = deptState(dept);
    if (progress.completed.length >= dept.bank.length) {
      const mastered = state.masteries.includes(dept.id);
      return `<div class="panel-body"><div class="empty-state"><div class="eyebrow">DEPARTMENT CLEARED</div><h2 style="font:600 22px var(--mono);color:var(--acid)">${dept.bank.length} / ${dept.bank.length} cleared</h2><p>You have cleared every practice question in ${escapeHTML(dept.name)}.</p>
        ${mastered
          ? `<p class="dim-muted" style="margin-top:14px">${escapeHTML(dept.mastery.name)} — MASTERED. This department is complete.</p>`
          : `<p class="dim-muted" style="margin-top:14px">One final challenge remains.</p><button class="button" data-action="tab" data-tab="mastery">Attempt mastery: ${escapeHTML(dept.mastery.name)}</button>`}
      </div></div>`;
    }
    selectQuestion(dept);
    const question = dept.bank[progress.current];
    const questionNumber = progress.completed.length + 1;
    const percent = progress.completed.length;
    const diffTag = DIFFICULTIES.find((d) => d.id === question.d);
    return `<div class="panel-body">
      <div class="question-meta"><span>Challenge ${String(questionNumber).padStart(3, "0")} / ${dept.bank.length}</span><span>Level ${diffTag ? diffTag.code : ""}</span><span>Reward <strong>+${number(reward(dept))} CYC</strong></span></div>
      <div class="progress-track" style="margin-top:10px"><div class="progress-fill" style="width:${percent}%"></div></div>
      ${question.c ? `<pre class="code-block">${escapeHTML(question.c)}</pre>` : ""}
      <p class="question">${escapeHTML(question.q)}</p>
      <form class="answer-form" id="answer-form">
        <input class="answer-input" id="answer" name="answer" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="enter your answer..." aria-label="Your answer" required>
        <button class="button" type="submit">Check answer ↵</button>
      </form>
      <div class="question-actions"><button class="text-button" data-action="hint" aria-expanded="${hintVisible}">${hintVisible ? "Hide hint" : "Need a hint?"}</button><span class="dim" style="font:10px var(--mono)">ENTER TO CHECK</span></div>
      ${hintVisible ? `<div class="milestone"><strong>HINT / </strong>${escapeHTML(dept.tip)}</div>` : ""}
      ${feedback ? `<div class="feedback ${feedbackType}" role="status">${escapeHTML(feedback)}</div>` : ""}
    </div>`;
  }

  function renderLessonTab(dept) {
    const p = deptState(dept);
    return `<div class="panel-body"><div class="lesson-copy">
      <div class="lesson-objectives"><div class="eyebrow">WHAT YOU WILL LEARN</div>${dept.lesson.objectives.map((o) => `<p>· ${escapeHTML(o)}</p>`).join("")}</div>
      ${dept.lesson.sections.map((s) => `<div class="lesson-section"><h3>${escapeHTML(s.title)}</h3>${s.body}</div>`).join("")}
    </div>
    <button class="button" data-action="go-learn" data-id="${dept.id}">Open full lesson view →</button></div>`;
  }

  function renderNodesTab(dept) {
    const progress = deptState(dept);
    const output = progress.nodes * dept.rate * mastery(dept) * multiplier("production");
    const cost = nodeCost(dept);
    return `<div class="panel-body">
      <div class="node-console">
        <div class="node-stat"><span>Installed nodes</span><strong>${progress.nodes.toLocaleString("en-GB")}</strong></div>
        <div class="node-stat"><span>Department output</span><strong>${number(output)}<small style="font-size:11px;color:var(--muted)"> / sec</small></strong></div>
        <div class="node-stat"><span>Node base output</span><strong>${number(dept.rate)}<small style="font-size:11px;color:var(--muted)"> / sec</small></strong></div>
        <div class="node-stat"><span>Mastery multiplier</span><strong>x${mastery(dept).toFixed(2)}</strong></div>
      </div>
      <div class="node-buy"><div><strong>Deploy another ${escapeHTML(dept.code)} node</strong><p>Nodes keep earning credits while you practise or are away. Every correct answer raises this department's mastery multiplier.</p><p style="margin-top:5px;color:var(--acid);font-family:var(--mono)">NEXT NODE // ${number(cost)} CYC</p></div><button class="button" data-action="buy-node" ${state.cycles < cost ? "disabled" : ""}>Install node</button></div>
      ${feedback ? `<div class="feedback ${feedbackType}">${escapeHTML(feedback)}</div>` : ""}
    </div>`;
  }

  // Mastery quiz: pick 6 random distinct questions from the department bank.
  function masteryPick() {
    const dept = selectedDept();
    if (state.masteryOrder && state.masteryOrder.dept === dept.id && state.masteryOrder.index < state.masteryOrder.list.length) return state.masteryOrder;
    const pool = dept.bank.slice();
    const pick = [];
    while (pool.length && pick.length < 6) {
      const i = Math.floor(Math.random() * pool.length);
      pick.push(pool.splice(i, 1)[0]);
    }
    state.masteryOrder = { dept: dept.id, list: pick, index: 0, correct: 0 };
    return state.masteryOrder;
  }
  function renderMasteryTab(dept) {
    if (state.masteries.includes(dept.id)) {
      return `<div class="panel-body"><div class="empty-state"><div class="eyebrow">MASTERY COMPLETE</div><h2 style="font:600 22px var(--mono);color:var(--acid)">${escapeHTML(dept.mastery.name)}</h2><p>You have mastered ${escapeHTML(dept.name)}. Your nodes here keep earning while you learn elsewhere.</p></div></div>`;
    }
    const run = masteryPick();
    const q = run.list[run.index];
    return `<div class="panel-body">
      <div class="question-meta"><span>MASTERY // ${escapeHTML(dept.mastery.name)}</span><span>Question ${run.index + 1} of ${run.list.length}</span></div>
      <p class="dim-muted" style="margin-top:8px">${escapeHTML(dept.mastery.body)} Score at least 4 of 6 to master the department and earn bonus credits.</p>
      ${q.c ? `<pre class="code-block">${escapeHTML(q.c)}</pre>` : ""}
      <p class="question">${escapeHTML(q.q)}</p>
      <form class="answer-form" id="mastery-form">
        <input class="answer-input" id="mastery-answer" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="enter your answer..." aria-label="Mastery answer" required>
        <button class="button" type="submit">Check answer ↵</button>
      </form>
      ${feedback ? `<div class="feedback ${feedbackType}" role="status">${escapeHTML(feedback)}</div>` : ""}
    </div>`;
  }

  // ---------------------------------------------------------------------------
  // LAND - buy plots that earn cycles and occasionally need a repair.
  // ---------------------------------------------------------------------------
  function renderLand() {
    const damaged = state.plots.filter((p) => p.broken).length;
    const totalPassive = production() + plotProduction();
    return `<div class="page-head"><div><div class="eyebrow">LAND // YOUR PLOTS</div><h1>Grow your real estate_</h1></div><p>Buy plots with cycles and they earn more cycles over time. Every plot wears out and needs a paid repair - a broken plot earns nothing until you fix it.</p></div>
      ${feedback ? `<div class="feedback ${feedbackType}">${escapeHTML(feedback)}</div>` : ""}
      <div class="home-stat-list" style="grid-template-columns:repeat(3,1fr);margin-bottom:22px;">
        <div class="home-stat"><span>Plots owned</span><strong>${state.plots.length}</strong></div>
        <div class="home-stat"><span>Needs repair</span><strong${damaged ? ' style="color:var(--red)"' : ""}>${damaged}</strong></div>
        <div class="home-stat"><span>Plot income</span><strong>${number(plotProduction())}/s</strong></div>
      </div>
      <div class="panel" style="padding:18px;margin-bottom:22px;">
        <div class="eyebrow">YOUR EMPIRE</div>
        ${state.plots.length === 0
          ? `<p class="dim-muted" style="margin:10px 0 0;">No plots yet. Buy your first one below.</p>`
          : `<div class="plot-list">${state.plots.map((p) => {
              const t = plotType(p.type);
              return `<div class="plot-card${p.broken ? " broken" : ""}">
                <div class="plot-info"><span class="dept-code">${escapeHTML(t.name)}</span><span class="dim-muted">+${number(p.rate)}/sec${p.broken ? " · OFFLINE" : ""}</span></div>
                ${p.broken
                  ? `<div class="plot-actions"><span class="tag-new" style="color:var(--red);border-color:var(--red);">NEEDS REPAIR</span><button class="button" data-action="repair-plot" data-id="${p.id}" ${state.cycles < p.repair ? "disabled" : ""}>Repair · ${number(p.repair)} CYC</button></div>`
                  : `<div class="plot-actions"><span class="tag-ok">ONLINE</span></div>`}
              </div>`;
            }).join("")}</div>`}
      </div>
      <div class="shop-grid">
        ${PLOT_TYPES.map((t) => {
          const cost = plotCost(t);
          const owned = state.plots.filter((p) => p.type === t.id).length;
          return `<article class="shop-item">
            <div><div class="eyebrow">PLOT</div><h2 class="shop-item-title">${escapeHTML(t.name)} <span class="dim-muted">×${owned}</span></h2><p>Earns <strong class="acid">+${number(t.rate)} CYC/sec</strong> between repairs. Repairs cost ${number(t.repair)} CYC and are needed every ~${Math.round((t.uptime[0] + t.uptime[1]) / 2)} seconds of use.</p></div>
            <div class="shop-bottom"><span class="price">${number(cost)} CYC</span><button class="button secondary" data-action="buy-plot" data-type="${t.id}" ${state.cycles < cost ? "disabled" : ""}>Buy plot</button></div>
          </article>`;
        }).join("")}
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // DEPARTMENTS - the tycoon/economy hub (unlock, nodes, masteries).
  // ---------------------------------------------------------------------------
  function renderDepartments() {
    return `<div class="page-head"><div><div class="eyebrow">DEPARTMENTS // YOUR OPERATIONS</div><h1>Grow your foundry_</h1></div><p>Clear questions in each department to unlock the next one. Nodes give you passive income; the mastery test crowns each department.</p></div>
      ${difficultyPicker(true)}
      <div class="dept-grid">
        ${DEPTS.map((d, i) => {
          const p = deptState(d);
          const index = DEPTS.indexOf(d);
          const unlocked = p.unlocked;
          const canUnlock = previousUnlocked(index);
          const cost = d.cost;
          const output = p.nodes * d.rate * mastery(d) * multiplier("production");
          const mastered = state.masteries.includes(d.id);
          const locked = !unlocked;
          return `<article class="panel dept-card${locked ? " locked" : ""}">
            <div class="learn-card-top"><span class="dept-code">${d.code}</span><span class="dept-name">${escapeHTML(d.name)}</span>${mastered ? `<span class="tag-ok">MASTERED</span>` : locked ? `<span class="tag-new">LOCKED</span>` : `<span class="tag-new">ONLINE</span>`}</div>
            <p class="learn-tagline">${escapeHTML(d.tagline)}</p>
            ${locked
              ? `<p class="dept-card-line">Requires 15 questions cleared in ${escapeHTML(DEPTS[index - 1] ? DEPTS[index - 1].name : "the previous department")}. Unlock cost ${number(cost)} CYC.</p>
                 ${canUnlock ? `<button class="button" data-action="unlock-dept" data-id="${d.id}" ${state.cycles < cost ? "disabled" : ""}>Unlock for ${number(cost)} CYC</button>` : `<button class="button secondary" data-action="go-practice" data-id="${DEPTS[index - 1].id}">Clear ${escapeHTML(DEPTS[index - 1].code)} questions first</button>`}`
              : `<div class="dept-card-stats">
                   <div class="home-stat"><span>Questions</span><strong>${p.completed.length}/${d.bank.length}</strong></div>
                   <div class="home-stat"><span>Nodes</span><strong>${p.nodes}</strong></div>
                   <div class="home-stat"><span>Output</span><strong>${number(output)}/s</strong></div>
                 </div>
                 <div class="home-cta-row">
                   <button class="button" data-action="go-practice" data-id="${d.id}">Practice ${d.code}</button>
                   ${p.completed.length >= d.bank.length && !mastered ? `<button class="button secondary" data-action="go-mastery" data-id="${d.id}">Mastery test</button>` : ""}
                 </div>`}
          </article>`;
        }).join("")}
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // UPGRADES
  // ---------------------------------------------------------------------------
  function renderUpgradesPage() {
    return `<div class="page-head"><div><div class="eyebrow">UPGRADES // RESEARCH & DEVELOPMENT</div><h1>Permanent upgrades_</h1></div><p>Spend cycles on improvements that last forever. Each one clearly shows what it does.</p></div>
      ${difficultyPicker(true)}
      <div class="shop-grid">
        ${UPGRADES.map((upgrade) => {
          const owned = state.upgrades.includes(upgrade.id);
          return `<article class="shop-item">
            <div><div class="eyebrow">${upgrade.type.toUpperCase()} MODULE</div><h2 class="shop-item-title">${escapeHTML(upgrade.name)}</h2><p>${escapeHTML(upgrade.description)}</p></div>
            <div class="shop-bottom"><span class="price">${owned ? "INSTALLED" : `${number(upgrade.cost)} CYC`}</span>${owned ? `<span class="shop-owned">ONLINE ✓</span>` : `<button class="button secondary" data-action="buy-upgrade" data-id="${upgrade.id}" ${state.cycles < upgrade.cost ? "disabled" : ""}>Purchase</button>`}</div>
          </article>`;
        }).join("")}
      </div>
      <div class="panel upgrade-summary"><div class="eyebrow">CURRENT MULTIPLIERS</div>
        <div class="upgrade-stats">
          <div class="home-stat"><span>Question reward / XP</span><strong>x${multiplier("reward").toFixed(1)}</strong></div>
          <div class="home-stat"><span>Node production</span><strong>x${multiplier("production").toFixed(1)}</strong></div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // PROGRESS
  // ---------------------------------------------------------------------------
  function renderProgress() {
    const elapsed = (() => {
      if (!state.lastActive) return 0;
      const day = 24 * 60 * 60 * 1000;
      return Math.floor((Date.now() - new Date(state.lastActive).getTime()) / day);
    })();
    if (elapsed >= 1) { state.daily = 0; state.lastActive = new Date().toISOString(); }
    const mastered = state.masteries;
    return `<div class="page-head"><div><div class="eyebrow">PROGRESS // YOUR STATS</div><h1>Your progress_</h1></div><p>Everything is saved automatically in this browser. Change difficulty any time without losing this.</p></div>
      ${difficultyPicker(true)}
      <div class="progress-top">
        <div class="panel progress-card">
          <div class="eyebrow">OVERALL XP</div>
          <div class="progress-xp"><span class="level-num">LV ${level()}</span><span>${number(state.xp)} XP</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${Math.round(levelProgress() * 100)}%"></div></div>
          <p class="dim-muted">${state.xp % 100} / 100 XP to level ${level() + 1}</p>
        </div>
        <div class="panel progress-card">
          <div class="eyebrow">QUESTIONS</div>
          <div class="progress-grid2">
            <div class="home-stat"><span>Answered</span><strong>${totalAnswered()}</strong></div>
            <div class="home-stat"><span>Correct</span><strong>${state.lifetimeCorrect}</strong></div>
            <div class="home-stat"><span>Accuracy</span><strong>${accuracy()}%</strong></div>
            <div class="home-stat"><span>Current streak</span><strong>${state.streak}</strong></div>
          </div>
          <div class="progress-accuracy"><div class="progress-track"><div class="progress-fill" style="width:${accuracy()}%"></div></div></div>
        </div>
        <div class="panel progress-card">
          <div class="eyebrow">PER-DEPARTMENT</div>
          <div class="dept-meter-list">
            ${DEPTS.map((d) => `<div class="dept-meter"><span>${d.code}</span><div class="progress-track"><div class="progress-fill" style="width:${deptState(d).completed.length}%"></div></div><strong>${deptState(d).completed.length}</strong></div>`).join("")}
          </div>
        </div>
      </div>

      <div class="panel progress-section">
        <div class="eyebrow">DEPARTMENT MASTERY</div>
        <div class="mastery-list">
          ${DEPTS.map((d) => {
            const done = state.masteries.includes(d.id);
            return `<div class="mastery-row"><span class="dept-code">${d.code}</span><span>${escapeHTML(d.mastery.name)}</span>${done ? `<span class="tag-ok">MASTERED</span>` : deptState(d).completed.length >= d.bank.length ? `<span class="tag-new">READY</span>` : `<span class="tag-locked">${deptState(d).completed.length}/${d.bank.length}</span>`}</div>`;
          }).join("")}
        </div>
      </div>

      <div class="panel progress-section">
        <div class="eyebrow">ACHIEVEMENTS // ${state.achievements.length}/${ACHIEVEMENTS.length}</div>
        <div class="ach-grid">
          ${ACHIEVEMENTS.map((a) => {
            const earned = state.achievements.includes(a.id);
            return `<div class="ach-item${earned ? "" : " locked"}"><span class="ach-title">${escapeHTML(a.title)}</span><span class="ach-desc">${escapeHTML(a.desc)}</span>${earned ? `<span class="tag-ok">EARNED</span>` : `<span class="tag-locked">LOCKED</span>`}</div>`;
          }).join("")}
        </div>
      </div>

      <div class="panel progress-section">
        <div class="eyebrow">DETAILS</div>
        <div class="detail-list">
          <div class="detail-row"><span>Selected difficulty</span><strong>${diff().name} (${diff().code})</strong></div>
          <div class="detail-row"><span>Lessons / briefings read</span><strong>${DEPTS.filter((d) => deptState(d).lessonRead).length}/${DEPTS.length}</strong></div>
          <div class="detail-row"><span>Nodes installed</span><strong>${totalNodes()}</strong></div>
          <div class="detail-row"><span>Lifetime credits earned</span><strong>${number(state.lifetime)}</strong></div>
          <div class="detail-row"><span>Save data</span><strong>Saved locally in this browser</strong></div>
        </div>
        <label class="motion-toggle"><input type="checkbox" id="reduced-motion" ${state.reducedMotion ? "checked" : ""}> Reduce animation and motion</label>
        <div class="backup-block">
          <div class="eyebrow" style="margin-top:24px;">BACKUP &amp; RESTORE</div>
          <p class="dim-muted">Take your progress anywhere. Export a short code and import it on another computer — handy on shared PCs. Your save never leaves the browser except as a file you download, and no account or server is involved.</p>
          <div class="home-cta-row">
            <button class="button" data-action="export-save">Download save file</button>
            <button class="button secondary" data-action="copy-code">Copy code</button>
          </div>
          <div class="import-box">
            <label class="diff-label" for="import-code">PASTE A SAVE CODE TO RESTORE IT</label>
            <div class="answer-form">
              <input class="answer-input" id="import-code" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="BY1:... paste your code here..." aria-label="Save code">
              <button class="button" type="button" data-action="import-save">Restore</button>
            </div>
            <p class="dim-muted" style="margin:8px 0 0;">Only use a code that is your own. A code from someone else just clones their progress onto this browser.</p>
          </div>
        </div>
        <div class="reset-row" style="border-top:0;margin-top:20px;"><span>Want to start over?</span><button class="button danger" data-action="reset">Wipe save data</button></div>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // Root renderer.
  // ---------------------------------------------------------------------------
  function render() {
    headerStats();
    if (typeof state.masteryOrder === "undefined") state.masteryOrder = null;
    let body = "";
    if (state.page === "learn") body = renderLearn();
    else if (state.page === "learn-read") body = renderLessonRead();
    else if (state.page === "practice") body = renderPracticePage();
    else if (state.page === "land") body = renderLand();
    else if (state.page === "departments") body = renderDepartments();
    else if (state.page === "upgrades") body = renderUpgradesPage();
    else if (state.page === "progress") body = renderProgress();
    else body = renderHome();

    app.innerHTML = `<div class="top-row">${nav()}<div class="top-stats">
      <span class="wallet"><span class="wallet-label">CYCLES</span><strong id="stat">0</strong></span>
      <span class="wallet"><span class="wallet-label">LEVEL</span><strong id="stat-xp">LV 1</strong></span>
      ${saveButton()}
      ${themeSwitcher()}
    </div></div>
      <div class="page-frame">${body}</div>`;
    headerStats();
    initPostRender();
    if (state.reducedMotion) document.documentElement.classList.add("reduce-motion");
    else document.documentElement.classList.remove("reduce-motion");
    applyTheme();
  }

  // Seeds the interactive lesson demos with their initial values after a render.
  function initPostRender() {
    const dd = $("#demo-denary");
    if (dd) {
      const n = Math.max(0, Math.min(255, parseInt(dd.value, 10) || 0));
      const bitsEl = $("#demo-bits"); const readEl = $("#demo-readout");
      if (bitsEl) {
        bitsEl.innerHTML = [...bin(n, 8)].map((bit) => `<span class="demo-bit${bit === "1" ? " on" : ""}">${bit}</span>`).join("") +
          `<div class="demo-cap">${[128, 64, 32, 16, 8, 4, 2, 1].map((v) => `<span>${v}</span>`).join("")}</div>`;
      }
      if (readEl) readEl.textContent = `${n} = ${bin(n, 8)}`;
    }
    // Focus the active practice input for keyboard-first navigation.
    if (activeTab === "practice" && $("#answer")) $("#answer").focus();
  }

  // ---------------------------------------------------------------------------
  // Actions.
  // ---------------------------------------------------------------------------
  const goPracticeFor = (id) => {
    const d = DEPTS.find((x) => x.id === id) || selectedDept();
    if (!deptState(d).unlocked) { showFeedback(`${d.code} is not unlocked yet. Clear questions in the earlier department first.`, "bad"); renderDepartmentSwitch(); return; }
    state.selected = d.id;
    activeTab = "practice";
    feedback = "";
    hintVisible = false;
  };
  function renderDepartmentSwitch() { navigate("departments", state.selected); }

  function demoResult(deptId, left, right) {
    const l = Math.max(0, Math.min(15, parseInt(left, 10) || 0));
    const r = Math.max(0, Math.min(15, parseInt(right, 10) || 0));
    if (deptId === "add") {
      const sum = l + r;
      return `<div class="demo-add"><pre>  ${bin(l, 4)}\n+ ${bin(r, 4)}\n  ${bin(sum, 5)}</pre><p>${l} + ${r} = ${sum}. In 4 bits that needs ${sum > 15 ? "5 bits (overflow)" : "4 bits"}.</p><p class="dim-muted">Column by column from the right, carry when a column reaches 2.</p></div>`;
    }
    // sub
    if (r > l) return `<p class="feedback bad">Choose a right number that is not bigger than the left, so the answer stays positive for this simple method.</p>`;
    return `<div class="demo-add"><pre>  ${bin(l, 4)}\n- ${bin(r, 4)}\n  ${bin(l - r, 4)}</pre><p>${l} - ${r} = ${l - r}. Borrow 1 from the next column whenever you need 0 - 1.</p></div>`;
  }

  async function submitMasteryAnswer(value) {
    const dept = selectedDept();
    const run = state.masteryOrder;
    if (!run || run.dept !== dept.id) return;
    const q = run.list[run.index];
    const ok = normalise(value) === normalise(q.a);
    if (ok) run.correct += 1;
    run.index += 1;
    if (run.index >= run.list.length) {
      const required = Math.ceil(run.list.length * 0.6);
      if (run.correct >= required) {
        state.masteries.push(dept.id);
        const bonus = dept.reward * 30 * multiplier("reward");
        addCycles(bonus);
        addXP(500);
        const earned = checkAchievements();
        showFeedback(`MASTERY ACHIEVED // ${run.correct}/${run.list.length} correct. +${number(bonus)} CYC and +500 XP${earned ? " · new achievement" : ""}.`, "good");
      } else {
        deptState(dept).masteryAttempts += 1;
        showFeedback(`NOT THIS TIME // ${run.correct}/${run.list.length} correct. You need ${required}. Revisit the practice questions, then retry the mastery test from the tab.`, "bad");
      }
      state.masteryOrder = null;
    } else {
      showFeedback(ok ? `CORRECT // Question ${run.index} of ${run.list.length}.` : `NOT QUITE // The correct answer was ${escapeHTML(q.a)}. Question ${run.index} of ${run.list.length}.`, ok ? "good" : "bad");
    }
    save(); render();
  }

  function submitAnswer(value) {
    const dept = selectedDept();
    const progress = deptState(dept);
    selectQuestion(dept);
    const question = dept.bank[progress.current];
    if (normalise(value) === normalise(question.a)) {
      const payout = reward(dept);
      addCycles(payout);
      addXP(20 + question.d * 10);
      progress.completed.push(progress.current);
      state.streak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      state.daily += 1;
      state.lifetimeCorrect += 1;
      state.lastActive = new Date().toISOString();
      progress.current = null;
      hintVisible = false;
      const earned = checkAchievements();
      let msg = `CORRECT // +${number(payout)} CYC, +${20 + question.d * 10} XP. Streak ${state.streak}.`;
      if (progress.completed.length >= dept.bank.length) msg += " All questions cleared — attempt the mastery test!";
      if (earned) msg += " New achievement unlocked!";
      showFeedback(msg, "good");
    } else {
      state.streak = 0;
      state.lifetimeWrong += 1;
      state.lastActive = new Date().toISOString();
      showFeedback("NOT QUITE // Check the format and try again. This question stays here. The hint may help.", "bad");
    }
    save(); render();
    if (activeTab === "practice") $("#answer")?.focus();
  }

  // Event handling.
  document.addEventListener("click", (event) => {
    const navBtn = event.target.closest("[data-nav]");
    if (navBtn) {
      const target = navBtn.dataset.nav;
      if (target === "practice") {
        // Land on the most advanced department the student has unlocked.
        activeTab = "practice";
        let first = DEPTS[0];
        for (const d of DEPTS) if (deptState(d).unlocked) first = d;
        state.selected = first.id;
      }
      navigate(target);
      return;
    }

    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.action;

    if (action === "set-difficulty") {
      state.difficulty = Number(button.dataset.difficulty);
      // Re-pick any in-progress question so the new difficulty applies immediately,
      // and drop the shuffled queue so the new level serves a fresh random order.
      DEPTS.forEach((d) => { const p = deptState(d); if (p.current !== null) p.current = null; });
      questionQueue = {};
      feedback = "";
      save(); render();
    } else if (action === "set-theme") {
      state.theme = themeIds.includes(button.dataset.theme) ? button.dataset.theme : "default";
      save(); render();
    } else if (action === "tab") {
      activeTab = button.dataset.tab;
      feedback = ""; hintVisible = false;
      save(); render();
    } else if (action === "hint") {
      hintVisible = !hintVisible;
      render();
    } else if (action === "go-practice") {
      goPracticeFor(button.dataset.id);
      navigate("practice", button.dataset.id);
    } else if (action === "go-mastery") {
      const id = button.dataset.id;
      state.selected = id; state.masteryOrder = null; feedback = ""; hintVisible = false;
      activeTab = "mastery";
      navigate("practice", id);
    } else if (action === "go-learn") {
      navigate("learn-read", button.dataset.id);
    } else if (action === "read-lesson-nav") {
      navigate("learn-read", button.dataset.id);
    } else if (action === "unlock-dept") {
      const d = DEPTS.find((x) => x.id === button.dataset.id);
      const index = DEPTS.indexOf(d);
      if (d && previousUnlocked(index) && state.cycles >= d.cost) {
        state.cycles -= d.cost;
        deptState(d).unlocked = true;
        showFeedback(`${d.code} DEPARTMENT IS NOW ONLINE.`, "good");
        save(); render(); renderDepartmentSwitch();
      }
    } else if (action === "buy-node") {
      const dept = selectedDept();
      const cost = nodeCost(dept);
      if (state.cycles >= cost) {
        state.cycles -= cost;
        deptState(dept).nodes += 1;
        const earned = checkAchievements();
        showFeedback(`${dept.code} NODE INSTALLED // PRODUCTION INCREASED.${earned ? " New achievement!" : ""}`, "good");
        save(); render();
      }
    } else if (action === "buy-upgrade") {
      const upgrade = UPGRADES.find((item) => item.id === button.dataset.id);
      if (upgrade && !state.upgrades.includes(upgrade.id) && state.cycles >= upgrade.cost) {
        state.cycles -= upgrade.cost;
        state.upgrades.push(upgrade.id);
        showFeedback(`${upgrade.name.toUpperCase()} INSTALLED.`, "good");
        save(); render();
      }
    } else if (action === "buy-plot") {
      const t = plotType(button.dataset.type);
      const cost = plotCost(t);
      if (state.cycles >= cost) {
        state.cycles -= cost;
        state.plots.push(newPlot(t));
        showFeedback(`${t.name.toUpperCase()} PLOT BOUGHT // +${number(t.rate)} CYC/sec.`, "good");
        save(); render();
      }
    } else if (action === "repair-plot") {
      const plot = state.plots.find((x) => x.id === button.dataset.id);
      if (plot && plot.broken && state.cycles >= plot.repair) {
        state.cycles -= plot.repair;
        plot.broken = false;
        plot.nextBreak = Date.now() + nextBreakIn(plotType(plot.type)) * 1000;
        showFeedback(`${plotType(plot.type).name.toUpperCase()} REPAIRED // resume earning +${number(plot.rate)}/sec.`, "good");
        save(); render();
      }
    } else if (action === "demo-calc") {
      const id = state.selected || "bin";
      const left = $("#demo-left")?.value, right = $("#demo-right")?.value;
      const box = $("#demo-summary");
      if (box) box.innerHTML = demoResult(id === "sub" ? "sub" : "add", left, right);
      return; // avoid a full re-render that would clear the demo result
    } else if (action === "export-save") {
      const code = exportCode();
      try {
        const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "bytefoundry-save.txt";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        showFeedback("SAVE DOWNLOADED // Keep the file safe. Codes are portable but a code from someone else just clones their save.", "note");
      } catch (_) {
        showFeedback("Could not download — your browser blocked it. Copy this from the Progress page instead.", "bad");
      }
      save(); render();
      return;
    } else if (action === "copy-code") {
      const code = exportCode();
      const yes = (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText)
        ? navigator.clipboard.writeText(code).then(() => true).catch(() => false)
        : Promise.resolve(false);
      yes.then((ok) => {
        if (ok) showFeedback("SAVE CODE COPIED // Keep it private — it is your progress.", "good");
        else showFeedback("Copy blocked — select and copy the code manually, or download it. Save code: " + code, "note");
        render();
      });
      return;
    } else if (action === "import-save") {
      const input = $("#import-code");
      const code = input ? input.value : "";
      const res = importCode(code);
      if (!res.ok) {
        showFeedback(res.error, "bad"); render(); return;
      }
      const msg = res.isThisDevice
        ? "Restore this save? It replaces your current progress in this browser."
        : "This save belongs to ANOTHER device or person — importing it will replace THIS browser's progress. Only continue if this code is really yours.";
      if (window.confirm(msg)) {
        // Replace the working state with the imported one, then persist.
        Object.keys(state).forEach((k) => delete state[k]);
        Object.assign(state, res.s);
        save();
        window.location.reload();
      }
      return;
    } else if (action === "reset") {
      if (window.confirm("Permanently wipe all byte.foundry progress in this browser?")) {
        suppressSave = true;
        localStorage.removeItem(SAVE_KEY);
        localStorage.removeItem(OLD_KEY);
        window.location.reload();
        return;
      }
    }

    save(); render();
  });

  // ---------------------------------------------------------------------------
  // The mastery flow lives inside the practice page as a tab ("Mastery"),
  // selected with data-action="tab", so the shell (nav + stats) stays intact.
  // The legacy raw-frame replacement helpers are removed.
  // ---------------------------------------------------------------------------

  // form submits
  document.addEventListener("submit", (event) => {
    if (event.target.id === "answer-form") {
      event.preventDefault();
      const input = $("#answer");
      if (input && input.value.trim()) submitAnswer(input.value);
      return;
    }
    if (event.target.id === "mastery-form") {
      event.preventDefault();
      const input = $("#mastery-answer");
      if (input && input.value.trim()) { submitMasteryAnswer(input.value); }
      return;
    }
    if (event.target.id === "lesson-check-form") {
      event.preventDefault();
      const dept = selectedDept();
      const input = $("#lesson-check-answer");
      if (!input || !input.value.trim()) return;
      const kq = dept.lessonCheck;
      if (!kq) { showFeedback("No knowledge check is set up for this lesson.", "bad"); return; }
      if (normalise(input.value) === normalise(kq.a)) {
        const bonus = dept.reward * 10 * multiplier("reward");
        deptState(dept).lessonRead = true;
        addCycles(bonus); addXP(40);
        const earned = checkAchievements();
        showFeedback(`CORRECT // BRIEFING COMPLETE. +${number(bonus)} CYC and +40 XP.${earned ? " New achievement!" : ""}`, "good");
      } else {
        showFeedback("NOT QUITE // Re-read the briefing if you need to, then try the knowledge check again.", "bad");
      }
      save(); render();
      return;
    }
  });

  // Inputs that auto-update state (reduced motion toggle, demo).
  document.addEventListener("change", (event) => {
    if (event.target && event.target.id === "reduced-motion") {
      state.reducedMotion = event.target.checked;
      save(); render();
    }
  });
  document.addEventListener("input", (event) => {
    if (event.target && event.target.id === "demo-denary") {
      const n = Math.max(0, Math.min(255, parseInt(event.target.value, 10) || 0));
      const bitsEl = $("#demo-bits"); const readEl = $("#demo-readout");
      if (bitsEl) {
        const b = bin(n, 8);
        bitsEl.innerHTML = [...b].map((bit, idx) => `<span class="demo-bit${bit === "1" ? " on" : ""}">${bit}</span>`).join("") +
          `<div class="demo-cap">${[128, 64, 32, 16, 8, 4, 2, 1].map((v) => `<span>${v}</span>`).join("")}</div>`;
      }
      if (readEl) readEl.textContent = `${n} = ${bin(n, 8)}`;
    }
  });

  // ---------------------------------------------------------------------------
  // Passive income + tick.
  // ---------------------------------------------------------------------------
  function applyOfflineProgress() {
    // Idle income while away. Capped at 30 minutes so node output (which scales
    // with mastery and upgrades and can be thousands of credits/sec at the top
    // tiers) cannot silently hand out huge piles of cycles on a single reload.
    const elapsed = Math.max(0, Math.min((Date.now() - state.lastSaved) / 1000, 30 * 60));
    const earned = production() * elapsed + plotProduction() * elapsed;
    if (earned >= 1) {
      addCycles(earned);
      showFeedback(`OFFLINE PRODUCTION // +${number(earned)} CYC earned while you were away.`, "good");
    }
    // While away, some plots naturally wore out.
    const now = Date.now();
    state.plots.forEach((p) => { if (!p.broken && now >= p.nextBreak) p.broken = true; });
  }

  applyOfflineProgress();
  save();
  render();

  window.setInterval(() => {
    const now = Date.now();
    const elapsed = Math.min((now - lastFrame) / 1000, 2);
    lastFrame = now;
    state.plots.forEach((p) => { if (!p.broken && now >= p.nextBreak) p.broken = true; });
    addCycles(production() * elapsed);
    addCycles(plotProduction() * elapsed);
    headerStats();
    document.querySelectorAll("[data-action='buy-plot'], [data-action='repair-plot'], [data-action='buy-node'], [data-action='buy-upgrade'], [data-action='unlock-dept']").forEach((button) => {
      const action = button.dataset.action;
      if (action === "buy-plot") { const t = plotType(button.dataset.type); button.disabled = state.cycles < plotCost(t); }
      if (action === "repair-plot") { const plot = state.plots.find((x) => x.id === button.dataset.id); button.disabled = !plot || state.cycles < plot.repair; }
      if (action === "buy-node") { const dept = selectedDept(); button.disabled = state.cycles < nodeCost(dept); }
      if (action === "unlock-dept") { const d = DEPTS.find((x) => x.id === button.dataset.id); const index = DEPTS.indexOf(d); button.disabled = !d || state.cycles < d.cost || !previousUnlocked(index); }
      if (action === "buy-upgrade") { const upgrade = UPGRADES.find((item) => item.id === button.dataset.id); button.disabled = !upgrade || state.cycles < upgrade.cost; }
    });
  }, 500);
  window.setInterval(save, 10000);
  window.addEventListener("beforeunload", save);
})();