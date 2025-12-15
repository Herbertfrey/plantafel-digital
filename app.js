/* =========================================================
   PLANTAFEL – NEUAUFBAU NACH WHITEBOARD-LOGIK
   ========================================================= */

const LS_KEY = "plantafel_v2";

/* ---------- STATE ---------- */
const defaultState = {
  startDate: null,              // Montag ISO
  projects: [],                 // {id, name}
  parking: [],                  // [projectId]
  months: {},                   // {monthIndex: [projectId]}
  assignments: [],              // {id, projectId, dateISO, employees:[], vehicles:[]}
  employees: [],                // {id, name, color}
  vehicles: []                  // {id, name}
};

let state = loadState();

/* ---------- HELPERS ---------- */
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function saveState() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}
function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}
function mondayOf(d) {
  const x = new Date(d);
  const day = x.getDay() || 7;
  x.setDate(x.getDate() - day + 1);
  x.setHours(12,0,0,0);
  return x;
}
function iso(d){ return d.toISOString().slice(0,10); }

/* ---------- INIT ---------- */
if (!state.startDate) {
  state.startDate = iso(mondayOf(new Date()));
  saveState();
}

/* ---------- DOM ---------- */
const weeksEl   = document.getElementById("weeks");
const yearGrid = document.getElementById("yearGrid");
const startEl  = document.getElementById("startDate");
const btnToday = document.getElementById("btnToday");
const trashEl  = document.getElementById("trash");

const projectInput = document.getElementById("projectInput");
const addProjectBtn = document.getElementById("addProjectBtn");

const employeeInput = document.getElementById("employeeInput");
const addEmployeeBtn = document.getElementById("addEmployeeBtn");
const employeeList = document.getElementById("employeeList");

const vehicleInput = document.getElementById("vehicleInput");
const addVehicleBtn = document.getElementById("addVehicleBtn");
const vehicleList = document.getElementById("vehicleList");

/* ---------- START DATE ---------- */
startEl.value = state.startDate;
btnToday.onclick = () => {
  state.startDate = iso(mondayOf(new Date()));
  startEl.value = state.startDate;
  saveState(); render();
};
startEl.onchange = () => {
  state.startDate = iso(mondayOf(new Date(startEl.value)));
  startEl.value = state.startDate;
  saveState(); render();
};

/* =========================================================
   PROJEKTE – PARKPLATZ
   ========================================================= */

addProjectBtn.onclick = () => {
  const name = projectInput.value.trim();
  if(!name) return;
  const id = uid();
  state.projects.push({id, name});
  state.parking.push(id);               // 👉 IMMER zuerst Parkplatz
  projectInput.value = "";
  saveState(); render();
};

/* =========================================================
   MITARBEITER / FAHRZEUGE (IMMER OBEN)
   ========================================================= */

addEmployeeBtn.onclick = () => {
  const name = employeeInput.value.trim();
  if(!name) return;
  state.employees.push({id:uid(), name});
  employeeInput.value="";
  saveState(); render();
};
addVehicleBtn.onclick = () => {
  const name = vehicleInput.value.trim();
  if(!name) return;
  state.vehicles.push({id:uid(), name});
  vehicleInput.value="";
  saveState(); render();
};

/* =========================================================
   DRAG & DROP – ZENTRALE LOGIK
   ========================================================= */

function setDrag(e, payload){
  e.dataTransfer.setData("application/json", JSON.stringify(payload));
}
function getDrag(e){
  try{ return JSON.parse(e.dataTransfer.getData("application/json")); }
  catch{ return null; }
}

/* ---------- TRASH = NUR EIN TAG ---------- */
trashEl.ondragover = e=>e.preventDefault();
trashEl.ondrop = e=>{
  const d = getDrag(e);
  if(d?.kind==="assignment"){
    state.assignments = state.assignments.filter(a=>a.id!==d.id);
    saveState(); render();
  }
};

