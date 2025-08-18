// Vollständiger JavaScript-Code für die Trikotwäsche-App

let players = JSON.parse(localStorage.getItem("players")) || [];
let alreadyWashed = JSON.parse(localStorage.getItem("alreadyWashed")) || [];
let history = JSON.parse(localStorage.getItem("history")) || [];
let lastSubs = JSON.parse(localStorage.getItem("lastSubs")) || [];

function save() {
  localStorage.setItem("players", JSON.stringify(players));
  localStorage.setItem("alreadyWashed", JSON.stringify(alreadyWashed));
  localStorage.setItem("history", JSON.stringify(history));
  localStorage.setItem("lastSubs", JSON.stringify(lastSubs));
}

function initApp() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <h1>Trikotwäsche</h1>

    <section>
      <h2>Spieler verwalten</h2>
      <textarea id="importTextarea" placeholder="Spieler (ein Name pro Zeile)"></textarea>
      <button onclick="importNames()">Importieren</button>
      <p id="playerStats"></p>
      <ul id="playerList"></ul>
    </section>

    <section>
      <h2>Kader auswählen</h2>
      <p id="kaderStats"></p>
      <ul id="kaderList"></ul>
    </section>

    <button onclick="drawWaschdienst()">🎲 Waschdienst auslosen</button>

    <section id="result" class="hidden">
      <h2>Ausgelost:</h2>
      <p><strong>Waschdienst:</strong> <span id="main"></span></p>
      <p><strong>Stellvertreter:</strong> <span id="subs"></span></p>

      <h3>Wer hat wirklich gewaschen?</h3>
      <select id="actualWasherSelect"></select>
      <button onclick="confirmActualWasher()">✅ Speichern</button>
      <button onclick="captureScreenshot()">📸 Screenshot</button>
    </section>

    <section>
      <h2>Historie</h2>
      <ul id="historyList"></ul>
    </section>
  `;

  renderPlayers();
  renderHistory();
}

function importNames() {
  const text = document.getElementById("importTextarea").value;
  const names = text.split("\n").map(n => n.trim()).filter(n => n && !players.includes(n));
  players.push(...names);
  save();
  renderPlayers();
}

function renderPlayers() {
  const list = document.getElementById("playerList");
  list.innerHTML = "";
  players.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `
      <label><input type="checkbox" data-name="${p}" onchange="renderKader()" /> ${p}</label>
      <button onclick="removePlayer('${p}')">❌</button>
    `;
    list.appendChild(li);
  });
  document.getElementById("playerStats").textContent = `Gesamt: ${players.length}`;
  renderKader();
}

function removePlayer(name) {
  players = players.filter(p => p !== name);
  alreadyWashed = alreadyWashed.filter(p => p !== name);
  save();
  renderPlayers();
}

function renderKader() {
  const kaderList = document.getElementById("kaderList");
  kaderList.innerHTML = "";
  const checkboxes = document.querySelectorAll("#playerList input[type='checkbox']");
  let checked = 0;
  checkboxes.forEach(cb => {
    if (cb.checked) {
      checked++;
      const li = document.createElement("li");
      const name = cb.dataset.name;
      const status = alreadyWashed.includes(name) ? "✅" : "⏳";
      li.textContent = `${name} ${status}`;
      kaderList.appendChild(li);
    }
  });
  document.getElementById("kaderStats").textContent = `Kader: ${checked}`;
}

function drawWaschdienst() {
  const selected = Array.from(document.querySelectorAll("#playerList input[type='checkbox']:checked"))
    .map(cb => cb.dataset.name);

  if (selected.length < 3) {
    alert("Mindestens 3 Spieler auswählen.");
    return;
  }

  const washedInKader = alreadyWashed.filter(p => selected.includes(p));
  let eligible = selected.filter(p => !washedInKader.includes(p));
  if (eligible.length < 3) {
    alreadyWashed = alreadyWashed.filter(p => !selected.includes(p));
    eligible = selected;
  }

  const shuffled = eligible.sort(() => Math.random() - 0.5);
  const main = shuffled[0];
  let subs = shuffled.slice(1).filter(p => !lastSubs.includes(p)).slice(0, 2);

  if (subs.length < 2) {
    subs = shuffled.slice(1, 3); // Fallback
  }

  document.getElementById("main").textContent = main;
  document.getElementById("subs").textContent = subs.join(", ");

  const allOptions = Array.from(new Set([main, ...subs, ...selected]));
  const select = document.getElementById("actualWasherSelect");
  select.innerHTML = "";
  allOptions.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });

  select.dataset.main = main;
  select.dataset.subs = JSON.stringify(subs);
  select.dataset.kader = JSON.stringify(selected);

  document.getElementById("result").classList.remove("hidden");
}

function confirmActualWasher() {
  const select = document.getElementById("actualWasherSelect");
  const washer = select.value;
  const main = select.dataset.main;
  const subs = JSON.parse(select.dataset.subs);
  const kader = JSON.parse(select.dataset.kader);

  if (!alreadyWashed.includes(washer)) {
    alreadyWashed.push(washer);
  }
  lastSubs = subs;

  const today = new Date().toISOString().split("T")[0];

  history.unshift({
    date: today,
    kader,
    gezogen: { wascher: main, subs },
    gewaschen: washer
  });

  save();
  renderHistory();
  document.getElementById("result").classList.add("hidden");
  alert(`Gespeichert: ${washer} hat gewaschen.`);
}

function renderHistory() {
  const list = document.getElementById("historyList");
  list.innerHTML = "";
  history.forEach((entry, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${entry.date}</strong>: ${entry.gewaschen} (gezogen: ${entry.gezogen.wascher}, Stellvertreter: ${entry.gezogen.subs.join(", ")})
      <button onclick="editHistory(${i})">✏️</button>
      <button onclick="deleteHistory(${i})">🗑️</button>
    `;
    list.appendChild(li);
  });
}

function editHistory(index) {
  const newName = prompt("Neuer Name für 'gewaschen':", history[index].gewaschen);
  if (newName && players.includes(newName)) {
    history[index].gewaschen = newName;
    if (!alreadyWashed.includes(newName)) alreadyWashed.push(newName);
    save();
    renderHistory();
  } else if (newName) {
    alert("Name ist nicht in der Spielerliste.");
  }
}

function deleteHistory(index) {
  if (confirm("Diesen Eintrag wirklich löschen?")) {
    history.splice(index, 1);
    save();
    renderHistory();
  }
}

function captureScreenshot() {
  const result = document.getElementById("result");
  html2canvas(result).then(canvas => {
    const link = document.createElement("a");
    link.download = `trikotwaesche-${new Date().toISOString().split("T")[0]}.png`;
    link.href = canvas.toDataURL();
    link.click();
  });
}

initApp();
