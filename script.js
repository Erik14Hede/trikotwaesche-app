'use strict';

/* =========================
   STORAGE KEYS
========================= */
const K_PLAYERS = 'players';
const K_WASHED = 'alreadyWashed';
const K_HISTORY = 'history';
const K_LAST_SUBS = 'lastSubs';
const K_SELECTED = 'selectedKader';
const K_PENDING = 'pendingDraw';

const K_BOARD = 'tacticBoardState';
const K_BOARD_FORMATIONS = 'tacticBoardFormations';
const K_BOARD_COLOR = 'tacticBoardColor';

/* =========================
   STATE
========================= */
let players = load(K_PLAYERS, []);
let alreadyWashed = load(K_WASHED, []);
let history = load(K_HISTORY, []);
let lastSubs = load(K_LAST_SUBS, []);
let selectedKader = load(K_SELECTED, []);
let pending = load(K_PENDING, null);

let boardPlayers = load(K_BOARD, []);
let boardFormations = load(K_BOARD_FORMATIONS, {});
let boardTeamColor = load(K_BOARD_COLOR, 'home'); // home | away
let activeTab = 'wash';

/* =========================
   HELPERS
========================= */
function load(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uniq(arr) {
  return [...new Set(arr)];
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function randomId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveBoard() {
  save(K_BOARD, boardPlayers);
}

function saveBoardFormations() {
  save(K_BOARD_FORMATIONS, boardFormations);
}

function saveBoardColor() {
  save(K_BOARD_COLOR, boardTeamColor);
}

function persistAll() {
  save(K_PLAYERS, players);
  save(K_WASHED, alreadyWashed);
  save(K_HISTORY, history);
  save(K_LAST_SUBS, lastSubs);
  save(K_SELECTED, selectedKader);
  save(K_PENDING, pending);
  saveBoard();
  saveBoardFormations();
  saveBoardColor();
}

/* =========================
   DYNAMIC STYLES
========================= */
function injectBoardStyles() {
  if (document.getElementById('dynamic-board-styles')) return;

  const style = document.createElement('style');
  style.id = 'dynamic-board-styles';
  style.textContent = `
    .tabs { display:flex; gap:8px; flex-wrap:wrap; }
    .uploadLabel { display:inline-flex; align-items:center; justify-content:center; }
    .board-toolbar { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
    .board-toolbar select { width:auto; min-width:180px; }
    .board-split { display:flex; flex-direction:column; gap:12px; }
    .tactic-board-wrap { width:100%; }
    .tactic-board {
      position:relative;
      width:100%;
      aspect-ratio: 2 / 3;
      border-radius:16px;
      overflow:hidden;
      background:
        repeating-linear-gradient(
          to bottom,
          #4c9a15 0%,
          #4c9a15 12.5%,
          #5eae1d 12.5%,
          #5eae1d 25%
        );
      border:4px solid #fff;
      touch-action:none;
    }
    .pitch-line-half {
      position:absolute;
      left:0; top:50%;
      width:100%; height:4px;
      background:#fff;
      transform:translateY(-50%);
    }
    .pitch-circle {
      position:absolute;
      left:50%; top:50%;
      width:18%; aspect-ratio:1;
      border:4px solid #fff;
      border-radius:50%;
      transform:translate(-50%, -50%);
    }
    .pitch-box {
      position:absolute;
      left:20%;
      width:60%;
      height:16%;
      border:4px solid #fff;
    }
    .pitch-box.top { top:0; border-top:0; }
    .pitch-box.bottom { bottom:0; border-bottom:0; }
    .pitch-goal {
      position:absolute;
      left:42%;
      width:16%;
      height:4%;
      border:3px solid #fff;
    }
    .pitch-goal.top { top:0; transform:translateY(-45%); }
    .pitch-goal.bottom { bottom:0; transform:translateY(45%); }

    #boardPlayersLayer {
      position:absolute;
      inset:0;
    }

    .board-player {
      position:absolute;
      transform:translate(-50%, -50%);
      display:flex;
      flex-direction:column;
      align-items:center;
      user-select:none;
      touch-action:none;
      z-index:3;
    }

    .board-player.bench {
      position:relative;
      transform:none;
      left:auto !important;
      top:auto !important;
      margin:0 8px 8px 0;
      display:inline-flex;
    }

    .board-marker {
      width:42px;
      height:42px;
      border-radius:50%;
      color:#fff;
      border:2px solid #111;
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:700;
      font-size:1rem;
      box-shadow:0 2px 8px rgba(0,0,0,.25);
    }

    .board-player.home .board-marker { background:#d40000; }
    .board-player.away .board-marker { background:#0038d4; }

    .board-label {
      margin-top:4px;
      padding:2px 6px;
      border-radius:8px;
      background:rgba(0,0,0,.28);
      color:#fff6bf;
      font-size:.92rem;
      white-space:nowrap;
      max-width:120px;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .bench-area {
      min-height:90px;
      border:2px dashed #cdd6e6;
      border-radius:14px;
      padding:10px;
      background:#f7f9fd;
    }

    .bench-title {
      margin:0 0 8px;
      font-size:.95rem;
      color:#4b5d7a;
    }

    .bench-players {
      display:flex;
      flex-wrap:wrap;
      align-items:flex-start;
    }

    .formation-list {
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      margin-top:8px;
    }

    .small-btn {
      padding:8px 10px;
      border-radius:10px;
      border:0;
      cursor:pointer;
    }

    .board-note {
      font-size:.9rem;
      color:#5a6c87;
      margin-top:8px;
    }
  `;
  document.head.appendChild(style);
}

/* =========================
   APP RENDER
========================= */
function renderApp() {
  injectBoardStyles();

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="container">
      <div class="card">
        <h1>Trikotwäsche</h1>
        <small class="muted">Installierbar & offline nutzbar. Daten bleiben lokal auf deinem Gerät.</small>
      </div>

      <div class="card">
        <div class="tabs">
          <button class="${activeTab === 'wash' ? '' : 'secondary'}" id="tabWash">Waschdienst</button>
          <button class="${activeTab === 'history' ? '' : 'secondary'}" id="tabHistory">Historie</button>
          <button class="${activeTab === 'board' ? '' : 'secondary'}" id="tabBoard">Taktikboard</button>
        </div>
      </div>

      <div id="tabWashPanel" class="${activeTab === 'wash' ? '' : 'hidden'}">
        <div class="card">
          <h2>Spieler verwalten <span class="counter" id="countAll">0</span></h2>
          <div class="row">
            <textarea id="importTextarea" rows="3" placeholder="Spieler einfügen – ein Name pro Zeile"></textarea>
            <button class="secondary" id="btnImportNames">Namen importieren</button>
          </div>
          <ul class="list" id="playerList"></ul>
        </div>

        <div class="card">
          <h2>Kader auswählen
            <span class="counter">ausgewählt: <span id="countSelected">0</span></span>
            <span class="counter">im Kader: <span id="countKader">0</span></span>
          </h2>
          <small class="muted">Bereits gewaschene im Kader sind mit ✅ markiert und werden bei der Ziehung ignoriert.</small>
          <ul class="list" id="kaderList"></ul>
          <div class="row">
            <button id="btnDraw">🎲 Waschdienst auslosen</button>
            <button class="secondary" id="btnExport">📤 Export</button>
            <label class="secondary uploadLabel">
              📥 Import <input id="fileImport" type="file" accept="application/json" style="display:none;">
            </label>
          </div>
        </div>

        <div class="card ${pending ? '' : 'hidden'}" id="panelResult">
          <h2>Ausgelost</h2>
          <div id="result">
            <p><strong>Waschdienst:</strong> <span id="main"></span></p>
            <p><strong>Stellvertreter:</strong> <span id="subs"></span></p>
          </div>
          <h3>Wer hat wirklich gewaschen?</h3>
          <select id="actualWasherSelect"></select>
          <div class="row">
            <button id="btnConfirm">✅ Speichern</button>
            <button class="secondary" id="btnScreenshot">📸 Screenshot</button>
            <button class="secondary" id="btnCancelPending">Abbrechen</button>
          </div>
        </div>
      </div>

      <div id="tabHistoryPanel" class="${activeTab === 'history' ? '' : 'hidden'}">
        <div class="card">
          <h2>Historie</h2>
          <ul class="list" id="historyList"></ul>
        </div>
      </div>

      <div id="tabBoardPanel" class="${activeTab === 'board' ? '' : 'hidden'}">
        <div class="card">
          <h2>Taktikboard</h2>
          <small class="muted">Spieler antippen zum Bearbeiten. Marker ziehen zum Verschieben. Bankspieler separat unten.</small>

          <div class="board-toolbar">
            <button id="btnBoardLoadKader">Aktuellen Kader laden</button>
            <button class="secondary" id="btnBoardAddPlayer">Spieler hinzufügen</button>
            <button class="secondary" id="btnBoardAddFromList">Aus Liste hinzufügen</button>
            <button class="secondary" id="btnBoardReset">Zurücksetzen</button>
            <button class="secondary" id="btnBoardScreenshot">📸 Screenshot</button>
          </div>

          <div class="board-toolbar">
            <button class="${boardTeamColor === 'home' ? '' : 'secondary'}" id="btnColorHome">Heim</button>
            <button class="${boardTeamColor === 'away' ? '' : 'secondary'}" id="btnColorAway">Auswärts</button>

            <input id="formationNameInput" type="text" placeholder="Aufstellung speichern unter..." style="max-width:240px;">
            <button class="secondary" id="btnSaveFormation">Aufstellung speichern</button>

            <select id="formationSelect">
              <option value="">Aufstellung wählen</option>
            </select>
            <button class="secondary" id="btnLoadFormation">Laden</button>
            <button class="secondary" id="btnDeleteFormation">Löschen</button>
          </div>

          <div class="board-note">
            Tipp: Im Bearbeiten-Dialog kannst du Spieler auf die Bank setzen oder wieder aufs Feld holen.
          </div>
        </div>

        <div class="card board-split">
          <div class="tactic-board-wrap">
            <div id="tacticBoard" class="tactic-board">
              <div class="pitch-line-half"></div>
              <div class="pitch-circle"></div>
              <div class="pitch-box top"></div>
              <div class="pitch-box bottom"></div>
              <div class="pitch-goal top"></div>
              <div class="pitch-goal bottom"></div>
              <div id="boardPlayersLayer"></div>
            </div>
          </div>

          <div class="bench-area">
            <div class="bench-title">Bank</div>
            <div id="benchPlayers" class="bench-players"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  bindMainEvents();

  if (pending && document.getElementById('panelResult')) {
    populateResultPanel(pending);
  }

  renderPlayers();
  renderKader();
  renderHistory();
  renderBoard();
  renderFormationOptions();
}

function bindMainEvents() {
  document.getElementById('tabWash').onclick = () => switchTab('wash');
  document.getElementById('tabHistory').onclick = () => switchTab('history');
  document.getElementById('tabBoard').onclick = () => switchTab('board');

  const btnImportNames = document.getElementById('btnImportNames');
  if (btnImportNames) {
    btnImportNames.onclick = importNames;
    document.getElementById('btnDraw').onclick = drawWaschdienst;
    document.getElementById('btnExport').onclick = exportData;
    document.getElementById('fileImport').onchange = importData;
  }

  const btnBoardLoadKader = document.getElementById('btnBoardLoadKader');
  if (btnBoardLoadKader) {
    btnBoardLoadKader.onclick = loadSelectedKaderToBoard;
    document.getElementById('btnBoardAddPlayer').onclick = addBoardPlayerManually;
    document.getElementById('btnBoardAddFromList').onclick = addBoardPlayerFromList;
    document.getElementById('btnBoardReset').onclick = resetBoard;
    document.getElementById('btnBoardScreenshot').onclick = captureBoardScreenshot;

    document.getElementById('btnColorHome').onclick = () => setBoardColor('home');
    document.getElementById('btnColorAway').onclick = () => setBoardColor('away');

    document.getElementById('btnSaveFormation').onclick = saveCurrentFormation;
    document.getElementById('btnLoadFormation').onclick = loadSelectedFormation;
    document.getElementById('btnDeleteFormation').onclick = deleteSelectedFormation;
  }
}

/* =========================
   TABS
========================= */
function switchTab(tab) {
  activeTab = tab;
  renderApp();
}

/* =========================
   PLAYERS / KADER
========================= */
function importNames() {
  const ta = document.getElementById('importTextarea');
  const names = ta.value
    .split('\n')
    .map(n => n.trim())
    .filter(Boolean);

  if (!names.length) return;

  players = uniq([...players, ...names]);
  save(K_PLAYERS, players);
  ta.value = '';

  renderPlayers();
  renderKader();
}

function renderPlayers() {
  const ul = document.getElementById('playerList');
  if (!ul) return;

  ul.innerHTML = '';

  players.forEach(name => {
    const checked = selectedKader.includes(name) ? 'checked' : '';
    const li = document.createElement('li');
    li.innerHTML = `
      <label style="flex:1;display:flex;align-items:center;gap:8px;">
        <input type="checkbox" data-name="${escapeHtml(name)}" ${checked} />
        <span>${escapeHtml(name)}</span>
      </label>
      <button class="danger" data-del="${escapeHtml(name)}">❌</button>
    `;
    ul.appendChild(li);
  });

  ul.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      const name = cb.dataset.name;
      if (cb.checked && !selectedKader.includes(name)) {
        selectedKader.push(name);
      } else if (!cb.checked) {
        selectedKader = selectedKader.filter(n => n !== name);
      }
      save(K_SELECTED, selectedKader);
      renderKader();
      renderPlayers();
    });
  });

  ul.querySelectorAll('button[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.del;
      if (!confirm(`${name} wirklich löschen?`)) return;

      players = players.filter(n => n !== name);
      selectedKader = selectedKader.filter(n => n !== name);
      alreadyWashed = alreadyWashed.filter(n => n !== name);
      boardPlayers = boardPlayers.filter(p => p.name !== name);

      persistAll();
      renderPlayers();
      renderKader();
      renderBoard();
    });
  });

  const countAll = document.getElementById('countAll');
  const countSelected = document.getElementById('countSelected');
  if (countAll) countAll.textContent = players.length;
  if (countSelected) countSelected.textContent = selectedKader.length;
}

