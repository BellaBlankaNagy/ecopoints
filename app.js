// EcoPoints — hackathon demo (client-only, data in localStorage)

// Category metadata (feature: Task category)
const CATEGORIES = [
  { id: "all",       name: "All",       icon: "🌍" },
  { id: "transport", name: "Transport", icon: "🚲" },
  { id: "food",      name: "Food",      icon: "🥦" },
  { id: "shopping",  name: "Shopping",  icon: "👕" },
  { id: "energy",    name: "Energy",    icon: "💡" },
  { id: "waste",     name: "Waste",     icon: "♻️" },
];

// Each activity has a category and, optionally, a partner venue that can
// confirm the action (feature: task validation with partnership/receipts).
const ACTIVITIES = [
  { id: "bike",      name: "🚲 Biked instead of driving",    pts: 20, co2: 2.0,  cat: "transport", partner: "CityBike stations" },
  { id: "transit",   name: "🚌 Took public transport",       pts: 10, co2: 1.2,  cat: "transport", partner: "Metro transit pass" },
  { id: "cup",       name: "☕ Used a reusable cup",          pts: 5,  co2: 0.05, cat: "waste",     partner: "GreenBean Café" },
  { id: "recycle",   name: "♻️ Recycled properly",           pts: 5,  co2: 0.3,  cat: "waste",     partner: null },
  { id: "veg",       name: "🥦 Ate a vegetarian meal",        pts: 10, co2: 1.5,  cat: "food",      partner: "Leafy Bowl restaurant" },
  { id: "secondhand",name: "👕 Bought second-hand",           pts: 15, co2: 3.0,  cat: "shopping",  partner: "ReWear thrift shop" },
  { id: "bottle",    name: "💧 Refilled a water bottle",      pts: 5,  co2: 0.08, cat: "waste",     partner: null },
  { id: "lights",    name: "💡 Cut standby / lights off day", pts: 5,  co2: 0.2,  cat: "energy",    partner: null },
];

const REWARDS = [
  { id: "coffee",  name: "☕ Free coffee at GreenBean Café",     cost: 50 },
  { id: "ticket",  name: "🚌 10% off a monthly transit pass",   cost: 120 },
  { id: "tree",    name: "🌳 We plant a tree in your name",     cost: 200 },
  { id: "cinema",  name: "🎬 2-for-1 cinema ticket",            cost: 150 },
];

const WEEK_GOAL = 150;
const VALIDATION_BONUS = 0.25; // validated actions earn +25% points
const HABIT_TARGET = 3;        // tracked habits: target times per week
const STORAGE_KEY = "ecopoints-demo";

// UI state (not persisted): current search text and category filter
let searchText = "";
let activeCategory = "all";
let pendingLogId = null; // activity awaiting validation choice

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (!Array.isArray(s.tracked)) s.tracked = []; // migrate older saves
      return s;
    }
  } catch (e) { /* corrupted or unavailable storage — start fresh */ }
  return { balance: 0, earned: 0, history: [], tracked: [] };
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* demo works without persistence */ }
}

// ---------- derived values ----------

function startOfWeek() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

function logEntries() {
  return state.history.filter(h => h.type === "log");
}

function weekPoints() {
  const from = startOfWeek();
  return state.history
    .filter(h => h.type === "log" && h.time >= from)
    .reduce((sum, h) => sum + h.pts, 0);
}

