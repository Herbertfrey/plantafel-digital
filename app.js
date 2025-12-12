// Plantafel v1 — localStorage
// - Stammlisten bleiben oben (ziehen = kopieren)
// - 4 Wochen (KW + Datum), Projekte pro Tag, KFZ rot, MA farbig
// - Abwesenheiten als eigener Balken, blockiert Mitarbeiter
// - 12 Monate (3×4) nur Projekte, ziehbar + in 4 Wochen ziehen

const LS_KEY = "plantafel_v1_full";

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
  // year plan: bars by month index only: {id, projectId, startMonth, monthsLen}
  yearPlan: []
};

let state = loadState();

// ---------------- DOM ----------------
const tabBtns = document.querySelectorAll(".tab-btn");
const tabWeek = document.getElementById("tab-week");
const tabYear = document.getElementById("tab-year");

const startDateEl = document.getElementById("startDate");
const btnToday = document.getElementById("btnToday");

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

const absBtns = document.querySelectorAll(".abs-btn");

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
function getWeekStart(monday, weekIndex){
  const d = new Date(monday);
  d.setDate(d.getDate() + weekIndex*7);
  return d;
}
function dateForDayIndex(monday, dayIndex){
  // 0..19 mapped to weekdays only
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

// ---------------- Absence type toggle ----------------
absBtns.forEach(b=>{
  b.addEventListener("click", ()=>{
    absBtns.forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    activeAbsenceType = b.dataset.abs;
  });
});

// ---------------- Add master items ----------------
addProjectBtn.addEventListener("click", ()=>{
  const name = projectInput.value.trim();
  if(!name) return;
  state.projects.push({id: uid(), name});
  projectInput.value="";
  saveState(); renderAll();
});
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

// enter key
[projectInput, vehicleInput, employeeInput].forEach(inp=>{
  inp.addEventListener("keydown", (e)=>{
    if(e.key !== "Enter") return;
    if(inp===projectInput) addProjectBtn.click();
    if(inp===vehicleInput) addVehicleBtn.click();
    if(inp===employeeInput) addEmployeeBtn.click();
  });
});

// ---------------- Trash (remove planned elements only) ----------------
trashEl.addEventListener("dragover", e=>e.preventDefault());
trashEl.addEventListener("drop", e=>{
  e.preventDefault();
  const data = getDrag(e);
  if(!data) return;

  // remove assignment (day project block)
  if(data.kind === "assignment"){
    state.assignments = state.assignments.filter(a => a.id !== data.id);
    saveState(); renderAll();
  }

  // remove absence item
  if(data.kind === "absence"){
    state.absences = state.absences.filter(x => x.id !== data.id);
    saveState(); renderAll();
  }

  // year bar
  if(data.kind === "yearbar"){
    state.yearPlan = state.yearPlan.filter(x => x.id !== data.id);
    saveState(); renderAll();
  }
});

// ---------------- Rendering masters ----------------
function renderMasters(){
  projectList.innerHTML = "";
  vehicleList.innerHTML = "";
  employeeList.innerHTML = "";

  // Projects
  state.projects.forEach(p=>{
    const m = document.createElement("span");
    m.className = "magnet project-master";
    m.textContent = p.name;
    m.draggable = true;
    m.addEventListener("dragstart", e=>{
      setDrag(e, {kind:"master", type:"project", id:p.id});
    });

    const del = document.createElement("span");
    del.className = "del"; del.textContent = "✖";
    del.title = "Projekt löschen (Stammdaten)";
    del.addEventListener("click", ()=>{
      if(!confirm(`Projekt wirklich löschen: "${p.name}"?`)) return;
      state.projects = state.projects.filter(x=>x.id!==p.id);
      // remove all uses
      state.assignments = state.assignments.filter(a=>a.projectId!==p.id);
      state.yearPlan = state.yearPlan.filter(y=>y.projectId!==p.id);
      saveState(); renderAll();
    });
    m.appendChild(del);
    projectList.appendChild(m);
  });

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
      // remove from assignments
      state.assignments.forEach(a=>{
        a.vehicles = a.vehicles.filter(id=>id!==v.id);
      });
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
      // remove from assignments + absences
      state.assignments.forEach(a=>{
        a.employees = a.employees.filter(id=>id!==emp.id);
      });
      state.absences = state.absences.filter(x=>x.employeeId!==emp.id);
      saveState(); renderAll();
    });
    m.appendChild(del);
    employeeList.appendChild(m);
  });
}

// ---------------- Business rules ----------------
function isEmployeeAbsent(employeeId, dateISO){
  return state.absences.some(a => a.employeeId === employeeId && a.dateISO === dateISO);
}
function employeePlannedElsewhere(employeeId, dateISO, assignmentId){
  // already in any assignment that day (not same)
  return state.assignments.some(a =>
    a.dateISO === dateISO &&
    a.id !== assignmentId &&
    (a.employees || []).includes(employeeId)
  );
}

