'use strict';

/* ====== Storage Keys ====== */
const K_PLAYERS = 'players';
const K_WASHED = 'alreadyWashed';
const K_HISTORY = 'history';
const K_LAST_SUBS = 'lastSubs';
const K_SELECTED = 'selectedKader';
const K_PENDING = 'pendingDraw';

/* ====== State ====== */
let players = load(K_PLAYERS, []);
let alreadyWashed = load(K_WASHED, []);
let history = load(K_HISTORY, []);
let lastSubs = load(K_LAST_SUBS, []);
let selectedKader = load(K_SELECTED, []);
let pending = load(K_PENDING, null);

/* ====== Utils ====== */
function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; }
  catch { return fallback; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function uniq(arr) { return [...new Set(arr)]; }
function today() { return new Date().toISOString().split('T')[0]; }

/* ====== App UI (render) ====== */
function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="container">
      <div class="card">
        <h1>Trikotwäsche</h1>
        <small class="muted">Installierbar & offline nutzbar (PWA). Daten bleiben lokal auf deinem Gerät.</small>
      </div>

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
        <small class="muted">Tipp: Bereits gewaschene im Kader sind mit ✅ markiert und werden bei der Ziehung ignoriert.</small>
        <ul class="list" id="kaderList"></ul>
        <div class="row">
          <button id="btnDraw">🎲 Waschdienst auslosen</button>
          <button class="secondary" id="btnExport">📤 Export</button>
          <label class="secondary" style="padding:10px 14px;border-radius:10px;cursor:pointer;">
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

      <div class="card">
        <h2>Historie</h2>
        <ul class="list" id="historyList"></ul>
      </div>
    </div>
  `;

  // Bind
  document.getElementById('btnImportNames').onclick = importNames;
  document.getElementById('btnDraw').onclick = drawWaschdienst;
  document.getElementById('btnExport').onclick = exportData;
  document.getElementById('fileImport').onchange = importData;

  if (pending) {
    populateResultPanel(pending);
  }

  renderPlayers();
  renderKader();
  renderHistory();
}

function importNames() {
  const ta = document.getElementById('importTextarea');
  const names = ta.value.split('\n').map(n => n.trim()).filter(Boolean);
  if (!names.length) return;

  const next = uniq([...players, ...names]);
  players = next;
  save(K_PLAYERS, players);
  ta.value = '';
  renderPlayers();
  renderKader();
}

function renderPlayers() {
  const ul = document.getElementById('playerList');
  ul.innerHTML = '';
  players.forEach(name => {
    const li = document.createElement('li');
    const checked = selectedKader.includes(name) ? 'checked' : '';
    li.innerHTML = `
      <label style="flex:1;display:flex;align-items:center;gap:8px;">
        <input type="checkbox" data-name="${name}" ${checked} />
        <span>${name}</span>
      </label>
      <button class="danger" data-del="${name}">❌</button>
    `;
    ul.appendChild(li);
  });

  ul.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      const name = cb.dataset.name;
      if (cb.checked && !selectedKader.includes(name)) selectedKader.push(name);
      if (!cb.checked) selectedKader = selectedKader.filter(n => n !== name);
      save(K_SELECTED, selectedKader);
      renderKader();
    });
  });

  ul.querySelectorAll('button[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.del;
      players = players.filter(n => n !== name);
      alreadyWashed = alreadyWashed.filter(n => n !== name);
      selectedKader = selectedKader.filter(n => n !== name);
      save(K_PLAYERS, players);
      save(K_WASHED, alreadyWashed);
      save(K_SELECTED, selectedKader);
      renderPlayers();
      renderKader();
    });
  });

  document.getElementById('countAll').textContent = players.length;
  document.getElementById('countSelected').textContent = selectedKader.length;
}

function renderKader() {
  const ul = document.getElementById('kaderList');
  ul.innerHTML = '';
  const selected = selectedKader.filter(n => players.includes(n));
  selected.forEach(name => {
    const washed = alreadyWashed.includes(name);
    const badge = washed ? '<span class="badge">✅ gewaschen</span>' : '<span class="badge">🕒 offen</span>';
    const li = document.createElement('li');
    li.innerHTML = `<span>${name} ${badge}</span>`;
    ul.appendChild(li);
  });
  document.getElementById('countKader').textContent = selected.length;
}

function drawWaschdienst() {
  const selected = selectedKader.filter(n => players.includes(n));
  if (selected.length < 3) {
    alert('Bitte mindestens 3 Spieler im Kader auswählen.');
    return;
  }

  // Kader-spezifischer Zyklus
  const washedInKader = alreadyWashed.filter(p => selected.includes(p));
  let eligible = selected.filter(p => !washedInKader.includes(p));

  // Wenn weniger als 3 übrig sind: Kader-Zyklus zurücksetzen
  if (eligible.length < 3) {
    alreadyWashed = alreadyWashed.filter(p => !selected.includes(p)); // nur Kader-Spieler aus dem Zyklus entfernen
    save(K_WASHED, alreadyWashed);
    eligible = [...selected];
  }

  // Mischen
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);

  const main = shuffled[0];
  // Stellvertreter: nicht in lastSubs, wenn möglich
  let subsPool = shuffled.slice(1).filter(p => !lastSubs.includes(p));
  if (subsPool.length < 2) subsPool = shuffled.slice(1);
  const subs = subsPool.slice(0, 2);

  // Pending Runde speichern, damit „Wer hat gewaschen?“ später möglich ist
  pending = { date: today(), kader: selected, chosen: { main, subs } };
  save(K_PENDING, pending);

  populateResultPanel(pending);
  document.getElementById('panelResult').classList.remove('hidden');
}

function populateResultPanel(p) {
  document.getElementById('main').textContent = p.chosen.main;
  document.getElementById('subs').textContent = p.chosen.subs.join(', ');

  const select = document.getElementById('actualWasherSelect');
  const options = uniq([p.chosen.main, ...p.chosen.subs, ...p.kader]);
  select.innerHTML = '';
  options.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });

  document.getElementById('btnConfirm').onclick = () => confirmActualWasher();
  document.getElementById('btnCancelPending').onclick = () => cancelPending();
  document.getElementById('btnScreenshot').onclick = () => captureScreenshot();
}

function confirmActualWasher() {
  if (!pending) return;
  const select = document.getElementById('actualWasherSelect');
  const washer = select.value;
  const { date, kader, chosen } = pending;

  // Fairness: wer gewaschen hat, wird für den aktuellen Zyklus (global) eingetragen
  if (!alreadyWashed.includes(washer)) {
    alreadyWashed.push(washer);
    save(K_WASHED, alreadyWashed);
  }

  // Stellvertreter-Sperre: die zuletzt gezogenen Subs dürfen beim nächsten Spieltag nicht wieder als Subs erscheinen
  lastSubs = chosen.subs;
  save(K_LAST_SUBS, lastSubs);

  // Historie-Eintrag
  history.unshift({
    date,
    kader,
    gezogen: { wascher: chosen.main, subs: chosen.subs },
    gewaschen: washer
  });
  save(K_HISTORY, history);

  // Pending auflösen
  pending = null;
  save(K_PENDING, pending);

  renderKader();
  renderHistory();
  document.getElementById('panelResult').classList.add('hidden');
  alert(`Gespeichert: ${washer} hat gewaschen.`);
}

function cancelPending() {
  pending = null;
  save(K_PENDING, pending);
  document.getElementById('panelResult').classList.add('hidden');
}

function renderHistory() {
  const ul = document.getElementById('historyList');
  ul.innerHTML = '';
  history.forEach((entry, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div style="flex:1">
        <strong>${entry.date}</strong>:
        ${entry.gewaschen}
        <small class="muted"> (gezogen: ${entry.gezogen.wascher}; Stellvertreter: ${entry.gezogen.subs.join(', ')})</small>
      </div>
      <div class="row" style="gap:6px">
        <button class="secondary" data-edit="${i}">✏️</button>
        <button class="danger" data-del="${i}">🗑️</button>
      </div>
    `;
    ul.appendChild(li);
  });

  ul.querySelectorAll('button[data-edit]').forEach(btn => {
    btn.onclick = () => {
      const i = +btn.dataset.edit;
      const current = history[i];
      const newWasher = prompt(`Neuer Name für „gewaschen“ (${current.gewaschen})`, current.gewaschen);
      if (!newWasher) return;
      if (!players.includes(newWasher)) {
        alert('Name ist nicht in der Spielerliste.');
        return;
      }
      history[i].gewaschen = newWasher;
      if (!alreadyWashed.includes(newWasher)) {
        alreadyWashed.push(newWasher);
        save(K_WASHED, alreadyWashed);
      }
      save(K_HISTORY, history);
      renderHistory();
      renderKader();
    };
  });

  ul.querySelectorAll('button[data-del]').forEach(btn => {
    btn.onclick = () => {
      const i = +btn.dataset.del;
      if (!confirm('Diesen Eintrag löschen?')) return;
      history.splice(i,1);
      save(K_HISTORY, history);
      renderHistory();
    };
  });
}

/* ====== Export / Import ====== */
function exportData() {
  const data = {
    players, alreadyWashed, history, lastSubs, selectedKader
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'trikotwaesche_daten.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData(ev) {
  const file = ev.target.files?.[0];
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
      save(K_PLAYERS, players);
      save(K_WASHED, alreadyWashed);
      save(K_HISTORY, history);
      save(K_LAST_SUBS, lastSubs);
      save(K_SELECTED, selectedKader);
      renderApp();
      alert('Daten importiert.');
    } catch(e) {
      alert('Fehler beim Import.');
    }
  };
  reader.readAsText(file);
}

/* ====== Screenshot ====== */
function captureScreenshot() {
  const node = document.getElementById('result');
  if (!node) return;
  html2canvas(node).then(canvas => {
    const a = document.createElement('a');
    a.download = `trikotwaesche-${today()}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  }).catch(() => alert('Screenshot fehlgeschlagen.'));
}

/* ====== Boot ====== */
renderApp();