function renderKader() {
  const ul = document.getElementById('kaderList');
  if (!ul) return;

  ul.innerHTML = '';
  const selected = selectedKader.filter(n => players.includes(n));

  selected.forEach(name => {
    const washed = alreadyWashed.includes(name);
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${escapeHtml(name)} ${washed ? '<span class="badge">✅ gewaschen</span>' : '<span class="badge">🕒 offen</span>'}</span>
    `;
    ul.appendChild(li);
  });

  const countKader = document.getElementById('countKader');
  if (countKader) countKader.textContent = selected.length;
}

/* =========================
   WASH LOGIC
========================= */
function drawWaschdienst() {
  const selected = selectedKader.filter(n => players.includes(n));

  if (selected.length < 3) {
    alert('Bitte mindestens 3 Spieler im Kader auswählen.');
    return;
  }

  const washedInKader = alreadyWashed.filter(name => selected.includes(name));
  let eligible = selected.filter(name => !washedInKader.includes(name));

  if (eligible.length < 3) {
    alreadyWashed = alreadyWashed.filter(name => !selected.includes(name));
    save(K_WASHED, alreadyWashed);
    eligible = [...selected];
  }

  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const main = shuffled[0];

  let subPool = shuffled.slice(1).filter(name => !lastSubs.includes(name));
  if (subPool.length < 2) {
    subPool = shuffled.slice(1);
  }
  const subs = subPool.slice(0, 2);

  pending = {
    date: today(),
    kader: selected,
    chosen: { main, subs }
  };
  save(K_PENDING, pending);

  populateResultPanel(pending);

  const panel = document.getElementById('panelResult');
  if (panel) panel.classList.remove('hidden');
}

function populateResultPanel(data) {
  const mainEl = document.getElementById('main');
  const subsEl = document.getElementById('subs');
  const select = document.getElementById('actualWasherSelect');

  if (!mainEl || !subsEl || !select) return;

  mainEl.textContent = data.chosen.main;
  subsEl.textContent = data.chosen.subs.join(', ');

  const options = uniq([data.chosen.main, ...data.chosen.subs, ...data.kader]);
  select.innerHTML = '';
  options.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });

  document.getElementById('btnConfirm').onclick = confirmActualWasher;
  document.getElementById('btnCancelPending').onclick = cancelPending;
  document.getElementById('btnScreenshot').onclick = captureResultScreenshot;
}

function confirmActualWasher() {
  if (!pending) return;

  const select = document.getElementById('actualWasherSelect');
  const washer = select.value;

  if (!alreadyWashed.includes(washer)) {
    alreadyWashed.push(washer);
    save(K_WASHED, alreadyWashed);
  }

  lastSubs = [...pending.chosen.subs];
  save(K_LAST_SUBS, lastSubs);

  history.unshift({
    date: pending.date,
    kader: pending.kader,
    gezogen: {
      wascher: pending.chosen.main,
      subs: pending.chosen.subs
    },
    gewaschen: washer
  });
  save(K_HISTORY, history);

  pending = null;
  save(K_PENDING, pending);

  renderKader();
  renderHistory();

  const panel = document.getElementById('panelResult');
  if (panel) panel.classList.add('hidden');

  alert(`Gespeichert: ${washer} hat gewaschen.`);
}

function cancelPending() {
  pending = null;
  save(K_PENDING, pending);
  const panel = document.getElementById('panelResult');
  if (panel) panel.classList.add('hidden');
}

/* =========================
   HISTORY
========================= */
function renderHistory() {
  const ul = document.getElementById('historyList');
  if (!ul) return;

  ul.innerHTML = '';

  history.forEach((entry, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div style="flex:1">
        <strong>${escapeHtml(entry.date)}</strong>:
        ${escapeHtml(entry.gewaschen)}
        <small class="muted">
          (gezogen: ${escapeHtml(entry.gezogen.wascher)};
          Stellvertreter: ${entry.gezogen.subs.map(escapeHtml).join(', ')})
        </small>
      </div>
      <div class="row" style="gap:6px">
        <button class="secondary" data-edit="${index}">✏️</button>
        <button class="danger" data-del="${index}">🗑️</button>
      </div>
    `;
    ul.appendChild(li);
  });

  ul.querySelectorAll('button[data-edit]').forEach(btn => {
    btn.onclick = () => {
      const i = Number(btn.dataset.edit);
      editHistoryEntry(i);
    };
  });

  ul.querySelectorAll('button[data-del]').forEach(btn => {
    btn.onclick = () => {
      const i = Number(btn.dataset.del);
      deleteHistoryEntry(i);
    };
  });
}

