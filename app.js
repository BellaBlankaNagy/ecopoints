// EcoPoints — hackathon demo (client-only, data in localStorage)

const ACTIVITIES = [
  { id: "bike",      name: "🚲 Biked instead of driving",      pts: 20, co2: 2.0,  cat: "transport" },
  { id: "transit",   name: "🚌 Took public transport",         pts: 10, co2: 1.2,  cat: "transport" },
  { id: "cup",       name: "☕ Used a reusable cup",            pts: 5,  co2: 0.05, cat: "waste" },
  { id: "recycle",   name: "♻️ Recycled properly",             pts: 5,  co2: 0.3,  cat: "waste" },
  { id: "veg",       name: "🥦 Ate a vegetarian meal",          pts: 10, co2: 1.5,  cat: "food" },
  { id: "secondhand",name: "👕 Bought second-hand",             pts: 15, co2: 3.0,  cat: "shopping" },
  { id: "bottle",    name: "💧 Refilled a water bottle",        pts: 5,  co2: 0.08, cat: "waste" },
  { id: "lights",    name: "💡 Cut standby / lights off day",   pts: 5,  co2: 0.2,  cat: "home" },
];

// Task categories for the Log screen filter. "all" is the default chip.
const CATEGORIES = [
  { id: "all",       label: "🌍 All" },
  { id: "transport", label: "🚲 Transport" },
  { id: "food",      label: "🥦 Food" },
  { id: "shopping",  label: "🛍️ Shopping" },
  { id: "waste",     label: "♻️ Waste" },
  { id: "home",      label: "🏠 Home" },
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]));

const REWARDS = [
  { id: "coffee",  name: "☕ Free coffee at GreenBean Café",     cost: 50 },
  { id: "ticket",  name: "🚌 10% off a monthly transit pass",   cost: 120 },
  { id: "tree",    name: "🌳 We plant a tree in your name",     cost: 200 },
  { id: "cinema",  name: "🎬 2-for-1 cinema ticket",            cost: 150 },
];

const WEEK_GOAL = 150;
const STORAGE_KEY = "ecopoints-demo";

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* corrupted or unavailable storage — start fresh */ }
  return { balance: 0, earned: 0, history: [] };
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

function weekPoints() {
  const from = startOfWeek();
  return state.history
    .filter(h => h.type === "log" && h.time >= from)
    .reduce((sum, h) => sum + h.pts, 0);
}

function streakDays() {
  const days = new Set(
    state.history.filter(h => h.type === "log").map(h => new Date(h.time).toDateString())
  );
  let streak = 0;
  const d = new Date();
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function totalCo2() {
  return state.history
    .filter(h => h.type === "log")
    .reduce((sum, h) => sum + (h.co2 || 0), 0);
}

// Eco rating on a 5-leaf scale (5-star method), earned from total points.
const RATING_TIERS = [
  { min: 500, leaves: 5, name: "Eco Champion 🌟" },
  { min: 300, leaves: 4, name: "Eco Hero" },
  { min: 150, leaves: 3, name: "Grower" },
  { min: 75,  leaves: 2, name: "Sprout" },
  { min: 25,  leaves: 1, name: "Seedling" },
  { min: 0,   leaves: 0, name: "Just getting started" },
];

function ecoRating() {
  const tier = RATING_TIERS.find(t => state.earned >= t.min);
  const nextThreshold = RATING_TIERS
    .map(t => t.min)
    .filter(min => min > state.earned)
    .sort((a, b) => a - b)[0];
  return { ...tier, nextThreshold };
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
  const logs = state.history.filter(h => h.type === "log");
  document.getElementById("impact-actions").textContent = logs.length;
  document.getElementById("impact-co2").textContent = totalCo2().toFixed(1) + " kg";
  document.getElementById("impact-earned").textContent = state.earned;

  // Eco rating (5 leaves)
  const r = ecoRating();
  document.getElementById("rating-leaves").innerHTML = Array.from({ length: 5 }, (_, i) =>
    `<span class="${i < r.leaves ? "leaf-on" : "leaf-off"}">🍃</span>`).join("");
  document.getElementById("rating-tier").textContent = r.name;
  document.getElementById("rating-detail").textContent = r.nextThreshold
    ? `${r.nextThreshold - state.earned} pts to next leaf`
    : "top rating reached";

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
        const label = h.type === "log" ? `${h.name} <strong>+${h.pts}</strong>` : `${h.name} <strong>−${h.cost}</strong>`;
        return `<li><span>${label}</span><span class="when">${when}</span></li>`;
      })
      .join("");
  }

  // Rewards buttons enabled/disabled by balance
  document.querySelectorAll(".btn-redeem").forEach(btn => {
    btn.disabled = state.balance < Number(btn.dataset.cost);
  });
}

