// ================================
// PLANTAFEL – STABILER KERN
// Projekt-Parkplatz ↔ 4-Wochen
// ================================

const LS_KEY = "plantafel_stable_v1";

let state = loadState();

function loadState() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) {
    return {
      startMonday: getMonday(new Date()),
      projects: [],          // {id, name}
      planned: []            // {id, projectId, date}
    };
  }
  return JSON.parse(raw);
}

function saveState() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function uid() {
  return Math.random().toString(36).slice(2);
}

// --------------------
// DATE HELPERS
// --------------------
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  if (day !== 1) d.setDate(d.getDate() - day + 1);
  d.setHours(12,0,0,0);
  return d.toISOString().slice(0,10);
}

function getVisibleDates() {
  const start = new Date(state.startMonday);
  const dates = [];
  for (let i = 0; i < 20; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i + Math.floor(i / 5) * 2);
    dates.push(d.toISOString().slice(0,10));
  }
  return dates;
}

// --------------------
// INIT
// --------------------
document.getElementById("btnToday").onclick = () => {
  state.startMonday = getMonday(new Date());
  saveState();
  renderAll();
};

document.getElementById("startDate").value = state.startMonday;
document.getElementById("startDate").onchange = e => {
  state.startMonday = getMonday(new Date(e.target.value));
  saveState();
  renderAll();
};

// --------------------
// PROJECT ADD
// --------------------
document.getElementById("addProjectBtn").onclick = () => {
  const input = document.getElementById("projectInput");
  const name = input.value.trim();
  if (!name) return;
  state.projects.push({ id: uid(), name });
  input.value = "";
  saveState();
  renderAll();
};

// --------------------
// RENDER
// --------------------
function renderAll() {
  renderParkplatz();
  renderWeeks();
}

function renderParkplatz() {
  const box = document.getElementById("projectParkplatz");
  box.innerHTML = "";

  state.projects.forEach(p => {
    const el = document.createElement("div");
    el.className = "year-bar";
    el.textContent = p.name;
    el.draggable = true;

    el.ondragstart = e => {
      e.dataTransfer.setData("text/plain", p.id);
    };

    const del = document.createElement("span");
    del.textContent = " ✖";
    del.onclick = () => {
      state.projects = state.projects.filter(x => x.id !== p.id);
      state.planned = state.planned.filter(x => x.projectId !== p.id);
      saveState();
      renderAll();
    };

    el.appendChild(del);
    box.appendChild(el);
  });
}

function renderWeeks() {
  const weeks = document.getElementById("weeks");
  weeks.innerHTML = "";

  const dates = getVisibleDates();

  dates.forEach(date => {
    const day = document.createElement("div");
    day.className = "day";
    day.innerHTML = `<b>${date}</b>`;
    day.ondragover = e => e.preventDefault();

    day.ondrop = e => {
      const projectId = e.dataTransfer.getData("text/plain");
      state.planned.push({
        id: uid(),
        projectId,
        date
      });
      saveState();
      renderAll();
    };

    state.planned
      .filter(p => p.date === date)
      .forEach(p => {
        const proj = state.projects.find(x => x.id === p.projectId);
        if (!proj) return;

        const block = document.createElement("div");
        block.className = "project-block";
        block.textContent = proj.name;
        block.draggable = true;

        block.ondragstart = e => {
          e.dataTransfer.setData("text/plain", p.id);
        };

        day.appendChild(block);
      });

    weeks.appendChild(day);
  });
}

renderAll();