function editHistoryEntry(index) {
  const entry = history[index];
  if (!entry) return;

  const newWasher = prompt('Wer hat wirklich gewaschen?', entry.gewaschen);
  if (newWasher === null) return;

  const trimmed = newWasher.trim();
  if (!trimmed) return;

  if (!players.includes(trimmed)) {
    alert('Der Name ist nicht in der Spielerliste.');
    return;
  }

  entry.gewaschen = trimmed;
  if (!alreadyWashed.includes(trimmed)) {
    alreadyWashed.push(trimmed);
    save(K_WASHED, alreadyWashed);
  }

  save(K_HISTORY, history);
  renderHistory();
  renderKader();
}

function deleteHistoryEntry(index) {
  if (!confirm('Diesen Eintrag wirklich löschen?')) return;
  history.splice(index, 1);
  save(K_HISTORY, history);
  renderHistory();
}

/* =========================
   EXPORT / IMPORT
========================= */
function exportData() {
  const data = {
    players,
    alreadyWashed,
    history,
    lastSubs,
    selectedKader,
    boardPlayers,
    boardFormations,
    boardTeamColor
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'trikotwaesche_daten.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      players = data.players || [];
      alreadyWashed = data.alreadyWashed || [];
      history = data.history || [];
      lastSubs = data.lastSubs || [];
      selectedKader = data.selectedKader || [];
      boardPlayers = data.boardPlayers || [];
      boardFormations = data.boardFormations || {};
      boardTeamColor = data.boardTeamColor || 'home';

      persistAll();
      renderApp();
      alert('Daten importiert.');
    } catch (err) {
      alert('Fehler beim Import.');
    }
  };
  reader.readAsText(file);
}

