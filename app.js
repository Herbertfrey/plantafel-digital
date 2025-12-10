const SUPABASE_URL = "https://yzfmviddzhghvcxowbjl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Zm12aWRkemhnaHZjeG93YmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MjkyNzIsImV4cCI6MjA4MDQwNTI3Mn0.BOmbE7xq1-kUBdbH3kpN4lIjDyWIwLaCpS6ZT3mbb9U";

const supabase = supabaseJs.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const days = ["mo", "di", "mi", "do", "fr"];

function showWeek() {
  loadBoard();
}

function buildBoard(baseKW = null) {
  const board = document.getElementById("board");
  board.innerHTML = "";

  board.append("");
  for (let i = 0; i < 4; i++) {
    board.append(header(`KW ${baseKW + i}`));
  }

  for (const day of days) {
    board.append(dayLabel(day));
    for (let i = 0; i < 4; i++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.day = day;
      cell.dataset.kw = baseKW + i;
      board.append(cell);
    }
  }
}

function header(text) {
  const h = document.createElement("div");
  h.className = "header";
  h.textContent = text;
  return h;
}

function dayLabel(day) {
  const d = document.createElement("div");
  d.className = "day";
  d.textContent = day.toUpperCase();
  return d;
}

async function loadBoard() {
  const kw = parseInt(document.getElementById("kw").value);
  if (!kw) return;

  buildBoard(kw);

  const { data } = await supabase
    .from("plantafel")
    .select("*");

  data.forEach(entry => {
    const cell = document.querySelector(
      `.cell[data-kw="${entry.kw}"][data-day="${entry.weekday}"]`
    );
    if (!cell) return;

    const card = document.createElement("div");
    card.className = "card";
    card.dataset.status = entry.status || "normal";

    card.innerHTML = `
      <div class="card-header">${entry.titel}</div>
      <div>${entry.baustelle}</div>
      <div>${entry.mitarbeiter} – ${entry.fahrzeug}</div>
    `;
    cell.append(card);
  });
}

async function saveEntry() {
  const kw = parseInt(document.getElementById("kw").value);
  const weekday = document.getElementById("weekday").value;

  if (!kw || !weekday) {
    alert("Für das Wochenbrett müssen KW und Wochentag gesetzt sein.");
    return;
  }

  const entry = {
    kw,
    weekday,
    titel: document.getElementById("titel").value,
    baustelle: document.getElementById("baustelle").value,
    mitarbeiter: document.getElementById("mitarbeiter").value,
    fahrzeug: document.getElementById("fahrzeug").value,
    status: document.getElementById("status").value,
    notiz: document.getElementById("notiz").value
  };

  await supabase.from("plantafel").insert(entry);
  loadBoard();
}
