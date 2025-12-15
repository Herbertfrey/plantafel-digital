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
addVehic