function streakDays() {
  const days = new Set(logEntries().map(h => new Date(h.time).toDateString()));
  let streak = 0;
  const d = new Date();
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function totalCo2() {
  return logEntries().reduce((sum, h) => sum + (h.co2 || 0), 0);
}

function validatedCount() {
  return logEntries().filter(h => h.validated).length;
}

// How many times a given activity was logged this week (for habit tracking)
function weekCount(activityId) {
  const from = startOfWeek();
  return logEntries().filter(h => h.id === activityId && h.time >= from).length;
}

// Leaf rating 0–5 (feature: Profile Leafs, like 5 stars).
// Rewards consistency (streak), trustworthiness (validation), and variety.
function leafScore() {
  const logs = logEntries();
  if (logs.length === 0) return 0;
  const streakLeaves = Math.min(2, streakDays() / 3);                 // up to 2
  const validRatio = validatedCount() / logs.length;
  const validLeaves = validRatio * 2;                                 // up to 2
  const cats = new Set(logs.map(h => h.cat).filter(Boolean));
  const varietyLeaves = Math.min(1, cats.size / 5);                   // up to 1
  return Math.min(5, streakLeaves + validLeaves + varietyLeaves);
}

// ---------- rendering ----------

function render() {
  // Home
  document.getElementById("points-balance").textContent = state.balance;
  document.getElementById("streak-days").textContent = streakDays();
  const wp = weekPoints();
  document.getElementById("week-points").textContent = wp;
  document.getElementById("week-goal").textContent = WEEK_GOAL;
  document.getElementById("week-fill").style.width = Math.min(100, (wp / WEEK_GOAL) * 100) + "%";

  // Impact
  const logs = logEntries();
  document.getElementById("impact-actions").textContent = logs.length;
  document.getElementById("impact-co2").textContent = totalCo2().toFixed(1) + " kg";
  document.getElementById("impact-earned").textContent = state.earned;

  // History
  const hist = document.getElementById("history-list");
  if (state.history.length === 0) {
    hist.innerHTML = '<li class="empty">Nothing logged yet — go to Log and record your first action!</li>';
  } else {
    hist.innerHTML = state.history
      .slice()
      .reverse()
      .slice(0, 20)
      .map(h => {
        const when = new Date(h.time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
        const badge = h.type === "log" && h.validated ? ' <span class="verified-badge" title="Validated">✓</span>' : "";
        const label = h.type === "log" ? `${h.name}${badge} <strong>+${h.pts}</strong>` : `${h.name} <strong>−${h.cost}</strong>`;
        return `<li><span>${label}</span><span class="when">${when}</span></li>`;
      })
      .join("");
  }

  // Rewards buttons enabled/disabled by balance
  document.querySelectorAll(".btn-redeem").forEach(btn => {
    btn.disabled = state.balance < Number(btn.dataset.cost);
  });

  renderProfile();
  renderActivities();
}

function renderProfile() {
  document.getElementById("profile-name").textContent =
    document.getElementById("user-name").textContent;

  const logs = logEntries();
  const score = leafScore();
  const full = Math.round(score);
  document.getElementById("leaf-rating").innerHTML =
    '<span class="leaf on">🌿</span>'.repeat(full) +
    '<span class="leaf off">🌿</span>'.repeat(5 - full);
  document.getElementById("leaf-score").textContent = score.toFixed(1);
  const blurb =
    score === 0 ? "start logging to grow your rating" :
    score < 2   ? "getting started — keep it up!" :
    score < 3.5 ? "solid eco habits forming 🌱" :
    score < 4.5 ? "great — validated and consistent!" :
                  "eco champion 🌟";
  document.getElementById("leaf-blurb").textContent = blurb;

  const vcount = validatedCount();
  document.getElementById("verified-count").textContent = vcount;
  document.getElementById("verified-rate").textContent =
    logs.length ? Math.round((vcount / logs.length) * 100) + "%" : "0%";
  document.getElementById("category-count").textContent =
    new Set(logs.map(h => h.cat).filter(Boolean)).size;

  // Tracked habits
  const tracker = document.getElementById("tracker-list");
  if (!state.tracked.length) {
    tracker.innerHTML = '<li class="empty">No habits tracked yet — tap ☆ on an action to start.</li>';
  } else {
    tracker.innerHTML = state.tracked.map(id => {
      const a = ACTIVITIES.find(x => x.id === id);
      if (!a) return "";
      const done = weekCount(id);
      const pct = Math.min(100, (done / HABIT_TARGET) * 100);
      const met = done >= HABIT_TARGET;
      return `
        <li>
          <div class="tracker-top">
            <span class="activity-name">${a.name}</span>
            <span class="tracker-count ${met ? "met" : ""}">${done}/${HABIT_TARGET}${met ? " ✓" : ""}</span>
          </div>
          <div class="week-bar"><div class="week-fill" style="width:${pct}%"></div></div>
        </li>`;
    }).join("");
  }
}

// Log screen list, filtered by search text + active category
function renderActivities() {
  const q = searchText.trim().toLowerCase();
  const list = ACTIVITIES.filter(a => {
    const inCat = activeCategory === "all" || a.cat === activeCategory;
    const inSearch = !q || a.name.toLowerCase().includes(q) ||
      (CATEGORIES.find(c => c.id === a.cat)?.name.toLowerCase().includes(q));
    return inCat && inSearch;
  });

  const el = document.getElementById("activity-list");
  document.getElementById("activity-empty").classList.toggle("hidden", list.length > 0);

  el.innerHTML = list.map(a => {
    const cat = CATEGORIES.find(c => c.id === a.cat);
    const tracked = state.tracked.includes(a.id);
    return `
      <li>
        <div class="activity-main">
          <div class="activity-name">${a.name}</div>
          <div class="activity-meta">
            <span class="cat-tag">${cat ? cat.icon + " " + cat.name : ""}</span>
            <span class="activity-co2">~${a.co2} kg CO₂ · +${a.pts} pts</span>
          </div>
        </div>
        <div class="activity-actions">
          <button class="track-toggle ${tracked ? "on" : ""}" data-track="${a.id}"
            title="${tracked ? "Untrack habit" : "Track as weekly habit"}">${tracked ? "★" : "☆"}</button>
          <button class="btn btn-log" data-id="${a.id}">Log it</button>
        </div>
      </li>`;
  }).join("");
}

function renderStatic() {
  // Suggestions (top 3 activities)
  document.getElementById("suggestions").innerHTML = ACTIVITIES.slice(0, 3)
    .map(a => `<li><span>${a.name}</span><span class="pts">+${a.pts} pts</span></li>`)
    .join("");

  // Category chips
  document.getElementById("category-chips").innerHTML = CATEGORIES
    .map(c => `<button class="chip ${c.id === activeCategory ? "active" : ""}" data-cat="${c.id}">${c.icon} ${c.name}</button>`)
    .join("");

  // Reward list
  document.getElementById("reward-list").innerHTML = REWARDS
    .map(r => `
      <li>
        <span class="activity-name">${r.name}</span>
        <button class="btn btn-redeem" data-id="${r.id}" data-cost="${r.cost}">${r.cost} pts</button>
      </li>`)
    .join("");
}

// ---------- validation flow ----------

function openValidation(id) {
  const a = ACTIVITIES.find(x => x.id === id);
  if (!a) return;
  pendingLogId = id;
  document.getElementById("validate-title").textContent = a.name;
  document.getElementById("validate-sub").textContent =
    `How can you confirm this? Validated actions earn +${Math.round(VALIDATION_BONUS * 100)}% points.`;

  const partnerBtn = document.querySelector('.validate-opt[data-method="partner"]');
  if (a.partner) {
    partnerBtn.classList.remove("hidden");
    document.getElementById("partner-name").textContent = "Confirm at " + a.partner;
  } else {
    partnerBtn.classList.add("hidden"); // no partner venue for this action
  }
  document.getElementById("validate-modal").classList.remove("hidden");
}

function closeValidation() {
  pendingLogId = null;
  document.getElementById("validate-modal").classList.add("hidden");
}

function logActivity(id, method) {
  const a = ACTIVITIES.find(x => x.id === id);
  if (!a) return;
  const validated = method === "partner" || method === "receipt";
  const bonus = validated ? Math.round(a.pts * VALIDATION_BONUS) : 0;
  const pts = a.pts + bonus;

  state.balance += pts;
  state.earned += pts;
  state.history.push({
    type: "log", id: a.id, name: a.name, pts, co2: a.co2, cat: a.cat,
    validated, method, time: Date.now(),
  });
  save();
  render();

  if (validated) {
    toast(`✓ Validated! +${pts} pts (incl. +${bonus} bonus) 🌱`);
  } else {
    toast(`+${pts} pts — nice one! 🌱`);
  }
}

function toggleTrack(id) {
  const i = state.tracked.indexOf(id);
  if (i === -1) {
    state.tracked.push(id);
    toast("Tracking this habit 📌");
  } else {
    state.tracked.splice(i, 1);
    toast("Habit untracked");
  }
  save();
  renderActivities();
  renderProfile();
}

function redeem(id) {
  const r = REWARDS.find(x => x.id === id);
  if (!r || state.balance < r.cost) return;
  state.balance -= r.cost;
  state.history.push({ type: "redeem", name: r.name, cost: r.cost, time: Date.now() });
  save();
  render();

  const code = "ECO-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  document.getElementById("coupon-text").textContent = r.name;
  document.getElementById("coupon-code").textContent = code;
  document.getElementById("coupon").classList.remove("hidden");
  toast("Reward redeemed! 🎉");
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 2200);
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("screen-" + name).classList.add("active");
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.screen === name));
}

