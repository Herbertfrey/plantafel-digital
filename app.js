/* =========================
   STATE + STORAGE
========================= */

const LS_KEY = "plantafel_v1";

const COLORS = ["blue", "green", "orange", "purple", "teal"];

const DEFAULT_STATE = {
  startDate: null,          // ISO date of Monday
  projects: [],             // {id, name}
  vehicles: [],             // {id, name}
  employees: [],            // {id, name, colorClass}
  assignments: []           // {groupId, projectId, startIndex, length, vehicles:[ids], employees:[ids]}
};

let state = loadState();

/* =========================
   HELPERS
========================= */

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function saveState() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULT_STATE), ...parsed };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function pad2(n) { return String(n).padStart(2, "0"); }

function formatDDMM(date) {
  return `${pad2(date.getDate())}.${pad2(date.getMonth()+1)}`;
}

function isMonday(d) {
  return d.getDay() === 1;
}

function startOfWeekMonday(date) {
  const d = new Date(date);
  d.setHours(12,0,0,0);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d;
}

// ISO week number
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function getDayLabel(i) {
  const labels = ["Mo","Di","Mi","Do","Fr"];
  return labels[i] || "";
}

function getDayDate(startMonday, dayIndex) {
  // dayIndex 0..19 but only weekdays; each week adds 7 days, within week offset 0..4
  const week = Math.floor(dayIndex / 5);
  const wd = dayIndex % 5;
  const d = new Date(startMonday);
  d.setDate(d.getDate() + week*7 + wd);
  return d;
}

function findById(arr, id) {
  return arr.find(x => x.id === id);
}

/* =========================
   DOM
========================= */

const elStartDate = document.getElementById("startDate");
const btnToday = document.getElementById("btnToday");
const btnReload = document.getElementById("btnReload");

const projectInput = document.getElementById("projectInput");
const addProjectBtn = document.getElementById("addProjectBtn");
const projectList = document.getElementById("projectList");

const vehicleInput = document.getElementById("vehicleInput");
const addVehicleBtn = document.getElementById("addVehicleBtn");
const vehicleList = document.getElementById("vehicleList");

const employeeInput = document.getElementById("employeeInput");
const addEmployeeBtn = document.getElementById("addEmployeeBtn");
const employeeList = document.getElementById("employeeList");

const weeksEl = document.getElementById("weeks");
const trashEl = document.getElementById("trash");

/* =========================
   INIT START DATE
========================= */

(function initStartDate() {
  let monday;
  if (state.startDate) {
    monday = new Date(state.startDate);
  } else {
    monday = startOfWeekMonday(new Date());
    state.startDate = monday.toISOString().slice(0,10);
    saveState();
  }
  elStartDate.value = state.startDate;
})();

btnToday.addEventListener("click", () => {
  const monday = startOfWeekMonday(new Date());
  state.startDate = monday.toISOString().slice(0,10);
  elStartDate.value = state.startDate;
  saveState();
  renderAll();
});

elStartDate.addEventListener("change", () => {
  const d = new Date(elStartDate.value);
  const monday = startOfWeekMonday(d);
  state.startDate = monday.toISOString().slice(0,10);
  elStartDate.value = state.startDate;
  saveState();
  renderAll();
});

btnReload.addEventListener("click", () => {
  renderAll();
});

/* =========================
   ADD ITEMS
========================= */

addProjectBtn.addEventListener("click", () => {
  const name = projectInput.value.trim();
  if (!name) return;
  state.projects.push({ id: uid(), name });
  projectInput.value = "";
  saveState();
  renderAll();
});

addVehicleBtn.addEventListener("click", () => {
  const name = vehicleInput.value.trim();
  if (!name) return;
  state.vehicles.push({ id: uid(), name });
  vehicleInput.value = "";
  saveState();
  renderAll();
});

addEmployeeBtn.addEventListener("click", () => {
  const name = employeeInput.value.trim();
  if (!name) return;
  const colorClass = COLORS[state.employees.length % COLORS.length];
  state.employees.push({ id: uid(), name, colorClass });
  employeeInput.value = "";
  saveState();
  renderAll();
});

/* Enter key support */
[projectInput, vehicleInput, employeeInput].forEach((inp) => {
  inp.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (inp === projectInput) addProjectBtn.click();
    if (inp === vehicleInput) addVehicleBtn.click();
    if (inp === employeeInput) addEmployeeBtn.click();
  });
});

/* =========================
   DRAG DATA
========================= */