/* =========================================================
   12 MONATE – VORAUSSCHAU
   ========================================================= */

function renderYear(){
  yearGrid.innerHTML="";
  for(let m=0;m<12;m++){
    if(!state.months[m]) state.months[m]=[];

    const box=document.createElement("div");
    box.className="month";

    const drop=document.createElement("div");
    drop.className="month-drop";
    drop.ondragover=e=>e.preventDefault();
    drop.ondrop=e=>{
      const d=getDrag(e);
      if(!d) return;

      // Parkplatz → Monat
      if(d.kind==="parking"){
        state.parking=state.parking.filter(id=>id!==d.projectId);
        state.months[m].push(d.projectId);
      }

      // Woche → Monat (zurück)
      if(d.kind==="plannedProject"){
        removeAssignments(d.projectId);
        state.months[m].push(d.projectId);
      }
      saveState(); render();
    };

    state.months[m].forEach(pid=>{
      const p = state.projects.find(x=>x.id===pid);
      if(!p) return;
      const el=document.createElement("div");
      el.className="year-bar";
      el.textContent=p.name;
      el.draggable=true;
      el.ondragstart=e=>setDrag(e,{kind:"month",projectId:pid,month:m});
      drop.appendChild(el);
    });

    box.appendChild(drop);
    yearGrid.appendChild(box);
  }
}

/* =========================================================
   4 WOCHEN – OPERATIV
   ========================================================= */

function renderWeeks(){
  weeksEl.innerHTML="";
  const start = new Date(state.startDate);

  for(let w=0;w<4;w++){
    const week=document.createElement("div");
    week.className="week";

    const days=document.createElement("div");
    days.className="days";

    for(let d=0;d<5;d++){
      const day=new Date(start);
      day.setDate(day.getDate()+w*7+d);
      const dateISO=iso(day);

      const cell=document.createElement("div");
      cell.className="day";
      cell.ondragover=e=>e.preventDefault();
      cell.ondrop=e=>{
        const drag=getDrag(e);
        if(!drag) return;

        // Parkplatz → Tag
        if(drag.kind==="parking"){
          createAssignments(drag.projectId, dateISO);
          state.parking=state.parking.filter(id=>id!==drag.projectId);
        }
        saveState(); render();
      };

      state.assignments
        .filter(a=>a.dateISO===dateISO)
        .forEach(a=>cell.appendChild(renderAssignment(a)));

      days.appendChild(cell);
    }
    week.appendChild(days);
    weeksEl.appendChild(week);
  }
}

/* ---------- ASSIGNMENT ---------- */
function renderAssignment(a){
  const p=state.projects.find(x=>x.id===a.projectId);
  const el=document.createElement("div");
  el.className="project-block";
  el.draggable=true;

  // BLOCK = EIN TAG LÖSCHEN
  el.ondragstart=e=>setDrag(e,{kind:"assignment",id:a.id});

  // TITEL = PROJEKT ZURÜCK
  const title=document.createElement("div");
  title.className="project-title";
  title.textContent=p.name;
  title.draggable=true;
  title.ondragstart=e=>{
    e.stopPropagation();
    setDrag(e,{kind:"plannedProject",projectId:a.projectId});
  };
  el.appendChild(title);

  return el;
}

/* ---------- HILFSFUNKTIONEN ---------- */
function createAssignments(projectId,startISO){
  const len=parseInt(prompt("Wie viele Arbeitstage?","1"),10)||1;
  const start=new Date(startISO);
  for(let i=0;i<len;i++){
    const d=new Date(start);
    d.setDate(d.getDate()+i);
    state.assignments.push({
      id:uid(), projectId, dateISO:iso(d),
      employees:[], vehicles:[]
    });
  }
}
function removeAssignments(projectId){
  state.assignments=state.assignments.filter(a=>a.projectId!==projectId);
}

/* =========================================================
   RENDER
   ========================================================= */
function render(){
  renderYear();
  renderWeeks();
}
render();
