// Plantafel — Stabil (localStorage)
// - 12 Monate: Projekte als Balken (Parkplatz)
// - 4 Wochen: 4 Wochen * 5 Tage (Mo–Fr) = 20 Boxen wie auf deiner Tafel
// - Drag: Projekt (12 Monate) -> Tag erzeugt Tages-Einsätze (Prompt Arbeitstage)
// - Drag: Projektblock aus Woche -> Monat = entfernt aus aktuellem 4-Wochen-Fenster (zurück parken)
// - Fahrzeuge/Mitarbeiter/Abwesenheiten: vorbereitet wie vorher (kannst du direkt nutzen)

const LS_KEY = "plantafel_full_parking_v1";

const COLORS = ["blue","green","orange","purple","teal"];
const MONTHS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

let activeAbsenceType = "urlaub";

const defaultState = {
  startDate: null, // ISO yyyy-mm-dd Monday
  projects: [],    // {id,name}
  vehicles: [],    // {id,name}
  employees: [],   // {id,name,colorClass}
  assignments: [], // {id, dateISO, projectId, vehicles:[vehicleId], employees:[employeeId]}
  absences: [],    // {id, dateISO, employeeId, type}
  yearBars: []     // {id, projectId, monthIndex}
};

let state = loadState();

// ---------------- DOM ----------------
const tabBtns = document.querySelectorAll(".tab-btn");
const tabWeek = document.getElementById("tab-week");
const tabYear = document.getElementById("tab-year");

const startDateEl = document.getElementById("startDate");
const btnToday = document.getElementById("btnToday");

const vehicleInput = document.getElementById("vehicleInput");
const addVehicleBtn = document.getElementById("addVehicleBtn");
const vehicleList = document.getElementById("vehicleList");

const employeeInput = document.getElementById("employeeInput");
const addEmployeeBtn = document.getElementById("addEmployeeBtn");
const employeeList = document.getElementById("employeeList");

const absBtns = document.querySelectorAll(".abs-btn");

const trashEl = document.getElementById("trash");
const weeksEl = document.getElementById("weeks");

const projectInput = document.getElementById("projectInput");
const addProjectBtn = document.getElementById("addProjectBtn");

const yearGrid = document.getElementById("yearGrid");

// ---------------- Helpers ----------------
function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }
function saveState(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaultState), ...parsed };
  }catch{
    return structuredClone(defaultState);
  }
}

function pad2(n){ return String(n).padStart(2,"0"); }
function fmtDDMM(d){ return `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}`; }

function mondayOf(date){
  const d = new Date(date);
  d.setHours(12,0,0,0);
  const day = d.getDay(); // 0..6
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d;
}