/* =========================
   SCREENSHOTS
========================= */
function captureResultScreenshot() {
  const result = document.getElementById('result');
  if (!result) return;

  html2canvas(result)
    .then(canvas => {
      const a = document.createElement('a');
      a.download = `trikotwaesche-${today()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    })
    .catch(() => alert('Screenshot fehlgeschlagen.'));
}

function captureBoardScreenshot() {
  const boardWrap = document.querySelector('#tabBoardPanel .board-split');
  if (!boardWrap) return;

  html2canvas(boardWrap)
    .then(canvas => {
      const a = document.createElement('a');
      a.download = `taktikboard-${today()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    })
    .catch(() => alert('Screenshot vom Taktikboard fehlgeschlagen.'));
}

/* =========================
   BOARD
========================= */
function createBoardPlayer(name = 'Spieler', number = '', x = 50, y = 50, onBench = false) {
  return {
    id: randomId(),
    name,
    number,
    x,
    y,
    onBench
  };
}

function setBoardColor(color) {
  boardTeamColor = color === 'away' ? 'away' : 'home';
  saveBoardColor();
  renderApp();
}

function loadSelectedKaderToBoard() {
  const kader = selectedKader.filter(name => players.includes(name));

  if (!kader.length) {
    alert('Es ist aktuell kein Kader ausgewählt.');
    return;
  }

  const preset = [
    { x: 50, y: 90 },
    { x: 12, y: 73 },
    { x: 30, y: 73 },
    { x: 50, y: 73 },
    { x: 70, y: 73 },
    { x: 88, y: 73 },
    { x: 20, y: 55 },
    { x: 40, y: 55 },
    { x: 60, y: 55 },
    { x: 80, y: 55 },
    { x: 50, y: 35 },
    { x: 50, y: 15 }
  ];

  boardPlayers = kader.map((name, i) => {
    const pos = preset[i] || { x: 50, y: 50 };
    return createBoardPlayer(name, String(i + 1), pos.x, pos.y, i >= 11);
  });

  saveBoard();
  renderBoard();
}

function addBoardPlayerManually() {
  const name = prompt('Name des Spielers:', 'Spieler');
  if (name === null) return;
  const trimmedName = name.trim();
  if (!trimmedName) return;

  const number = prompt('Rückennummer:', '') ?? '';
  const bench = confirm('Soll der Spieler direkt auf die Bank?');

  boardPlayers.push(createBoardPlayer(trimmedName, number.trim(), 50, 50, bench));
  saveBoard();
  renderBoard();
}

function addBoardPlayerFromList() {
  const alreadyOnBoard = boardPlayers.map(p => p.name);
  const available = players.filter(name => !alreadyOnBoard.includes(name));

  if (!available.length) {
    alert('Alle Spieler aus der Liste sind bereits auf dem Board.');
    return;
  }

  const choice = prompt(
    `Welchen Spieler hinzufügen?\n\n${available.join('\n')}`,
    available[0]
  );

  if (choice === null) return;
  const name = choice.trim();
  if (!available.includes(name)) {
    alert('Bitte genau einen Namen aus der Liste eingeben.');
    return;
  }

  const number = prompt('Rückennummer:', '') ?? '';
  const bench = confirm('Soll der Spieler direkt auf die Bank?');

  boardPlayers.push(createBoardPlayer(name, number.trim(), 50, 50, bench));
  saveBoard();
  renderBoard();
}

function resetBoard() {
  if (!confirm('Taktikboard wirklich zurücksetzen?')) return;
  boardPlayers = [];
  saveBoard();
  renderBoard();
}

function renderBoard() {
  const fieldLayer = document.getElementById('boardPlayersLayer');
  const benchLayer = document.getElementById('benchPlayers');

  if (!fieldLayer || !benchLayer) return;

  fieldLayer.innerHTML = '';
  benchLayer.innerHTML = '';

  const fieldPlayers = boardPlayers.filter(p => !p.onBench);
  const benchPlayers = boardPlayers.filter(p => p.onBench);

  fieldPlayers.forEach(player => {
    const el = createBoardPlayerElement(player, false);
    fieldLayer.appendChild(el);
  });

  benchPlayers.forEach(player => {
    const el = createBoardPlayerElement(player, true);
    benchLayer.appendChild(el);
  });
}

function createBoardPlayerElement(player, isBench) {
  const el = document.createElement('div');
  el.className = `board-player ${boardTeamColor} ${isBench ? 'bench' : ''}`;
  el.dataset.id = player.id;

  if (!isBench) {
    el.style.left = `${player.x}%`;
    el.style.top = `${player.y}%`;
    attachBoardDrag(el, player.id);
  }

  el.innerHTML = `
    <div class="board-marker">${escapeHtml(player.number || '')}</div>
    <div class="board-label">${escapeHtml(player.name)}</div>
  `;

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    editBoardPlayer(player.id);
  });

  return el;
}

