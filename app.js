const LS_KEY = "plantafel_full_parking_v1";

const MONTHS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
let activeAbsenceType = "urlaub";

const defaultState = {
  startDate:null,
  projects:[],
  vehicles:[],
  employees:[],
  assignments:[],
  absences:[],
  yearBars:[]
};

let state = loadState();

/* ---------- helpers ---------- */
function uid(){ return Math.random().toString(16).slice(2)+Date.now().toString(16); }
function saveState(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : structuredClone(defaultState);
  }catch{
    return structuredClone(defaultState);
  }
}

/* ---------- Projekt Parkplatz ---------- */
function renderProjectParking(){
  const el = document.getElementById("projectParkingList");
  if(!el) return;
  el.innerHTML = "";
  state.projects.forEach(p=>{
    const d = document.createElement("div");
    d.className = "parking-item";
    d.textContent = p.name;
    el.appendChild(d);
  });
}

/* ---------- Tabs ---------- */
document.querySelectorAll(".tab-btn").forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-week").classList.toggle("active", btn.dataset.tab==="week");
    document.getElementById("tab-year").classList.toggle("active", btn.dataset.tab==="year");
  };
});

/* ---------- Projekte ---------- */
document.getElementById("addProjectBtn").onclick = ()=>{
  const inp = document.getElementById("projectInput");
  const name = inp.value.trim();
  if(!name) return;
  const id = uid();
  state.projects.push({id,name});
  state.yearBars.push({id:uid(), projectId:id, monthIndex:new Date().getMonth()});
  inp.value="";
  saveState();
  renderAll();
};

/* ---------- Render ---------- */
function renderYear(){
  const grid = document.getElementById("yearGrid");
  grid.innerHTML="";
  for(let m=0;m<12;m++){
    const box = document.createElement("div");
    box.className="month";
    box.innerHTML=`<b>${MONTHS[m]}</b>`;
    const drop = document.createElement("div");
    drop.className="month-drop";
    state.yearBars.filter(b=>b.monthIndex===m).forEach(b=>{
      const p = state.projects.find(x=>x.id===b.projectId);
      if(!p) return;
      const el = document.createElement("div");
      el.className="year-bar";
      el.textContent=p.name;
      drop.appendChild(el);
    });
    box.appendChild(drop);
    grid.appendChild(box);
  }
}

function renderAll(){
  renderProjectParking();
  renderYear();
}

renderAll();
