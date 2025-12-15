// ================================
// PLANTAFEL – STABILER STAND
// ================================

const LS_KEY = "plantafel_full_parking_v1";

const COLORS = ["blue","green","orange","purple","teal"];
const MONTHS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

let activeAbsenceType = "urlaub";

const defaultState = {
  startDate: null,
  projects: [],
  vehicles: [],
  employees: [],
  assignments: [],
  absences: [],
  yearBars: [] // {id, projectId, monthIndex}
};

let state = loadState();

// ================================
// DOM
// ================================
const startDateEl = document.getElementById("startDate");
const btnToday = document.getElementById("btnToday");
const weeksEl = document.getElementById("weeks");
const yearGrid = document.getElementById("yearGrid");
const trashEl = document.getElementById("trash");

const projectInput = document.getElementById("projectInput");
const addProjectBtn = document.getElementById("addProjectBtn");

const vehicleInput = document.getElementById("vehicleInput");
const addVehicleBtn = document.getElementById("addVehicleBtn");
const vehicleList = document.getElementById("vehicleList");

const employeeInput = document.getElementById("employeeInput");
const addEmployeeBtn = document.getElementById("addEmployeeBtn");
const employeeList = document.getElementById("employeeList");

const absBtns = document.querySelectorAll(".abs-btn");

// ================================
// HELPERS
// ================================
function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function saveState(){
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}
function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return structuredClone(defaultState);
    return { ...structuredClone(defaultState), ...JSON.parse(raw) };
  }catch{
    return structuredClone(defaultState);
  }
}
function mondayOf(date){
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(12,0,0,0);
  return d;
}
function toISO(d){
  return d.toISOString().slice(0,10);
}
function setDrag(e,p){
  e.dataTransfer.setData("application/json", JSON.stringify(p));
}
function getDrag(e){
  try{ return JSON.parse(e.dataTransfer.getData("application/json")); }
  catch{ return null; }
}

// ================================
// INIT
// ================================
if(!state.startDate){
  state.startDate = toISO(mondayOf(new Date()));
  saveState();
}
startDateEl.value = state.startDate;

btnToday.onclick = ()=>{
  state.startDate = toISO(mondayOf(new Date()));
  startDateEl.value = state.startDate;
  saveState(); renderAll();
};

startDateEl.onchange = ()=>{
  state.startDate = toISO(mondayOf(new Date(startDateEl.value)));
  startDateEl.value = state.startDate;
  saveState(); renderAll();
};

// ================================
// ABWESENHEIT
// ================================
absBtns.forEach(b=>{
  b.onclick = ()=>{
    absBtns.forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    activeAbsenceType = b.dataset.abs;
  };
});

// ================================
// STAMMDATEN
// ================================
addProjectBtn.onclick = ()=>{
  const name = projectInput.value.trim();
  if(!name) return;
  const pid = uid();
  state.projects.push({id:pid, name});
  state.yearBars.push({id:uid(), projectId:pid, monthIndex:new Date().getMonth()});
  projectInput.value="";
  saveState(); renderAll();
};

addVehicleBtn.onclick = ()=>{
  const name = vehicleInput.value.trim();
  if(!name) return;
  state.vehicles.push({id:uid(), name});
  vehicleInput.value="";
  saveState(); renderAll();
};

addEmployeeBtn.onclick = ()=>{
  const name = employeeInput.value.trim();
  if(!name) return;
  const colorClass = COLORS[state.employees.length % COLORS.length];
  state.employees.push({id:uid(), name, colorClass});
  employeeInput.value="";
  saveState(); renderAll();
};

// ================================
// TRASH
// ================================
trashEl.ondragover = e=>e.preventDefault();
trashEl.ondrop = e=>{
  const d = getDrag(e);
  if(d?.kind==="assignment"){
    state.assignments = state.assignments.filter(a=>a.id!==d.id);
    saveState(); renderAll();
  }
  if(d?.kind==="absence"){
    state.absences = state.absences.filter(a=>a.id!==d.id);
    saveState(); renderAll();
  }
};

// ================================
// YEAR VIEW
// ================================
function renderYear(){
  yearGrid.innerHTML="";
  const year = new Date().getFullYear();

  for(let m=0;m<12;m++){
    const box=document.createElement("div");
    box.className="month";

    const head=document.createElement("div");
    head.className="month-head";
    head.innerHTML=`<span>${MONTHS[m]}</span><span class="small">${year}</span>`;
    box.appendChild(head);

    const drop=document.createElement("div");
    drop.className="month-drop";
    drop.ondragover=e=>e.preventDefault();
    drop.ondrop=e=>{
      const d=getDrag(e);
      if(!d) return;
      if(d.kind==="plannedProject"){
        state.assignments = state.assignments.filter(a=>a.projectId!==d.projectId);
        const bar = state.yearBars.find(x=>x.projectId===d.projectId);
        if(bar) bar.monthIndex=m;
        saveState(); renderAll();
      }
    };

    state.yearBars.filter(b=>b.monthIndex===m).forEach(b=>{
      const p = state.projects.find(x=>x.id===b.projectId);
      if(!p) return;
      const el=document.createElement("div");
      el.className="year-bar";
      el.textContent=p.name;
      el.draggable=true;
      el.ondragstart=e=>setDrag(e,{kind:"yearbar", projectId:b.projectId});
      drop.appendChild(el);
    });

    box.appendChild(drop);
    yearGrid.appendChild(box);
  }
}

// ================================
// WEEKS
// ================================
function renderWeeks(){
  weeksEl.innerHTML="";
  const start=new Date(state.startDate);

  for(let w=0;w<4;w++){
    const week=document.createElement("div");
    week.className="week";

    const days=document.createElement("div");
    days.className="days";

    for(let d=0;d<5;d++){
      const day=new Date(start);
      day.setDate(day.getDate()+w*7+d);
      const iso=toISO(day);

      const cell=document.createElement("div");
      cell.className="day";
      cell.ondragover=e=>e.preventDefault();
      cell.ondrop=e=>{
        const drag=getDrag(e);
        if(drag?.kind==="yearbar"){
          createAssignments(drag.projectId, iso);
          saveState(); renderAll();
        }
      };

      state.assignments.filter(a=>a.dateISO===iso)
        .forEach(a=>cell.appendChild(renderAssignment(a)));

      days.appendChild(cell);
    }
    week.appendChild(days);
    weeksEl.appendChild(week);
  }
}

// ================================
// ASSIGNMENT (DRAG FIX)
// ================================
function renderAssignment(a){
  const p=state.projects.find(x=>x.id===a.projectId);

  const block=document.createElement("div");
  block.className="project-block";
  block.draggable=true;
  block.ondragstart=e=>setDrag(e,{kind:"assignment", id:a.id});

  const title=document.createElement("div");
  title.className="project-title";
  title.textContent=p.name;
  title.draggable=true;
  title.ondragstart=e=>{
    e.stopPropagation();
    setDrag(e,{kind:"plannedProject", projectId:a.projectId});
  };

  block.appendChild(title);
  return block;
}

// ================================
function createAssignments(pid,startISO){
  const len=parseInt(prompt("Wie viele Arbeitstage?","1"),10)||1;
  const d=new Date(startISO);
  for(let i=0;i<len;i++){
    const x=new Date(d);
    x.setDate(x.getDate()+i);
    state.assignments.push({id:uid(), projectId:pid, dateISO:toISO(x)});
  }
}

// ================================
function renderAll(){
  renderYear();
  renderWeeks();
}
renderAll();