function isoWeek(date){
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function dateForDayIndex(monday, dayIndex){
  // 0..19 mapped to weekdays only (Mo–Fr)
  const w = Math.floor(dayIndex/5);
  const wd = dayIndex%5;
  const d = new Date(monday);
  d.setDate(d.getDate() + w*7 + wd);
  return d;
}

function toISODate(d){
  const x = new Date(d);
  x.setHours(12,0,0,0);
  return x.toISOString().slice(0,10);
}

function findById(arr, id){ return arr.find(x => x.id === id); }

function setDrag(e, payload){
  e.dataTransfer.setData("application/json", JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "copyMove";
}
function getDrag(e){
  try{
    const raw = e.dataTransfer.getData("application/json");
    return raw ? JSON.parse(raw) : null;
  }catch{ return null; }
}

// Visible 4-week weekday dates (20 workdays)
function getVisibleDates(){
  const monday = new Date(state.startDate);
  monday.setHours(12,0,0,0);
  const dates = [];
  for(let i=0;i<20;i++){
    dates.push(toISODate(dateForDayIndex(monday, i)));
  }
  return dates;
}

// ---------------- Tabs ----------------
tabBtns.forEach(btn=>{
  btn.addEventListener("click", ()=>{
    tabBtns.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const t = btn.dataset.tab;
    tabWeek.classList.toggle("active", t==="week");
    tabYear.classList.toggle("active", t==="year");
  });
});

// ---------------- Start date ----------------
(function initStart(){
  if(!state.startDate){
    state.startDate = toISODate(mondayOf(new Date()));
    saveState();
  }
  startDateEl.value = state.startDate;
})();

btnToday.addEventListener("click", ()=>{
  state.startDate = toISODate(mondayOf(new Date()));
  startDateEl.value = state.startDate;
  saveState();
  renderAll();
});
startDateEl.addEventListener("change", ()=>{
  const d = mondayOf(new Date(startDateEl.value));
  state.startDate = toISODate(d);
  startDateEl.value = state.startDate;
  saveState();
  renderAll();
});

// ---------------- Abwesenheitstyp ----------------
absBtns.forEach(b=>{
  b.addEventListener("click", ()=>{
    absBtns.forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    activeAbsenceType = b.dataset.abs;
  });
});

// ---------------- Add master items ----------------
addVehicleBtn?.addEventListener("click", ()=>{
  const name = vehicleInput.value.trim();
  if(!name) return;
  state.vehicles.push({id: uid(), name});
  vehicleInput.value="";
  saveState(); renderAll();
});
addEmployeeBtn?.addEventListener("click", ()=>{
  const name = employeeInput.value.trim();
  if(!name) return;
  const colorClass = COLORS[state.employees.length % COLORS.length];
  state.employees.push({id: uid(), name, colorClass});
  employeeInput.value="";
  saveState(); renderAll();
});

[vehicleInput, employeeInput].forEach(inp=>{
  if(!inp) return;
  inp.addEventListener("keydown", (e)=>{
    if(e.key !== "Enter") return;
    if(inp===vehicleInput) addVehicleBtn.click();
    if(inp===employeeInput) addEmployeeBtn.click();
  });
});

// ---------------- Projects only in YEAR ----------------
addProjectBtn.addEventListener("click", ()=>{
  const name = projectInput.value.trim();
  if(!name) return;
  const pId = uid();
  state.projects.push({id: pId, name});
  const now = new Date();
  state.yearBars.push({id: uid(), projectId: pId, monthIndex: now.getMonth()});
  projectInput.value="";
  saveState(); renderAll();
});
projectInput.addEventListener("keydown", (e)=>{
  if(e.key === "Enter") addProjectBtn.click();
});

// ---------------- Business rules ----------------
function isEmployeeAbsent(employeeId, dateISO){
  return state.absences.some(a => a.employeeId === employeeId && a.dateISO === dateISO);
}
function employeePlannedElsewhere(employeeId, dateISO, assignmentId){
  return state.assignments.some(a =>
    a.dateISO === dateISO &&
    a.id !== assignmentId &&
    (a.employees || []).includes(employeeId)
  );
}

// ---------------- Trash ----------------
trashEl.addEventListener("dragover", e=>e.preventDefault());
trashEl.addEventListener("drop", e=>{
  e.preventDefault();
  const data = getDrag(e);
  if(!data) return;

  if(data.kind === "assignment"){
    state.assignments = state.assignments.filter(a => a.id !== data.id);
    saveState(); renderAll();
  }
  if(data.kind === "absence"){
    state.absences = state.absences.filter(x => x.id !== data.id);
    saveState(); renderAll();
  }
});

// ---------------- YEAR VIEW ----------------
function renderYear(){
  yearGrid.innerHTML = "";
  const year = new Date().getFullYear();

  for(let m=0; m<12; m++){
    const monthBox = document.createElement("div");
    monthBox.className = "month";

    const head = document.createElement("div");
    head.className = "month-head";
    head.innerHTML = `<span>${MONTHS[m]}</span><span class="small">${year}</span>`;
    monthBox.appendChild(head);

    const drop = document.createElement("div");
    drop.className = "month-drop";

    drop.addEventListener("dragover", e=>e.preventDefault());
    drop.addEventListener("drop", e=>{
      e.preventDefault();
      const data = getDrag(e);
      if(!data) return;

      if(data.kind === "yearbar"){
        const bar = state.yearBars.find(x=>x.id===data.id);
        if(!bar) return;
        bar.monthIndex = m;
        saveState(); renderAll();
        return;
      }

      // From WEEK -> back to YEAR month: remove from current 4-week window
      if(data.kind === "plannedProject"){
        let bar = state.yearBars.find(x => x.projectId === data.projectId);
        if(!bar){
          bar = { id: uid(), projectId: data.projectId, monthIndex: m };
          state.yearBars.push(bar);
        } else {
          bar.monthIndex = m;
        }

        const visible = new Set(getVisibleDates());
        state.assignments = state.assignments.filter(a =>
          !(a.projectId === data.projectId && visible.has(a.dateISO))
        );

        saveState(); renderAll();
        return;
      }
    });

    const bars = state.yearBars.filter(b => b.monthIndex === m);

    bars.forEach(b=>{
      const proj = findById(state.projects, b.projectId);
      if(!proj) return;

      const barEl = document.createElement("div");
      barEl.className = "year-bar";
      barEl.draggable = true;

      barEl.addEventListener("dragstart", e=>{
        setDrag(e, {kind:"yearbar", id:b.id, projectId:b.projectId});
      });

      const name = document.createElement("div");
      name.textContent = proj.name;
      barEl.appendChild(name);

      const del = document.createElement("div");
      del.className = "del";
      del.title = "Projekt löschen (auch aus Planung)";
      del.textContent = "✖";
      del.addEventListener("click", ()=>{
        if(!confirm(`Projekt wirklich löschen: "${proj.name}" ?`)) return;
        state.projects = state.projects.filter(p=>p.id!==proj.id);
        state.yearBars = state.yearBars.filter(x=>x.projectId!==proj.id);
        state.assignments = state.assignments.filter(a=>a.projectId!==proj.id);
        saveState(); renderAll();
      });
      barEl.appendChild(del);

      drop.appendChild(barEl);
    });

    monthBox.appendChild(drop);
    yearGrid.appendChild(monthBox);
  }
}

// ---------------- WEEK VIEW (4 Wochen × 5 Boxen) ----------------
function renderWeeks(){
  weeksEl.innerHTML = "";

  const monday = new Date(state.startDate);
  monday.setHours(12,0,0,0);

  for(let w=0; w<4; w++){
    const weekStart = new Date(monday); weekStart.setDate(weekStart.getDate() + w*7);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate()+4);
    const kw = isoWeek(weekStart);

    const weekBox = document.createElement("div");
    weekBox.className = "week";

    const title = document.createElement("div");
    title.className = "week-title";
    title.textContent = `KW ${kw} · ${fmtDDMM(weekStart)}–${fmtDDMM(weekEnd)}`;
    weekBox.appendChild(title);

    const days = document.createElement("div");
    days.className = "days";

    for(let d=0; d<5; d++){
      const dayIndex = w*5 + d;
      const dayDate = dateForDayIndex(monday, dayIndex);
      const dateISO = toISODate(dayDate);

      const dayEl = document.createElement("div");
      dayEl.className = "day";
      dayEl.dataset.date = dateISO;

      const dayTitle = document.createElement("div");
      dayTitle.className = "day-title";
      dayTitle.textContent = `${["Mo","Di","Mi","Do","Fr"][d]} · ${fmtDDMM(dayDate)}`;
      dayEl.appendChild(dayTitle);

      const hint = document.createElement("div");
      hint.className = "drop-hint";
      hint.textContent = "Projekt aus 12 Monate hierher ziehen (Dauer wird gefragt)";
      dayEl.appendChild(hint);

      // Drop: only from YEAR (yearbar)
      dayEl.addEventListener("dragover", e=>e.preventDefault());
      dayEl.addEventListener("drop", e=>{
        e.preventDefault();
        const data = getDrag(e);
        if(!data) return;
        if(data.kind === "yearbar"){
          createProjectSpanAt(dateISO, data.projectId);
        }
      });

      // Projekte an diesem Tag
      const dayAssignments = state.assignments.filter(a=>a.dateISO===dateISO);
      dayAssignments.forEach(a=>{
        dayEl.appendChild(renderProjectAssignmentBlock(a));
      });

      days.appendChild(dayEl);
    }

    weekBox.appendChild(days);
    weeksEl.appendChild(weekBox);
  }
}

function createProjectSpanAt(startDateISO, projectId){
  const raw = prompt("Wie viele ARBEITSTAGE (Mo–Fr) soll das Projekt laufen? (1–20)", "1");
  if(!raw) return;
  let len = parseInt(raw, 10);
  if(!Number.isFinite(len) || len < 1) len = 1;
  len = Math.min(len, 20);

  const visibleDates = getVisibleDates();
  const startIdx = visibleDates.indexOf(startDateISO);
  if(startIdx < 0) return;

  len = Math.min(len, 20 - startIdx);

  for(let i=0;i<len;i++){
    const dateISO = visibleDates[startIdx+i];
    const exists = state.assignments.some(a=>a.dateISO===dateISO && a.projectId===projectId);
    if(exists) continue;
    state.assignments.push({ id: uid(), dateISO, projectId, vehicles: [], employees: [] });
  }

  // optional: aus Parkplatz entfernen (damit es wie „vom Brett genommen“ ist)
  state.yearBars = state.yearBars.filter(b=>b.projectId!==projectId);

  saveState(); renderAll();
}

function renderProjectAssignmentBlock(a){
  const proj = findById(state.projects, a.projectId);

  const block = document.createElement("div");
  block.className = "project-block";
  block.draggable = true;

  // Ziehen = Projekt zurück in 12 Monate (entfernt aus 4 Wochen)
  block.addEventListener("dragstart", e=>{
    setDrag(e, {kind:"plannedProject", projectId: a.projectId});
  });

  const title = document.createElement("div");
  title.className = "project-title";
  title.textContent = proj ? proj.name : "(Projekt gelöscht)";
  block.appendChild(title);

  // Tag-Einsatz löschen per Klick (stabiler als Drag-to-trash)
  const delBtn = document.createElement("button");
  delBtn.className = "btn secondary";
  delBtn.style.padding = "6px 10px";
  delBtn.style.marginBottom = "6px";
  delBtn.textContent = "✖ Tag löschen";
  delBtn.addEventListener("click", ()=>{
    if(!confirm("Diesen Tag-Einsatz wirklich löschen?")) return;
    state.assignments = state.assignments.filter(x=>x.id!==a.id);
    saveState(); renderAll();
  });
  block.appendChild(delBtn);

  return block;
}

// ---------------- Render all ----------------
function renderAll(){
  renderYear();
  renderWeeks();
}

renderAll();