// Log-screen filter state
let activeCategory = "all";
let searchTerm = "";

function renderCategoryChips() {
  document.getElementById("category-filter").innerHTML = CATEGORIES
    .map(c => `<button class="chip${c.id === activeCategory ? " active" : ""}" data-cat="${c.id}">${c.label}</button>`)
    .join("");
}

function renderActivities() {
  const q = searchTerm.trim().toLowerCase();
  const shown = ACTIVITIES.filter(a =>
    (activeCategory === "all" || a.cat === activeCategory) &&
    (q === "" || a.name.toLowerCase().includes(q))
  );

  document.getElementById("activity-list").innerHTML = shown
    .map(a => `
      <li>
        <div>
          <div class="activity-name">${a.name}</div>
          <div class="activity-co2">~${a.co2} kg CO₂ avoided · +${a.pts} pts</div>
          <span class="activity-cat">${CATEGORY_LABEL[a.cat]}</span>
        </div>
        <button class="btn btn-log" data-id="${a.id}">Log it</button>
      </li>`)
    .join("");

  document.getElementById("no-results").classList.toggle("hidden", shown.length > 0);
}

function renderStatic() {
  // Suggestions (top 3 activities)
  document.getElementById("suggestions").innerHTML = ACTIVITIES.slice(0, 3)
    .map(a => `<li><span>${a.name}</span><span class="pts">+${a.pts} pts</span></li>`)
    .join("");

  renderCategoryChips();
  renderActivities();

  // Reward list
  document.getElementById("reward-list").innerHTML = REWARDS
    .map(r => `
      <li>
        <span class="activity-name">${r.name}</span>
        <button class="btn btn-redeem" data-id="${r.id}" data-cost="${r.cost}">${r.cost} pts</button>
      </li>`)
    .join("");
}

// ---------- actions ----------

function logActivity(id) {
  const a = ACTIVITIES.find(x => x.id === id);
  if (!a) return;
  state.balance += a.pts;
  state.earned += a.pts;
  state.history.push({ type: "log", name: a.name, pts: a.pts, co2: a.co2, time: Date.now() });
  save();
  render();
  toast(`+${a.pts} pts — nice one! 🌱`);
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

// Live search over eco actions
document.getElementById("activity-search").addEventListener("input", e => {
  searchTerm = e.target.value;
  renderActivities();
});

// Category filter chips
document.getElementById("category-filter").addEventListener("click", e => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  activeCategory = chip.dataset.cat;
  renderCategoryChips();
  renderActivities();
});

document.addEventListener("click", e => {
  const logBtn = e.target.closest(".btn-log");
  if (logBtn) logActivity(logBtn.dataset.id);
  const redeemBtn = e.target.closest(".btn-redeem");
  if (redeemBtn) redeem(redeemBtn.dataset.id);
});

document.getElementById("reset-btn").addEventListener("click", () => {
  state = { balance: 0, earned: 0, history: [] };
  save();
  document.getElementById("coupon").classList.add("hidden");
  render();
  toast("Demo data reset");
});

renderStatic();
render();