function editBoardPlayer(id) {
  const player = boardPlayers.find(p => p.id === id);
  if (!player) return;

  const newName = prompt('Name bearbeiten:', player.name);
  if (newName === null) return;
  const trimmedName = newName.trim();
  if (trimmedName) player.name = trimmedName;

  const newNumber = prompt('Rückennummer bearbeiten:', player.number ?? '');
  if (newNumber === null) return;
  player.number = newNumber.trim();

  const toggleBench = confirm(
    player.onBench
      ? 'Spieler von der Bank aufs Feld holen?'
      : 'Spieler auf die Bank setzen?'
  );

  if (toggleBench) {
    player.onBench = !player.onBench;
    if (!player.onBench && (typeof player.x !== 'number' || typeof player.y !== 'number')) {
      player.x = 50;
      player.y = 50;
    }
  }

  const remove = confirm('Spieler vom Taktikboard entfernen?');
  if (remove) {
    boardPlayers = boardPlayers.filter(p => p.id !== id);
  }

  saveBoard();
  renderBoard();
}

function attachBoardDrag(element, playerId) {
  let dragging = false;
  let boardRect = null;

  const onPointerMove = (e) => {
    if (!dragging) return;
    const board = document.getElementById('tacticBoard');
    if (!board) return;

    if (!boardRect) boardRect = board.getBoundingClientRect();

    let x = ((e.clientX - boardRect.left) / boardRect.width) * 100;
    let y = ((e.clientY - boardRect.top) / boardRect.height) * 100;

    x = Math.max(4, Math.min(96, x));
    y = Math.max(4, Math.min(96, y));

    const player = boardPlayers.find(p => p.id === playerId);
    if (!player) return;

    player.x = x;
    player.y = y;
    element.style.left = `${x}%`;
    element.style.top = `${y}%`;
  };

  const stopDrag = () => {
    if (!dragging) return;
    dragging = false;
    boardRect = null;
    saveBoard();

    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopDrag);
    window.removeEventListener('pointercancel', stopDrag);
  };

  element.addEventListener('pointerdown', (e) => {
    dragging = true;
    const board = document.getElementById('tacticBoard');
    if (!board) return;
    boardRect = board.getBoundingClientRect();

    try {
      element.setPointerCapture(e.pointerId);
    } catch {}

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);
  });
}

