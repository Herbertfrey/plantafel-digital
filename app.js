// ===============================
// PROJEKT-PARKPLATZ – STABIL
// ===============================

const STORAGE_KEY = "plantafel_parking_v1";

const state = loadState();

// DOM
const projectInput = document.getElementById("projectInput");
const addProjectBtn = document.getElementById("addProjectBtn");
const parkingList = document.getElementById("parkingList");

// EVENTS
addProjectBtn.addEventListener("click", addProject);
projectInput.addEventListener("keydown", e => {
  if (e.key === "Enter") addProject();
});

// FUNKTIONEN
function addProject() {
  const name = projectInput.value.trim();
  if (!name) return;

  state.projects.push({
    id: uid(),
    name
  });

  projectInput.value = "";
  saveState();
  render();
}

function render() {
  parkingList.innerHTML = "";

  state.projects.forEach(p => {
    const el = document.createElement("div");
    el.className = "project";
    el.draggable = true;
    el.textContent = p.name;

    // Drag-Quelle
    el.addEventListener("dragstart", e => {
      e.dataTransfer.setData(
        "application/json",
        JSON.stringify({
          type: "project",
          projectId: p.id
        })
      );
      e.dataTransfer.effectAllowed = "move";
    });

    // Löschen
    const del = document.createElement("span");
    del.className = "del";
    del.textContent = "✖";
    del.title = "Projekt löschen";

    del.addEventListener("click", () => {
      if (!confirm(`Projekt wirklich löschen: "${p.name}"?`)) return;
      state.projects = state.projects.filter(x => x.id !== p.id);
      saveState();
      render();
    });

    el.appendChild(del);
    parkingList.appendChild(el);
  });
}

// STORAGE
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { projects: [] };
  } catch {
    return { projects: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return Math.random().toString(36).slice(2);
}

// START
render();
