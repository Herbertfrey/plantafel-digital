// =====================================
// PLANTAFEL – STABILER NEUSTART
// passt exakt zu deiner index.html
// =====================================

const LS_KEY = "plantafel_stable_clean";

// ---------- STATE ----------
const defaultState = {
  startMonday: null,
  projects: [],        // {id, name}
  yearBars: [],        // {projectId, month}
  assignments: []      // {id, projectId, dateISO}
};

let state = load();

// ---------- HELPERS ----------
function uid() {
  return Math.random().toString(16).slice(2);
}

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(LS_KEY);
  return raw ? JSON.parse(raw) : structuredClone(defaultState);
}

function mondayOf(d) {
  const x = new Date(d);
  const day = x.getDay() || 7;
  x.setDate(x.getDate() - day + 1);
  x.setHours(12,0,0,0);
  return x;
}

function iso(d){
  const x = new Date(d);
  x.setHours(12,0,0,0);
  return x.toISOString().slice(0,10);
}

function setDrag(e, data){
  e.dataTransfer.setData("application/json", JSON.stringify(data));
  e.dataTransfer.effectAllowed = "move";
}

function getDrag(e){
  try {
    return JSON.parse(e.dataTransfer.getData("application/json"));
  } catch {
    return null;
  }
}

// ---------- INIT DATE ----------
const startInput = document.getElementById("startDate");
const btnToday = document.getElementById("btnToday");

if(!state.startMonday){
  state.startMonday = iso(mondayOf(new Date()));
  save();
}
startInput.value = state.startMonday;

btnToday.onclick = () => {
  state.startMonday = iso(mondayOf(new Date()));
  startInput.value = state.startMonday;
  save();
  render();
};

startInput.onchange = () => {
  state.startMonday = iso(mondayOf(startInput.value));
  save();
  render();
};

// ---------- TABS ----------
document.querySelectorAll(".tab-btn").forEach(btn=>{
  btn.onclick = () => {
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");

    const tab = btn.dataset.tab;
    document.getElementById("tab-week").classList.toggle("active", tab==="week");
    document.getElementById("tab-year").classList.toggle("active", tab==="year");
  };
});

// ---------- PROJECT ADD ----------
const projectInput = document.getElementById("projectInput");
const addProjectBtn = document.getElementById("addProjectBtn");

addProjectBtn.onclick = () => {
  const name = projectInput.value.trim();
  if(!name) return;

  const id = uid();
  state.projects.push({id, name});
  state.yearBars.push({projectId:id, month:new Date().getMonth()});

  projectInput.value = "";
  save();
  render();
};

// ---------- YEAR VIEW ----------
const yearGrid = document.getElementById("yearGrid");
const MONTHS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

function renderYear(){
  yearGrid.innerHTML = "";

  for(let m=0;m<12;m++){
    const box = document.createElement("div");
    box.className = "month";

    const head = document.createElement("div");
    head.className = "month-head";
    head.textContent = MONTHS[m];
    box.appendChild(head);

    const drop = document.createElement("div");
    drop.className = "month-drop";

    drop.ondragover = e => e.preventDefault();
    drop.ondrop = e => {
      e.preventDefault();
      const data = getDrag(e);
      if(!data) return;

      if(data.kind === "planned"){
        state.assignments = state.assignments.filter(a=>a.projectId!==data.projectId);
        const bar = state.yearBars.find(b=>b.projectId===data.projectId);
        if(bar) bar.month = m;
        save();
        render();
      }
    };

    state.yearBars.filter(b=>b.month===m).forEach(b=>{
      const p = state.projects.find(p=>p.id===b.projectId);
      if(!p) return;

      const el = document.createElement("div");
      el.className = "year-bar";
      el.textContent = p.name;
      el.draggable = true;
      el.ondragstart = e=>setDrag(e,{kind:"year", projectId:p.id});
      drop.appendChild(el);
    });

    box.appendChild(drop);
    yearGrid.appendChild(box);
  }
}

// ---------- WEEK VIEW ----------
const weeksEl = document.getElementById("weeks");

function renderWeeks(){
  weeksEl.innerHTML = "";
  const monday = new Date(state.startMonday);

  for(let i=0;i<20;i++){
    const d = new Date(monday);
    d.setDate(d.getDate()+i);
    const dateISO = iso(d);

    const day = document.createElement("div");
    day.className = "day";
    day.innerHTML = `<b>${dateISO}</b>`;

    day.ondragover = e=>e.preventDefault();
    day.ondrop = e=>{
      e.preventDefault();
      const data = getDrag(e);
      if(!data || data.kind!=="year") return;

      const len = Number(prompt("Arbeitstage?", "1")) || 1;
      for(let j=0;j<len;j++){
        const dd = new Date(d);
        dd.setDate(dd.getDate()+j);
        state.assignments.push({
          id:uid(),
          projectId:data.projectId,
          dateISO:iso(dd)
        });
      }
      save();
      render();
    };

    state.assignments.filter(a=>a.dateISO===dateISO).forEach(a=>{
      const p = state.projects.find(p=>p.id===a.projectId);
      if(!p) return;

      const blk = document.createElement("div");
      blk.className = "project-block";
      blk.textContent = p.name;
      blk.draggable = true;
      blk.ondragstart = e=>setDrag(e,{kind:"planned", projectId:p.id});
      day.appendChild(blk);
    });

    weeksEl.appendChild(day);
  }
}

// ---------- RENDER ----------
function render(){
  renderYear();
  renderWeeks();
}

render();