/* =========================
   FORMATIONS
========================= */
function renderFormationOptions() {
  const select = document.getElementById('formationSelect');
  if (!select) return;

  const current = select.value;
  select.innerHTML = `<option value="">Aufstellung wählen</option>`;

  Object.keys(boardFormations)
    .sort((a, b) => a.localeCompare(b, 'de'))
    .forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });

  if (boardFormations[current]) {
    select.value = current;
  }
}

function saveCurrentFormation() {
  const input = document.getElementById('formationNameInput');
  if (!input) return;

  const name = input.value.trim();
  if (!name) {
    alert('Bitte einen Namen für die Aufstellung eingeben.');
    return;
  }

  boardFormations[name] = {
    players: JSON.parse(JSON.stringify(boardPlayers)),
    color: boardTeamColor,
    savedAt: new Date().toISOString()
  };

  saveBoardFormations();
  renderFormationOptions();
  input.value = '';
  alert(`Aufstellung "${name}" gespeichert.`);
}

function loadSelectedFormation() {
  const select = document.getElementById('formationSelect');
  if (!select) return;

  const name = select.value;
  if (!name || !boardFormations[name]) {
    alert('Bitte eine gespeicherte Aufstellung auswählen.');
    return;
  }

  const formation = boardFormations[name];
  boardPlayers = JSON.parse(JSON.stringify(formation.players || []));
  boardTeamColor = formation.color || 'home';

  saveBoard();
  saveBoardColor();
  renderApp();
  alert(`Aufstellung "${name}" geladen.`);
}

function deleteSelectedFormation() {
  const select = document.getElementById('formationSelect');
  if (!select) return;

  const name = select.value;
  if (!name || !boardFormations[name]) {
    alert('Bitte eine gespeicherte Aufstellung auswählen.');
    return;
  }

  if (!confirm(`Aufstellung "${name}" wirklich löschen?`)) return;

  delete boardFormations[name];
  saveBoardFormations();
  renderFormationOptions();
}

/* =========================
   BOOT
========================= */
renderApp();
