// Plantafel — Komplett (localStorage)
// - 12 Monate: Projekt-Parkplatz + Balken (nur Projekte)
// - 4 Wochen: zeigt NUR geplante Tages-Einsätze (nichts automatisch)
// - Projekt aus 12 Monate -> Tag: erzeugt Tages-Einsätze (Prompt Arbeitstage)
// - Projekt aus Woche -> Monat: entfernt Projekt aus aktuellem 4-Wochen-Fenster (zurück parken)
// - Fahrzeuge/Mitarbeiter pro Tag einzeln
// - Abwesenheiten als eigener Balken, blockieren MA

const LS_KEY = "plantafel_full_parking_v1";

const COLORS = ["blue","green","orange","purple","teal"];
const MONTHS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

let activeAbsenceType = "urlaub";

const defaultState = {
  startDate: null, // ISO yyyy-mm-dd Monday
  projects: [],    // {id,name}
  vehicles: [],    // {id,name}
  employees: [],   // {id,name,colorClass}

  // daily assignments: {id, dateISO, projectId, vehicles:[vehicleId], employees:[employeeId]}
  assignments: [],

  // absences: {id, dateISO, employeeId, type}
  absences: [],

  // year bars: {id, projectId, monthIndex}  (einfach: Projekt "liegt" in einem Monat; du kannst es verschieben)
  // (Kein Start/Ende, keine Dauer — nur Parkplatz/Zuordnung zu einem Monat)
  yearBars: []
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
addVehicleBtn.addEventListener("click", ()=>{
  const name = vehicleInput.value.trim();
  if(!name) return;
  state.vehicles.push({id: uid(), name});
  vehicleInput.value="";
  saveState(); renderAll();
});
addEmployeeBtn.addEventListener("click", ()=>{
  const name = employeeInput.value.trim();
  if(!name) return;
  const colorClass = COLORS[state.employees.length % COLORS.length];
  state.employees.push({id: uid(), name, colorClass});
  employeeInput.value="";
  saveState(); renderAll();
});
[vehicleInput, employeeInput].forEach(inp=>{
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
  // automatically "park" it into current month
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
    drop.dataset.month = String(m);

    drop.addEventListener("dragover", e=>e.preventDefault());
    drop.addEventListener("drop", e=>{
      e.preventDefault();
      const data = getDrag(e);
      if(!data) return;

      // Move yearbar
      if(data.kind === "yearbar"){
        const bar = state.yearBars.find(x=>x.id===data.id);
        if(!bar) return;
        bar.monthIndex = m;
        saveState(); renderAll();
        return;
      }

      // From WEEK -> back to YEAR month: remove from current 4-week window
      if(data.kind === "plannedProject"){
        // ensure a year bar exists
        let bar = state.yearBars.find(x => x.projectId === data.projectId);
        if(!bar){
          bar = { id: uid(), projectId: data.projectId, monthIndex: m };
          state.yearBars.push(bar);
        } else {
          bar.monthIndex = m;
        }

        // remove all assignments for that project within current visible 4 weeks
        const visible = new Set(getVisibleDates());
        state.assignments = state.assignments.filter(a =>
          !(a.projectId === data.projectId && visible.has(a.dateISO))
        );

        saveState(); renderAll();
        return;
      }
    });

    // Bars in this month
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
        // delete project
        state.projects = state.projects.filter(p=>p.id!==proj.id);
        // delete year bars and assignments
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

// ---------------- WEEK VIEW ----------------
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

      // Abwesenheiten
      const absTitle = document.createElement("div");
      absTitle.className = "day-section-title";
      absTitle.textContent = "Abwesenheiten";
      dayEl.appendChild(absTitle);

      const absZone = document.createElement("div");
      absZone.className = "day-dropzone";
      absZone.addEventListener("dragover", e=>e.preventDefault());
      absZone.addEventListener("drop", e=>{
        e.preventDefault();
        const data = getDrag(e);
        if(!data) return;
        if(data.kind === "master" && data.type === "employee"){
          const exists = state.absences.some(a=>a.employeeId===data.id && a.dateISO===dateISO);
          if(exists) return;

          state.absences.push({id: uid(), dateISO, employeeId: data.id, type: activeAbsenceType});

          // remove employee from any project that day
          state.assignments.forEach(a=>{
            if(a.dateISO === dateISO){
              a.employees = (a.employees||[]).filter(id=>id!==data.id);
            }
          });

          saveState(); renderAll();
        }
      });

      const absItems = state.absences.filter(a=>a.dateISO===dateISO);
      absItems.forEach(a=>{
        const emp = findById(state.employees, a.employeeId);
        if(!emp) return;
        const chip = document.createElement("div");
        chip.className = `abs-chip ${a.type}`;
        chip.textContent = `${a.type.toUpperCase()} – ${emp.name}`;
        chip.draggable = true;
        chip.addEventListener("dragstart", e=>{
          setDrag(e, {kind:"absence", id:a.id});
        });
        chip.title = "Zum Löschen in „Entfernen“ ziehen";
        absZone.appendChild(chip);
      });

      dayEl.appendChild(absZone);

      // Projects planned this day
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

  const maxLen = 20 - startIdx;
  len = Math.min(len, maxLen);

  for(let i=0;i<len;i++){
    const dateISO = visibleDates[startIdx+i];
    // no duplicate same project same day
    const exists = state.assignments.some(a=>a.dateISO===dateISO && a.projectId===projectId);
    if(exists) continue;
    state.assignments.push({
      id: uid(),
      dateISO,
      projectId,
      vehicles: [],
      employees: []
    });
  }

  saveState(); renderAll();
}

function renderProjectAssignmentBlock(a){
  const proj = findById(state.projects, a.projectId);

  const block = document.createElement("div");
  block.className = "project-block";
  block.draggable = true;

  // Drag this project back into YEAR month (removes from current window)
  block.addEventListener("dragstart", e=>{
    setDrag(e, {kind:"plannedProject", projectId: a.projectId});
  });

  const title = document.createElement("div");
  title.className = "project-title";
  title.textContent = proj ? proj.name : "(Projekt gelöscht)";
  block.appendChild(title);

  // Fahrzeuge
  const vTitle = document.createElement("div");
  vTitle.className = "day-section-title";
  vTitle.textContent = "Fahrzeuge";
  block.appendChild(vTitle);

  const vZone = document.createElement("div");
  vZone.className = "day-dropzone";
  vZone.addEventListener("dragover", e=>e.preventDefault());
  vZone.addEventListener("drop", e=>{
    e.preventDefault();
    const data = getDrag(e);
    if(!data) return;
    if(data.kind === "master" && data.type === "vehicle"){
      if(!a.vehicles.includes(data.id)) a.vehicles.push(data.id);
      saveState(); renderAll();
    }
  });

  (a.vehicles||[]).forEach(id=>{
    const v = findById(state.vehicles, id);
    if(!v) return;
    const chip = document.createElement("span");
    chip.className = "magnet vehicle";
    chip.textContent = v.name;
    chip.style.cursor = "pointer";
    chip.title = "Klick = entfernen (nur dieser Tag)";
    chip.addEventListener("click", ()=>{
      a.vehicles = a.vehicles.filter(x=>x!==id);
      saveState(); renderAll();
    });
    vZone.appendChild(chip);
  });
  block.appendChild(vZone);

  // Mitarbeiter
  const eTitle = document.createElement("div");
  eTitle.className = "day-section-title";
  eTitle.textContent = "Mitarbeiter";
  block.appendChild(eTitle);

  const eZone = document.createElement("div");
  eZone.className = "day-dropzone";
  eZone.addEventListener("dragover", e=>e.preventDefault());
  eZone.addEventListener("drop", e=>{
    e.preventDefault();
    const data = getDrag(e);
    if(!data) return;
    if(!(data.kind === "master" && data.type === "employee")) return;

    const dateISO = a.dateISO;

    if(isEmployeeAbsent(data.id, dateISO)){
      alert("Dieser Mitarbeiter ist an dem Tag abwesend (Krank/Urlaub/Schule).");
      return;
    }
    if(employeePlannedElsewhere(data.id, dateISO, a.id)){
      alert("Dieser Mitarbeiter ist an dem Tag schon auf einem anderen Projekt eingeplant.");
      return;
    }

    if(!a.employees.includes(data.id)) a.employees.push(data.id);
    saveState(); renderAll();
  });

  (a.employees||[]).forEach(id=>{
    const emp = findById(state.employees, id);
    if(!emp) return;
    const chip = document.createElement("span");
    chip.className = `magnet employee ${emp.colorClass}`;
    chip.textContent = emp.name;
    chip.style.cursor = "pointer";
    chip.title = "Klick = entfernen (nur dieser Tag)";
    chip.addEventListener("click", ()=>{
      a.employees = a.employees.filter(x=>x!==id);
      saveState(); renderAll();
    });
    eZone.appendChild(chip);
  });
  block.appendChild(eZone);

  // Tag-Einsatz separat löschbar über Trash:
  // (ziehen des Blocks in Trash löscht nur diesen Tag)
  // Dafür brauchen wir ein eigenes Drag-Target:
  block.addEventListener("dragstart", (e)=>{
    // zusätzlich: wenn du in Trash ziehst, soll "assignment" löschen
    // wir hängen die assignment-id mit an:
    const payload = {kind:"assignment", id:a.id, projectId:a.projectId};
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copyMove";
  });

  return block;
}

// ---------------- Masters for week (vehicles/employees) ----------------
function renderMasters(){
  vehicleList.innerHTML = "";
  employeeList.innerHTML = "";

  // Vehicles
  state.vehicles.forEach(v=>{
    const m = document.createElement("span");
    m.className = "magnet vehicle";
    m.textContent = v.name;
    m.draggable = true;
    m.addEventListener("dragstart", e=>{
      setDrag(e, {kind:"master", type:"vehicle", id:v.id});
    });

    const del = document.createElement("span");
    del.className = "del"; del.textContent = "✖";
    del.title = "Fahrzeug löschen (Stammdaten)";
    del.addEventListener("click", ()=>{
      if(!confirm(`Fahrzeug wirklich löschen: "${v.name}"?`)) return;
      state.vehicles = state.vehicles.filter(x=>x.id!==v.id);
      state.assignments.forEach(a=>{ a.vehicles = (a.vehicles||[]).filter(id=>id!==v.id); });
      saveState(); renderAll();
    });
    m.appendChild(del);

    vehicleList.appendChild(m);
  });

  // Employees
  state.employees.forEach(emp=>{
    const m = document.createElement("span");
    m.className = `magnet employee ${emp.colorClass}`;
    m.textContent = emp.name;
    m.draggable = true;
    m.addEventListener("dragstart", e=>{
      setDrag(e, {kind:"master", type:"employee", id:emp.id});
    });

    const del = document.createElement("span");
    del.className = "del"; del.textContent = "✖";
    del.title = "Mitarbeiter löschen (Stammdaten)";
    del.addEventListener("click", ()=>{
      if(!confirm(`Mitarbeiter wirklich löschen: "${emp.name}"?`)) return;
      state.employees = state.employees.filter(x=>x.id!==emp.id);
      state.assignments.forEach(a=>{ a.employees = (a.employees||[]).filter(id=>id!==emp.id); });
      state.absences = state.absences.filter(x=>x.employeeId!==emp.id);
      saveState(); renderAll();
    });
    m.appendChild(del);

    employeeList.appendChild(m);
  });
}

// ---------------- Render all ----------------
function renderAll(){
  renderMasters();
  renderYear();
  renderWeeks();
}

renderAll();