// ---------------- Week view rendering ----------------
function renderWeeks(){
  weeksEl.innerHTML = "";
  const monday = new Date(state.startDate);
  monday.setHours(12,0,0,0);

  for(let w=0; w<4; w++){
    const weekStart = getWeekStart(monday, w);
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
      hint.textContent = "Projekt hierher ziehen (Dauer in Arbeitstagen wird gefragt)";
      dayEl.appendChild(hint);

      // day drop: accept project from master or year bar
      dayEl.addEventListener("dragover", e=>e.preventDefault());
      dayEl.addEventListener("drop", e=>{
        e.preventDefault();
        const data = getDrag(e);
        if(!data) return;

        if(data.kind === "master" && data.type === "project"){
          createProjectSpanAt(dateISO, data.id);
        }
        if(data.kind === "yearbar"){
          createProjectSpanAt(dateISO, data.projectId);
        }
      });

      // Abwesenheiten Zone
      const absTitle = document.createElement("div");
      absTitle.className = "day-section-title";
      absTitle.textContent = "Abwesenheiten";
      dayEl.appendChild(absTitle);

      const absZone = document.createElement("div");
      absZone.className = "day-dropzone";
      absZone.dataset.zone = "absences";
      absZone.addEventListener("dragover", e=>e.preventDefault());
      absZone.addEventListener("drop", e=>{
        e.preventDefault();
        const data = getDrag(e);
        if(!data) return;
        if(data.kind === "master" && data.type === "employee"){
          // create absence entry for employee
          const exists = state.absences.some(a=>a.employeeId===data.id && a.dateISO===dateISO);
          if(exists) return;
          state.absences.push({id: uid(), dateISO, employeeId: data.id, type: activeAbsenceType});
          // also remove from any assignments that day
          state.assignments.forEach(a=>{
            if(a.dateISO===dateISO){
              a.employees = (a.employees||[]).filter(id=>id!==data.id);
            }
          });
          saveState(); renderAll();
        }
      });

      // render absences
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

      // Projekte (Assignments) dieses Tages
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

  const monday = new Date(state.startDate);
  monday.setHours(12,0,0,0);

  // Build list of visible 20 workdays
  const visibleDates = [];
  for(let i=0;i<20;i++){
    visibleDates.push(toISODate(dateForDayIndex(monday, i)));
  }

  const startIdx = visibleDates.indexOf(startDateISO);
  const maxLen = startIdx >= 0 ? (20 - startIdx) : 20;
  len = Math.min(len, maxLen);

  for(let i=0;i<len;i++){
    const dateISO = startIdx >= 0 ? visibleDates[startIdx+i] : startDateISO;
    // create one assignment per day, but do not duplicate same project same day
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
  block.addEventListener("dragstart", e=>{
    setDrag(e, {kind:"assignment", id:a.id});
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

    // block if absent
    if(isEmployeeAbsent(data.id, dateISO)){
      alert("Dieser Mitarbeiter ist an dem Tag abwesend (Krank/Urlaub/Schule).");
      return;
    }
    // block if already planned elsewhere same day
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

  return block;
}

// ---------------- Year view ----------------
function renderYear(){
  yearGrid.innerHTML = "";

  for(let m=0; m<12; m++){
    const monthBox = document.createElement("div");
    monthBox.className = "month";

    const head = document.createElement("div");
    head.className = "month-head";
    head.innerHTML = `<span>${MONTHS[m]}</span><span class="small">${new Date().getFullYear()}</span>`;
    monthBox.appendChild(head);

    const drop = document.createElement("div");
    drop.className = "month-drop";
    drop.dataset.month = String(m);

    drop.addEventListener("dragover", e=>e.preventDefault());
    drop.addEventListener("drop", e=>{
      e.preventDefault();
      const data = getDrag(e);
      if(!data) return;

      // project from master -> add year plan bar (default 1 month)
      if(data.kind==="master" && data.type==="project"){
        state.yearPlan.push({ id: uid(), projectId: data.id, startMonth: m, monthsLen: 1 });
        saveState(); renderAll();
      }

      // move existing yearbar to new month
      if(data.kind==="yearbar"){
        const bar = state.yearPlan.find(x=>x.id===data.id);
        if(!bar) return;
        bar.startMonth = m;
        saveState(); renderAll();
      }
    });

    // render bars that start in this month
    const bars = state.yearPlan
      .filter(b=>b.startMonth === m)
      .map(b=>({ ...b }));

    bars.forEach(b=>{
      const proj = findById(state.projects, b.projectId);
      const barEl = document.createElement("div");
      barEl.className = "year-bar";
      barEl.draggable = true;
      barEl.addEventListener("dragstart", e=>{
        setDrag(e, {kind:"yearbar", id:b.id, projectId:b.projectId});
      });

      const name = document.createElement("div");
      name.textContent = proj ? proj.name : "(Projekt gelöscht)";
      barEl.appendChild(name);

      const resize = document.createElement("div");
      resize.className = "resize";
      resize.title = "Klick = +1 Monat (Rechts verlängern)";
      resize.textContent = `+${b.monthsLen}M`;
      resize.addEventListener("click", ()=>{
        const bar = state.yearPlan.find(x=>x.id===b.id);
        if(!bar) return;
        bar.monthsLen = Math.min(12, bar.monthsLen + 1);
        saveState(); renderAll();
      });
      barEl.appendChild(resize);

      drop.appendChild(barEl);
    });

    monthBox.appendChild(drop);
    yearGrid.appendChild(monthBox);
  }
}

// ---------------- Render all ----------------
function renderAll(){
  renderMasters();
  renderWeeks();
  renderYear();
}

renderAll();