function setDragData(e, payload) {
  e.dataTransfer.setData("application/json", JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "copyMove";
}

function getDragData(e) {
  try {
    const raw = e.dataTransfer.getData("application/json");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* =========================
   RENDER LISTS
========================= */

function renderMagnet(container, { type, id, text, className, deletable=true }) {
  const m = document.createElement("span");
  m.className = `magnet ${className}`;
  m.draggable = true;
  m.textContent = text;

  m.addEventListener("dragstart", (e) => {
    setDragData(e, { kind: "master", type, id });
  });

  if (deletable) {
    const del = document.createElement("span");
    del.className = "del";
    del.textContent = "✖";
    del.title = "Aus Stammliste löschen";
    del.addEventListener("click", () => {
      if (!confirm(`Wirklich löschen: "${text}" ?`)) return;

      if (type === "project") {
        state.projects = state.projects.filter(p => p.id !== id);
        // Einsätze mit diesem Projekt löschen
        state.assignments = state.assignments.filter(a => a.projectId !== id);
      }
      if (type === "vehicle") {
        state.vehicles = state.vehicles.filter(v => v.id !== id);
        // aus Einsätzen entfernen
        state.assignments.forEach(a => a.vehicles = a.vehicles.filter(x => x !== id));
      }
      if (type === "employee") {
        state.employees = state.employees.filter(m => m.id !== id);
        state.assignments.forEach(a => a.employees = a.employees.filter(x => x !== id));
      }

      saveState();
      renderAll();
    });
    m.appendChild(del);
  }

  container.appendChild(m);
}

function renderLists() {
  projectList.innerHTML = "";
  vehicleList.innerHTML = "";
  employeeList.innerHTML = "";

  state.projects.forEach(p => {
    // Projekt-Magnet: grau, schwarze Schrift (trotz magnet default weiß)
    // => wir nutzen hier spezielle Klasse "projectMag" als Inline-Style
    const wrap = document.createElement("span");
    wrap.className = "magnet";
    wrap.style.background = "#e6e6e6";
    wrap.style.color = "#000";
    wrap.style.border = "1px solid #d2d2d2";
    wrap.draggable = true;
    wrap.textContent = p.name;

    wrap.addEventListener("dragstart", (e) => {
      setDragData(e, { kind: "master", type: "project", id: p.id });
    });

    const del = document.createElement("span");
    del.className = "del";
    del.textContent = "✖";
    del.title = "Projekt löschen";
    del.addEventListener("click", () => {
      if (!confirm(`Wirklich Projekt löschen: "${p.name}" ?`)) return;
      state.projects = state.projects.filter(x => x.id !== p.id);
      state.assignments = state.assignments.filter(a => a.projectId !== p.id);
      saveState();
      renderAll();
    });
    wrap.appendChild(del);

    projectList.appendChild(wrap);
  });

  state.vehicles.forEach(v => {
    renderMagnet(vehicleList, { type:"vehicle", id:v.id, text:v.name, className:"vehicle" });
  });

  state.employees.forEach(m => {
    renderMagnet(employeeList, { type:"employee", id:m.id, text:m.name, className:`employee ${m.colorClass}` });
  });
}

/* =========================
   ASSIGNMENTS
========================= */

function assignmentsForDayIndex(dayIndex) {
  return state.assignments.filter(a => dayIndex >= a.startIndex && dayIndex < (a.startIndex + a.length));
}

function removeAssignmentGroup(groupId) {
  state.assignments = state.assignments.filter(a => a.groupId !== groupId);
  saveState();
  renderAll();
}

function updateAssignmentGroup(groupId, patchFn) {
  const a = state.assignments.find(x => x.groupId === groupId);
  if (!a) return;
  patchFn(a);
  saveState();
  renderAll();
}

/* =========================
   RENDER BOARD
========================= */

function renderBoard() {
  weeksEl.innerHTML = "";
  const startMonday = new Date(state.startDate);
  startMonday.setHours(12,0,0,0);

  for (let w = 0; w < 4; w++) {
    const weekBox = document.createElement("div");
    weekBox.className = "week";

    const weekStart = new Date(startMonday);
    weekStart.setDate(weekStart.getDate() + w*7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 4); // Fr

    const kw = isoWeek(weekStart);
    const title = document.createElement("div");
    title.className = "week-title";
    title.textContent = `KW ${kw} · ${formatDDMM(weekStart)}–${formatDDMM(weekEnd)}`;
    weekBox.appendChild(title);

    const days = document.createElement("div");
    days.className = "days";

    for (let d = 0; d < 5; d++) {
      const dayIndex = w*5 + d;
      const dayDate = getDayDate(startMonday, dayIndex);

      const dayEl = document.createElement("div");
      dayEl.className = "day";
      dayEl.dataset.dayIndex = String(dayIndex);

      const dayTitle = document.createElement("div");
      dayTitle.className = "day-title";
      dayTitle.textContent = `${getDayLabel(d)} · ${formatDDMM(dayDate)}`;
      dayEl.appendChild(dayTitle);

      const hint = document.createElement("div");
      hint.className = "drop-hint";
      hint.textContent = "Projekt hierher ziehen (Dauer wird gefragt)";
      dayEl.appendChild(hint);

      // Drop: project -> new assignment
      dayEl.addEventListener("dragover", (e) => e.preventDefault());
      dayEl.addEventListener("drop", (e) => {
        e.preventDefault();
        const data = getDragData(e);
        if (!data) return;
        if (data.kind !== "master") return;

        if (data.type === "project") {
          const maxLen = 20 - dayIndex;
          const raw = prompt("Wie viele ARBEITSTAGE (Mo–Fr) soll das Projekt laufen? (1–20)", "1");
          if (!raw) return;
          const len = clamp(parseInt(raw, 10) || 1, 1, maxLen);

          const groupId = uid();
          state.assignments.push({
            groupId,
            projectId: data.id,
            startIndex: dayIndex,
            length: len,
            vehicles: [],
            employees: []
          });
          saveState();
          renderAll();
        }
      });

      // assignments in this day
      const list = assignmentsForDayIndex(dayIndex);
      list.forEach(a => {
        dayEl.appendChild(renderAssignmentBlock(a));
      });

      days.appendChild(dayEl);
    }

    weekBox.appendChild(days);
    weeksEl.appendChild(weekBox);
  }
}

function renderAssignmentBlock(a) {
  const project = findById(state.projects, a.projectId);
  const wrap = document.createElement("div");
  wrap.className = "project";
  wrap.draggable = true;
  wrap.dataset.groupId = a.groupId;

  wrap.addEventListener("dragstart", (e) => {
    setDragData(e, { kind: "assignment", groupId: a.groupId });
  });

  const title = document.createElement("div");
  title.className = "project-title";
  title.textContent = project ? project.name : "(Projekt gelöscht)";
  wrap.appendChild(title);

  const row = document.createElement("div");
  row.className = "assignment-row";

  // Vehicles zone
  const vTitle = document.createElement("div");
  vTitle.className = "zone-title";
  vTitle.textContent = "Fahrzeuge";
  row.appendChild(vTitle);

  const vZone = document.createElement("div");
  vZone.className = "zone";
  vZone.dataset.zone = "vehicles";
  vZone.addEventListener("dragover", (e) => e.preventDefault());
  vZone.addEventListener("drop", (e) => {
    e.preventDefault();
    const data = getDragData(e);
    if (!data) return;
    if (data.kind !== "master" || data.type !== "vehicle") return;
    updateAssignmentGroup(a.groupId, (x) => {
      if (!x.vehicles.includes(data.id)) x.vehicles.push(data.id);
    });
  });

  a.vehicles.forEach(id => {
    const v = findById(state.vehicles, id);
    if (!v) return;
    const chip = document.createElement("span");
    chip.className = "magnet vehicle";
    chip.textContent = v.name;

    // remove on click
    chip.title = "Klick = entfernen";
    chip.style.cursor = "pointer";
    chip.addEventListener("click", () => {
      updateAssignmentGroup(a.groupId, (x) => {
        x.vehicles = x.vehicles.filter(z => z !== id);
      });
    });

    vZone.appendChild(chip);
  });

  row.appendChild(vZone);

  // Employees zone
  const eTitle = document.createElement("div");
  eTitle.className = "zone-title";
  eTitle.textContent = "Mitarbeiter";
  row.appendChild(eTitle);

  const eZone = document.createElement("div");
  eZone.className = "zone";
  eZone.dataset.zone = "employees";
  eZone.addEventListener("dragover", (e) => e.preventDefault());
  eZone.addEventListener("drop", (e) => {
    e.preventDefault();
    const data = getDragData(e);
    if (!data) return;
    if (data.kind !== "master" || data.type !== "employee") return;
    updateAssignmentGroup(a.groupId, (x) => {
      if (!x.employees.includes(data.id)) x.employees.push(data.id);
    });
  });

  a.employees.forEach(id => {
    const m = findById(state.employees, id);
    if (!m) return;
    const chip = document.createElement("span");
    chip.className = `magnet employee ${m.colorClass}`;
    chip.textContent = m.name;

    chip.title = "Klick = entfernen";
    chip.style.cursor = "pointer";
    chip.addEventListener("click", () => {
      updateAssignmentGroup(a.groupId, (x) => {
        x.employees = x.employees.filter(z => z !== id);
      });
    });

    eZone.appendChild(chip);
  });

  row.appendChild(eZone);

  wrap.appendChild(row);

  return wrap;
}

/* =========================
   TRASH
========================= */

trashEl.addEventListener("dragover", (e) => e.preventDefault());
trashEl.addEventListener("drop", (e) => {
  e.preventDefault();
  const data = getDragData(e);
  if (!data) return;

  if (data.kind === "assignment") {
    removeAssignmentGroup(data.groupId);
  }
});

/* =========================
   RENDER ALL
========================= */

function renderAll() {
  renderLists();
  renderBoard();
}

renderAll();
