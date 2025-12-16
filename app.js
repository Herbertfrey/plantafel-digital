// ================== STATE & STORAGE ==================
const STORAGE_KEY = "plantafel_state_v1";

let state = {
  vehicles: [],
  employees: [],
  projects: [],        // {id,name}
  months: {},          // {0:[projectId], ... 11:[...]}
  weeks: {},           // {"YYYY-MM-DD":[projectId]}
  startMonday: null
};

function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState(){
  const s = localStorage.getItem(STORAGE_KEY);
  if(s){
    const p = JSON.parse(s);
    state = { ...state, ...p };
  }
}

// ================== HELPERS ==================
const MONTHS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
const uid = ()=>Math.random().toString(36).slice(2);

function mondayOf(date){
  const d = new Date(date);
  const day = d.getDay() || 7;
  if(day !== 1) d.setDate(d.getDate() - (day - 1));
  d.setHours(0,0,0,0);
  return d;
}
function iso(d){ return d.toISOString().slice(0,10); }
function isoWeek(d){
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(),0,1));
  return Math.ceil((((x - yearStart) / 86400000) + 1) / 7);
}

// ================== INIT ==================
loadState();
if(!state.startMonday){
  state.startMonday = iso(mondayOf(new Date()));
}
document.getElementById("startDate").value = state.startMonday;

document.getElementById("btnToday").onclick = ()=>{
  state.startMonday = iso(mondayOf(new Date()));
  document.getElementById("startDate").value = state.startMonday;
  generate4Weeks();
  saveState(); renderAll();
};
document.getElementById("startDate").onchange = e=>{
  state.startMonday = iso(mondayOf(new Date(e.target.value)));
  generate4Weeks();
  saveState(); renderAll();
};

// ================== ADDERS ==================
document.getElementById("addVehicleBtn").onclick = ()=>{
  const v = vehicleInput.value.trim(); if(!v) return;
  state.vehicles.push(v); vehicleInput.value="";
  saveState(); renderAll();
};
document.getElementById("addEmployeeBtn").onclick = ()=>{
  const e = employeeInput.value.trim(); if(!e) return;
  state.employees.push(e); employeeInput.value="";
  saveState(); renderAll();
};
document.getElementById("addProjectBtn").onclick = ()=>{
  const p = projectInput.value.trim(); if(!p) return;
  const id = uid();
  state.projects.push({id,name:p});
  const m = new Date().getMonth();
  state.months[m] = state.months[m] || [];
  state.months[m].push(id);
  projectInput.value="";
  saveState(); renderAll();
};

// ================== WEEKS ==================
function generate4Weeks(){
  state.weeks = state.weeks || {};
  const start = new Date(state.startMonday);
  for(let i=0;i<4;i++){
    const d = new Date(start); d.setDate(d.getDate()+i*7);
    const k = iso(d);
    state.weeks[k] = state.weeks[k] || [];
  }
}
generate4Weeks();

// ================== RENDER ==================
function renderAll(){
  renderLists();
  renderMonths();
  renderWeeks();
}
function renderLists(){
  vehicleList.innerHTML = state.vehicles.map(v=>`<span>${v}</span>`).join("");
  employeeList.innerHTML = state.employees.map(e=>`<span>${e}</span>`).join("");
}

function renderMonths(){
  const wrap = document.getElementById("months");
  wrap.innerHTML="";
  for(let m=0;m<12;m++){
    const box = document.createElement("div");
    box.className="month";
    box.innerHTML=`<h4>${MONTHS[m]}</h4>`;
    box.ondragover=e=>e.preventDefault();
    box.ondrop=e=>dropToMonth(e,m);
    (state.months[m]||[]).forEach(pid=>{
      const p = state.projects.find(x=>x.id===pid); if(!p) return;
      box.appendChild(projectEl(p.id,p.name));
    });
    wrap.appendChild(box);
  }
}

function renderWeeks(){
  const w = document.getElementById("weeks");
  w.innerHTML="";
  Object.keys(state.weeks).sort().forEach(k=>{
    const start = new Date(k);
    const end = new Date(start); end.setDate(end.getDate()+4);
    const kw = isoWeek(start);
    const box = document.createElement("div");
    box.className="week";
    box.innerHTML=`<div class="week-title">KW ${kw} · ${start.toLocaleDateString()}–${end.toLocaleDateString()}</div>`;
    const drop = document.createElement("div");
    drop.className="week-drop";
    drop.ondragover=e=>e.preventDefault();
    drop.ondrop=e=>dropToWeek(e,k);
    state.weeks[k].forEach(pid=>{
      const p = state.projects.find(x=>x.id===pid); if(!p) return;
      drop.appendChild(projectEl(p.id,p.name));
    });
    box.appendChild(drop);
    w.appendChild(box);
  });
}

function projectEl(id,name){
  const el = document.createElement("div");
  el.className="project";
  el.textContent=name;
  el.draggable=true;
  el.ondragstart=e=>e.dataTransfer.setData("pid",id);
  return el;
}

// ================== DROP LOGIC ==================
function dropToMonth(e,month){
  const pid = e.dataTransfer.getData("pid"); if(!pid) return;
  // remove from weeks
  Object.keys(state.weeks).forEach(w=>{
    state.weeks[w] = state.weeks[w].filter(x=>x!==pid);
  });
  // remove from all months
  Object.keys(state.months).forEach(m=>{
    state.months[m] = state.months[m].filter(x=>x!==pid);
  });
  state.months[month] = state.months[month] || [];
  state.months[month].push(pid);
  saveState(); renderAll();
}

function dropToWeek(e,weekKey){
  const pid = e.dataTransfer.getData("pid"); if(!pid) return;
  // remove from months
  Object.keys(state.months).forEach(m=>{
    state.months[m] = state.months[m].filter(x=>x!==pid);
  });
  // remove from other weeks
  Object.keys(state.weeks).forEach(w=>{
    state.weeks[w] = state.weeks[w].filter(x=>x!==pid);
  });
  state.weeks[weekKey].push(pid);
  saveState(); renderAll();
}

// ================== TRASH ==================
const trash = document.getElementById("trash");
trash.ondragover=e=>e.preventDefault();
trash.ondrop=e=>{
  const pid = e.dataTransfer.getData("pid"); if(!pid) return;
  state.projects = state.projects.filter(p=>p.id!==pid);
  Object.keys(state.months).forEach(m=>{
    state.months[m] = (state.months[m]||[]).filter(x=>x!==pid);
  });
  Object.keys(state.weeks).forEach(w=>{
    state.weeks[w] = (state.weeks[w]||[]).filter(x=>x!==pid);
  });
  saveState(); renderAll();
};

renderAll();