// ---------- wiring ----------

document.querySelectorAll(".tab").forEach(t =>
  t.addEventListener("click", () => showScreen(t.dataset.screen))
);

// Search input (feature: Search)
const searchInput = document.getElementById("activity-search");
searchInput.addEventListener("input", () => {
  searchText = searchInput.value;
  document.getElementById("search-clear").classList.toggle("hidden", !searchText);
  renderActivities();
});
document.getElementById("search-clear").addEventListener("click", () => {
  searchInput.value = "";
  searchText = "";
  document.getElementById("search-clear").classList.add("hidden");
  renderActivities();
  searchInput.focus();
});

// Category chips
document.getElementById("category-chips").addEventListener("click", e => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  activeCategory = chip.dataset.cat;
  document.querySelectorAll("#category-chips .chip")
    .forEach(c => c.classList.toggle("active", c.dataset.cat === activeCategory));
  renderActivities();
});

// Activity list: log + track
document.addEventListener("click", e => {
  const trackBtn = e.target.closest(".track-toggle");
  if (trackBtn) { toggleTrack(trackBtn.dataset.track); return; }

  const logBtn = e.target.closest(".btn-log");
  if (logBtn) { openValidation(logBtn.dataset.id); return; }

  const redeemBtn = e.target.closest(".btn-redeem");
  if (redeemBtn) redeem(redeemBtn.dataset.id);
});

// Validation modal
document.querySelectorAll(".validate-opt").forEach(btn =>
  btn.addEventListener("click", () => {
    if (pendingLogId) {
      const id = pendingLogId;
      const method = btn.dataset.method;
      closeValidation();
      logActivity(id, method);
    }
  })
);
document.getElementById("validate-cancel").addEventListener("click", closeValidation);
document.getElementById("validate-modal").addEventListener("click", e => {
  if (e.target.id === "validate-modal") closeValidation(); // click backdrop to dismiss
});

document.getElementById("reset-btn").addEventListener("click", () => {
  state = { balance: 0, earned: 0, history: [], tracked: [] };
  save();
  document.getElementById("coupon").classList.add("hidden");
  render();
  toast("Demo data reset");
});

renderStatic();
render();
