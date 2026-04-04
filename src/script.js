/* ══════════════════════════════════════════════════════════
   SprintSim — script.js
   Logique complète du jeu hybride de sprint Agile
══════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────── DONNÉES DU JEU

const WEEK_CARDS = [
  {
    id: 1,
    text: "Motivating kickoff! The team is pumped, coffee is free, and the Product Owner is (exceptionally) available.",
    effect: "+1 happiness if normal work",
    type: "positive"
  },
  {
    id: 2,
    text: "3-hour unproductive meeting to decide on the README font. Nobody dared to say stop.",
    effect: "−1 happiness if intensive work",
    type: "negative"
  },
  {
    id: 3,
    text: "Extended coffee break. The mysterious bug resolved itself while no one was looking.",
    effect: "No effect (well-deserved rest)",
    type: "neutral"
  },
  {
    id: 4,
    text: "Positive client feedback! The client said \"not bad\" — which, in this industry, is equivalent to a standing ovation.",
    effect: "+1 happiness for all",
    type: "positive"
  },
  {
    id: 5,
    text: "Critical bugs discovered in production. The tester was on vacation. Git blame points to someone who left the company in 2019.",
    effect: "−1 happiness if intensive work",
    type: "negative"
  },
  {
    id: 6,
    text: "Final stretch. Team spirit reaches its peak. Someone ordered pizzas. Technical debt will be \"handled later\".",
    effect: "+1 happiness if normal work",
    type: "positive"
  },
  {
    id: 7,
    text: "Delivery! The project is in production. There are 3 TODOs left in the code, but we'll call them 'future features'.",
    effect: "+2 happiness if goal achieved",
    type: "positive"
  }
];

const EFFECT_ICONS = {
  positive: "✦",
  negative: "✖",
  neutral: "◎"
};

const END_QUOTES = [
  "\"We delivered on time. It's historic.\" — Product Owner, with tears in their eyes",
  "\"The definition of 'Done' was maybe a bit... fuzzy. But it's done.\" — Scrum Master",
  "\"The client said it looks like what they asked for. More or less.\" — Dev Lead",
  "\"Sprint completed successfully. The team will survive. For now.\" — Management",
  "\"Git log shows 47 commits of type 'fix: fix the fix'. That's discipline.\" — Tech Lead"
];

// ─────────────────────────────────────────── ÉTAT DU JEU

let state = {
  company: "",
  project: "",
  goal: "",
  players: [],          // [{ name, happiness }]
  currentWeek: 1,       // 1–7
  weekRevealed: false,
  gameOver: false,
  playerCount: 3
};

// ─────────────────────────────────────────── SETUP

function adjustPlayerCount(delta) {
  state.playerCount = Math.min(5, Math.max(3, state.playerCount + delta));
  document.getElementById("player-count-display").textContent = state.playerCount;
  document.getElementById("count-minus").disabled = state.playerCount <= 3;
  document.getElementById("count-plus").disabled  = state.playerCount >= 5;
  renderPlayerInputs();
}

function renderPlayerInputs() {
  const container = document.getElementById("player-names-container");
  container.innerHTML = "";
  for (let i = 1; i <= state.playerCount; i++) {
    const existing = container.querySelector(`#player-input-${i}`);
    const val = existing ? existing.value : "";
    const group = document.createElement("div");
    group.className = "player-input-group";
    group.innerHTML = `
      <label class="player-num-label">P${i}</label>
      <input type="text" id="player-input-${i}" class="field-input"
             placeholder="Player ${i}" value="${val}" maxlength="18" />
    `;
    container.appendChild(group);
  }
}

function startGame() {
  // Récupérer l'entreprise
  const companySelect = document.getElementById("company-name").value;
  const companyCustom = document.getElementById("company-custom").value.trim();
  state.company = companySelect === "custom"
    ? (companyCustom || "Mon Entreprise")
    : companySelect;

  state.project = document.getElementById("project-name").value.trim() || "Mystery Project";
  state.goal = document.getElementById("project-goal").value.trim() || "20";

  // Players
  state.players = [];
  for (let i = 1; i <= state.playerCount; i++) {
    const name = document.getElementById(`player-input-${i}`).value.trim() || `Player ${i}`;
    state.players.push({ name, happiness: 7 });
  }

  state.currentWeek = 1;
  state.weekRevealed = false;
  state.gameOver = false;

  // Afficher écran de jeu
  showScreen("screen-game");
  renderGameUI();
}

// ─────────────────────────────────────────── GAME UI

function renderGameUI() {
  // Topbar
  document.getElementById("display-company").textContent = state.company;
  document.getElementById("display-project").textContent = state.project;
  document.getElementById("display-goal").textContent = state.goal;
  document.getElementById("current-week-display").textContent = state.currentWeek;

  // Week tracker dots
  renderWeekDots();

  // Week card (reset to front)
  resetWeekCard();

  // Players
  renderPlayers();

  // Button label
  const btn = document.getElementById("btn-end-week-label");
  btn.textContent = state.currentWeek < 7 ? "End Week" : "Complete Sprint";
}

function renderWeekDots() {
  const tracker = document.getElementById("week-tracker");
  tracker.innerHTML = "";
  for (let i = 1; i <= 7; i++) {
    const dot = document.createElement("div");
    dot.className = "week-dot";
    if (i < state.currentWeek) dot.classList.add("done");
    if (i === state.currentWeek) dot.classList.add("current");
    tracker.appendChild(dot);
  }
}

function resetWeekCard() {
  const card = document.getElementById("week-card");
  card.classList.remove("revealed");
  state.weekRevealed = false;
  document.getElementById("week-card-hint").textContent = "Cliquez pour révéler";
}

function renderPlayers() {
  const list = document.getElementById("players-list");
  list.innerHTML = "";
  state.players.forEach((player, idx) => {
    const row = document.createElement("div");
    row.className = "player-row";
    row.id = `player-row-${idx}`;

    const initials = player.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const hapClass = getHappinessClass(player.happiness);
    const barPct   = getBarPercent(player.happiness);
    const barClass = hapClass;

    row.innerHTML = `
      <div class="player-avatar">${initials}</div>
      <div class="player-info">
        <div class="player-name">${escapeHtml(player.name)}</div>
        <div class="player-happiness-label">Happiness</div>
      </div>
      <div class="happiness-bar-wrap">
        <div class="happiness-bar">
          <div class="happiness-bar-fill ${barClass}" id="bar-fill-${idx}"
               style="width: ${barPct}%"></div>
        </div>
      </div>
      <div class="happiness-display">
        <span class="happiness-value ${hapClass}" id="happiness-val-${idx}">${player.happiness}</span>
      </div>
      <div class="player-btns">
        <button class="hap-btn plus"  onclick="adjustHappiness(${idx}, 1)"  title="+1 happiness">+</button>
        <button class="hap-btn minus" onclick="adjustHappiness(${idx}, -1)" title="−1 happiness">−</button>
        <button class="hap-btn rest"  onclick="adjustHappiness(${idx}, 0)"  title="Rest">ZZZ</button>
      </div>
    `;
    list.appendChild(row);
  });
}

function updatePlayerDisplay(idx) {
  const player = state.players[idx];
  const hapClass = getHappinessClass(player.happiness);
  const barPct   = getBarPercent(player.happiness);

  const valEl = document.getElementById(`happiness-val-${idx}`);
  const barEl = document.getElementById(`bar-fill-${idx}`);

  if (valEl) {
    valEl.textContent = player.happiness;
    valEl.className = `happiness-value ${hapClass} pop`;
    setTimeout(() => valEl.classList.remove("pop"), 300);
  }
  if (barEl) {
    barEl.style.width = `${barPct}%`;
    barEl.className = `happiness-bar-fill ${hapClass}`;
  }
}

// ─────────────────────────────────────────── WEEK CARD

function revealWeekCard() {
  if (state.weekRevealed) return;
  state.weekRevealed = true;

  const card     = document.getElementById("week-card");
  const weekData = WEEK_CARDS[state.currentWeek - 1];

  // Remplir le dos de la carte
  document.getElementById("card-week-num").textContent = `S${state.currentWeek}`;
  document.getElementById("week-card-text").textContent = weekData.text;

  const effectEl = document.getElementById("week-card-effect");
  document.getElementById("effect-icon").textContent = EFFECT_ICONS[weekData.type] || "●";
  document.getElementById("effect-text").textContent = weekData.effect;
  effectEl.className = `week-card-effect ${weekData.type}`;

  card.classList.add("revealed");
  document.getElementById("week-card-hint").textContent = "Carte révélée";
}

// ─────────────────────────────────────────── HAPPINESS

function adjustHappiness(playerIdx, delta) {
  state.players[playerIdx].happiness += delta;
  updatePlayerDisplay(playerIdx);
}

function applyMondayBlues() {
  state.players.forEach((player, idx) => {
    player.happiness -= 1;
    updatePlayerDisplay(idx);
  });
}

// ─────────────────────────────────────────── END WEEK

function endWeek() {
  // Apply Monday Blues
  applyMondayBlues();

  // Show toast
  showToast("Monday Blues: −1 happiness applied to all ☕");

  if (state.currentWeek >= 7) {
    // Fin de partie
    setTimeout(() => showEndScreen(), 1200);
  } else {
    state.currentWeek++;
    setTimeout(() => renderGameUI(), 800);
  }
}

// ─────────────────────────────────────────── END SCREEN

function showEndScreen() {
  showScreen("screen-end");

  document.getElementById("end-subtitle").textContent =
    `${state.company} · ${state.project} · 7 weeks of sprint`;

  const scoresEl = document.getElementById("end-scores");
  scoresEl.innerHTML = "";
  state.players.forEach(player => {
    const h = player.happiness;
    let cls = "high", emoji = "🏆";
    if (h < 5) { cls = "low"; emoji = "😵"; }
    else if (h < 7) { cls = "mid"; emoji = "😐"; }
    else if (h >= 9) emoji = "🌟";
    else emoji = "😊";

    const row = document.createElement("div");
    row.className = "end-score-row";
    row.innerHTML = `
      <span class="end-score-name">${escapeHtml(player.name)}</span>
      <span class="end-score-value ${cls}">${h} / 10 <span class="end-score-emoji">${emoji}</span></span>
    `;
    scoresEl.appendChild(row);
  });

  const quote = END_QUOTES[Math.floor(Math.random() * END_QUOTES.length)];
  document.getElementById("end-quote").textContent = quote;
}

// ─────────────────────────────────────────── RESTART

function restartGame() {
  // Réinitialise l'état mais garde les noms / config
  showScreen("screen-setup");
}

// ─────────────────────────────────────────── TOAST

let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById("toast");
  document.getElementById("toast-text").textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

// ─────────────────────────────────────────── HELPERS

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function getHappinessClass(h) {
  if (h < 0)  return "negative";
  if (h < 4)  return "negative";
  if (h < 6)  return "warning";
  if (h < 8)  return "";         // neutral/default blue
  return "positive";
}

function getBarPercent(h) {
  // Plage d'affichage : -3 à 13 → 0% à 100%
  const min = -3, max = 13;
  const clamped = Math.min(max, Math.max(min, h));
  return Math.round(((clamped - min) / (max - min)) * 100);
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─────────────────────────────────────────── INIT

document.addEventListener("DOMContentLoaded", () => {
  // Setup initial
  renderPlayerInputs();
  document.getElementById("count-minus").disabled = true; // 3 min

  // Gestion select entreprise
  document.getElementById("company-name").addEventListener("change", function () {
    const customInput = document.getElementById("company-custom");
    if (this.value === "custom") {
      customInput.classList.remove("hidden");
      customInput.focus();
    } else {
      customInput.classList.add("hidden");
    }
  });
});
