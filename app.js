// Plantafel – Komplett, stabil, Drag&Drop, localStorage + Supabase Sync (Board #1)
// - Öffnen ohne Login = Ansicht
// - Editor-Login (E-Mail/Passwort) = darf ändern & speichern
// - Auto-Sync alle 15 Sekunden
// - Zoom 20%–160%

const LS_KEY = "plantafel_frey_full_v1";
const ZOOM_KEY = "plantafel_zoom_v1";
const BOARD_ID = 1;
const AUTO_SYNC_MS = 15000;

const MONTHS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
const DAYNAMES = ["Mo","Di","Mi","Do","Fr"];
const EMP_COLORS = ["#1e88e5","#43a047","#fb8c00","#8e24aa","#00897b","#e11d48","#0ea5e9","#64748b","#22c55e","#f97316"];

const defaultState = {
  weekStartISO: null, // Monday ISO
  vehicles: [],       // {id,name}
  employees: [],      // {id,name,color}
  projects: [],       // {id,name, where:"pool"|"month"|"day", monthIndex?:0-11, dayISO?:string}
  days: {}            // [dayISO]: { projects:[{id,projectId, vehicles:[vehicleId], employees:[employeeId]}], status:[{id,type, employees:[employeeId]}] }
};

let state = loadLocal();
let EDIT_MODE = false;
let currentUser = null;

let lastRemoteUpdatedAt = null;
let localDirty = false;
let saveTimer = null;
let syncTimer = null;

// ---------- Local save/load ----------
function saveLocal(){
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}
function loadLocal(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw){
      const s = structuredClone(defaultState);
      s.weekStartISO = toISO(mondayOf(new Date()));
      return s;
    }
    const s = JSON.parse(raw);
    if(!s.weekStartISO) s.weekStartISO = toISO(mondayOf(new Date()));
    s.vehicles ||= [];
    s.employees ||= [];
    s.projects ||= [];
    s.days ||= {};
    return s;
  }catch{
    const s = structuredClone(defaultState);
    s.weekStartISO = toISO(mondayOf(new Date()));
    return s;
  }
}

// ---------- Supabase (online) ----------
async function fetchRemote(){
  const { data, error } = await window.sb
    .from("boards")
    .select("data,updated_at")
    .eq("id", BOARD_ID)
    .single();

  if (error) {
    // public select sollte gehen; wenn nicht: einfach lokal weiter
    console.warn("Remote fetch error:", error.message);
    return null;
  }
  return data;
}

async function pushRemote(){
  if(!EDIT_MODE) return;

  const payload = {
    id: BOARD_ID,
    data: state,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await window.sb
    .from("boards")
    .upsert(payload, { onConflict: "id" })
    .select("updated_at")
    .single();

  if (error) {
    console.warn("Remote save error:", error.message);
    return false;
  }

  lastRemoteUpdatedAt = data?.updated_at || lastRemoteUpdatedAt;
  localDirty = false;
  return true;
}

function scheduleRemoteSave(){
  if(!EDIT_MODE) return;
  localDirty = true;
  if(saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async ()=>{
    await pushRemote();
  }, 800);
}

// ---------- Zoom ----------
function getZoom(){
  const z = parseFloat(localStorage.getItem(ZOOM_KEY) || "1.0");
  if(Number.isFinite(z)) return z;
  return 1.0;
}
function setZoom(z){
  z = Math.max(0.2, Math.min(1.6, z));
  localStorage.setItem(ZOOM_KEY, String(z));

  const root = document.getElementById("zoomRoot");
  // Chrome/Edge: zoom ist top. Fallback: transform
  root.style.zoom = String(z);
  root.style.transform = `scale(${z})`;
  root.style.transformOrigin = "top left";

  const sel = document.getElementById("zoomSelect");
  if(sel) sel.value = String(z);
}

// ---------- Helpers ----------
function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }
function toISO(d){ const x=new Date(d); x.setHours(12,0,0,0); return x.toISOString().slice(0,10); }
function parseISO(s){ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); }
function mondayOf(date){
  const d = new Date(date);
  d.setHours(12,0,0,0);
  const day = d.getDay();
  const diff = (day===0 ? -6 : 1-day);
  d.setDate(d.getDate()+diff);
  return d;
}
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function pad2(n){ return String(n).padStart(2,"0"); }
function fmtDE(d){ return `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${String(d.getFullYear()).slice(2)}`; }
function isoWeek(date){
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function ensureDay(dayISO){
  if(!state.days[dayISO]) state.days[dayISO] = { projects:[], status:[] };
  state.days[dayISO].projects ||= [];
  state.days[dayISO].status ||= [];
  return state.days[dayISO];
}

function findProject(id){ return state.projects.find(p=>p.id===id); }
function findVehicle(id){ return state.vehicles.find(v=>v.id===id); }
function findEmployee(id){ return state.employees.find(e=>e.id===id); }

// Doppelbelegung checks (Tag-weit)
function dayHasEmployee(dayISO, employeeId){
  const day = ensureDay(dayISO);
  for(const pb of day.projects){
    if((pb.employees||[]).includes(employeeId)) return true;
  }
  for(const sb of day.status){
    if((sb.employees||[]).includes(employeeId)) return true;
  }
  return false;
}
function dayHasVehicle(dayISO, vehicleId){
  const day = ensureDay(dayISO);
  for(const pb of day.projects){
    if((pb.vehicles||[]).includes(vehicleId)) return true;
  }
  return false;
}

// ---------- DOM refs ----------
const startDateEl = document.getElementById("startDate");
const btnToday = document.getElementById("btnToday");
const btnReset = document.getElementById("btnReset");
const weekPrev = document.getElementById("weekPrev");
const weekNext = document.getElementById("weekNext");
const rangeTitle = document.getElementById("rangeTitle");

const vehicleInput = document.getElementById("vehicleInput");
const addVehicleBtn = document.getElementById("addVehicleBtn");
const vehicleList = document.getElementById("vehicleList");

const employeeInput = document.getElementById("employeeInput");
const addEmployeeBtn = document.getElementById("addEmployeeBtn");
const employeeList = document.getElementById("employeeList");

const projectInput = document.getElementById("projectInput");
const addProjectBtn = document.getElementById("addProjectBtn");
const projectPool = document.getElementById("projectPool");

const monthsGrid = document.getElementById("monthsGrid");
const weeksEl = document.getElementById("weeks");
const trash = document.getElementById("trash");

// Login UI
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const loginModal = document.getElementById("loginModal");
const loginClose = document.getElementById("loginClose");
const loginEmail = document.getElementById("loginEmail");
const loginPass = document.getElementById("loginPass");
const loginDo = document.getElementById("loginDo");
const loginMsg = document.getElementById("loginMsg");
const modePill = document.getElementById("modePill");

// Zoom UI
const zoomSelect = document.getElementById("zoomSelect");
const zoomInBtn = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");

// ---------- DnD helpers ----------
function setDrag(e, payload){
  e.dataTransfer.setData("application/json", JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "move";
}
function getDrag(e){
  try{
    const raw = e.dataTransfer.getData("application/json");
    return raw ? JSON.parse(raw) : null;
  }catch{ return null; }
}

// ---------- Permissions/UI lock ----------
function applyMode(){
  document.body.classList.toggle("viewOnly", !EDIT_MODE);
  modePill.textContent = EDIT_MODE ? `Editor: ${currentUser?.email || ""}` : "Ansicht";

  btnLogin.style.display = EDIT_MODE ? "none" : "inline-flex";
  btnLogout.style.display = EDIT_MODE ? "inline-flex" : "none";
}

function openLogin(){
  loginMsg.textContent = "";
  loginModal.classList.add("open");
  loginModal.setAttribute("aria-hidden", "false");
}
function closeLogin(){
  loginModal.classList.remove("open");
  loginModal.setAttribute("aria-hidden", "true");
}

// ---------- Actions ----------
function markChanged(){
  saveLocal();
  scheduleRemoteSave();
}

function addVehicle(name){
  if(!EDIT_MODE) return;
  name = name.trim();
  if(!name) return;
  state.vehicles.push({ id: uid(), name });
  markChanged(); renderAll();
}
function addEmployee(name){
  if(!EDIT_MODE) return;
  name = name.trim();
  if(!name) return;
  const color = EMP_COLORS[state.employees.length % EMP_COLORS.length];
  state.employees.push({ id: uid(), name, color });
  markChanged(); renderAll();
}
function addProject(name){
  if(!EDIT_MODE) return;
  name = name.trim();
  if(!name) return;
  const id = uid();
  state.projects.push({ id, name, where:"pool" });
  markChanged(); renderAll();
}

function deleteProjectEverywhere(projectId){
  if(!EDIT_MODE) return;
  const p = findProject(projectId);
  if(!p) return;
  if(!confirm(`Projekt wirklich löschen: "${p.name}" ?`)) return;

  for(const dayISO of Object.keys(state.days)){
    const day = ensureDay(dayISO);
    day.projects = day.projects.filter(pb=>pb.projectId!==projectId);
  }
  state.projects = state.projects.filter(x=>x.id!==projectId);

  markChanged(); renderAll();
}

function moveProjectToPool(projectId){
  if(!EDIT_MODE) return;
  const p = findProject(projectId);
  if(!p) return;

  for(const dayISO of Object.keys(state.days)){
    const day = ensureDay(dayISO);
    day.projects = day.projects.filter(pb=>pb.projectId!==projectId);
  }
  p.where="pool";
  delete p.monthIndex;
  delete p.dayISO;

  markChanged(); renderAll();
}

function moveProjectToMonth(projectId, monthIndex){
  if(!EDIT_MODE) return;
  const p = findProject(projectId);
  if(!p) return;

  for(const dayISO of Object.keys(state.days)){
    const day = ensureDay(dayISO);
    day.projects = day.projects.filter(pb=>pb.projectId!==projectId);
  }
  p.where="month";
  p.monthIndex = monthIndex;
  delete p.dayISO;

  markChanged(); renderAll();
}

function placeProjectToDay(projectId, dayISO){
  if(!EDIT_MODE) return;
  const p = findProject(projectId);
  if(!p) return;

  const oldDayISO = p.where==="day" ? p.dayISO : null;
  if(oldDayISO){
    moveProjectBlockDay(projectId, oldDayISO, dayISO);
    return;
  }

  p.where="day";
  p.dayISO = dayISO;
  delete p.monthIndex;

  const day = ensureDay(dayISO);
  day.projects.push({ id: uid(), projectId, vehicles:[], employees:[] });

  markChanged(); renderAll();
}

function moveProjectBlockDay(projectId, fromDayISO, toDayISO){
  if(!EDIT_MODE) return;
  if(fromDayISO===toDayISO) return;

  const fromDay = ensureDay(fromDayISO);
  const idx = fromDay.projects.findIndex(pb=>pb.projectId===projectId);
  if(idx<0) return;
  const block = fromDay.projects.splice(idx,1)[0];

  const conflicts = [];
  for(const eid of (block.employees||[])){
    if(dayHasEmployee(toDayISO, eid)) conflicts.push(`Mitarbeiter: ${findEmployee(eid)?.name || "?"}`);
  }
  for(const vid of (block.vehicles||[])){
    if(dayHasVehicle(toDayISO, vid)) conflicts.push(`KFZ: ${findVehicle(vid)?.name || "?"}`);
  }
  if(conflicts.length){
    const ok = confirm(`Doppelbelegung im Ziel-Tag:\n- ${conflicts.join("\n- ")}\n\nTrotzdem verschieben?`);
    if(!ok){
      fromDay.projects.splice(idx,0,block);
      return;
    }
  }

  const toDay = ensureDay(toDayISO);
  toDay.projects.push(block);

  const p = findProject(projectId);
  if(p){
    p.where="day";
    p.dayISO = toDayISO;
    delete p.monthIndex;
  }

  markChanged(); renderAll();
}

function removeProjectBlockFromDay(projectId, dayISO){
  if(!EDIT_MODE) return;
  const day = ensureDay(dayISO);
  day.projects = day.projects.filter(pb=>pb.projectId!==projectId);
  // Projekt zurück in Pool
  const p = findProject(projectId);
  if(p){
    p.where="pool";
    delete p.dayISO;
    delete p.monthIndex;
  }
  markChanged(); renderAll();
}

// Status
function addStatusBox(dayISO, type){
  if(!EDIT_MODE) return;
  const day = ensureDay(dayISO);
  day.status.push({ id: uid(), type, employees:[] });
  markChanged(); renderAll();
}
function removeStatusBox(dayISO, statusId){
  if(!EDIT_MODE) return;
  const day = ensureDay(dayISO);
  day.status = day.status.filter(s=>s.id!==statusId);
  markChanged(); renderAll();
}

// ---------- Render ----------
function renderAll(){
  renderTop();
  renderMasters();
  renderPool();
  renderMonths();
  renderWeeks();
  applyMode();
}

function renderTop(){
  startDateEl.value = state.weekStartISO;
  const start = parseISO(state.weekStartISO);
  const end = addDays(start, 27);
  rangeTitle.textContent = `${fmtDE(start)} – ${fmtDE(end)} (4 Wochen)`;
}

function renderMasters(){
  vehicleList.innerHTML = "";
  employeeList.innerHTML = "";

  // Vehicles
  state.vehicles.forEach(v=>{
    const el = document.createElement("span");
    el.className = "magnet vehicle";
    el.textContent = v.name;
    el.draggable = EDIT_MODE;
    el.addEventListener("dragstart", e=> EDIT_MODE && setDrag(e,{kind:"vehicle", id:v.id}) );

    const del = document.createElement("span");
    del.className="del";
    del.textContent="✖";
    del.title="Fahrzeug löschen (Stammdaten)";
    del.addEventListener("click", ()=>{
      if(!EDIT_MODE) return;
      if(!confirm(`Fahrzeug wirklich löschen: "${v.name}"?`)) return;
      state.vehicles = state.vehicles.filter(x=>x.id!==v.id);
      for(const dayISO of Object.keys(state.days)){
        const day = ensureDay(dayISO);
        day.projects.forEach(pb=>{
          pb.vehicles = (pb.vehicles||[]).filter(id=>id!==v.id);
        });
      }
      markChanged(); renderAll();
    });
    el.appendChild(del);

    vehicleList.appendChild(el);
  });

  // Employees
  state.employees.forEach(emp=>{
    const el = document.createElement("span");
    el.className = "magnet employee";
    el.style.background = emp.color;
    el.textContent = emp.name;
    el.draggable = EDIT_MODE;
    el.addEventListener("dragstart", e=> EDIT_MODE && setDrag(e,{kind:"employee", id:emp.id}) );

    const del = document.createElement("span");
    del.className="del";
    del.textContent="✖";
    del.title="Mitarbeiter löschen (Stammdaten)";
    del.addEventListener("click", ()=>{
      if(!EDIT_MODE) return;
      if(!confirm(`Mitarbeiter wirklich löschen: "${emp.name}"?`)) return;
      state.employees = state.employees.filter(x=>x.id!==emp.id);
      for(const dayISO of Object.keys(state.days)){
        const day = ensureDay(dayISO);
        day.projects.forEach(pb=>{
          pb.employees = (pb.employees||[]).filter(id=>id!==emp.id);
        });
        day.status.forEach(sb=>{
          sb.employees = (sb.employees||[]).filter(id=>id!==emp.id);
        });
      }
      markChanged(); renderAll();
    });
    el.appendChild(del);

    employeeList.appendChild(el);
  });

  // Status palette drag
  document.querySelectorAll(".status-chip").forEach(ch=>{
    ch.draggable = EDIT_MODE;
    ch.addEventListener("dragstart", e=>{
      if(!EDIT_MODE) return;
      setDrag(e,{kind:"status", type: ch.dataset.status});
    });
  });
}

function renderPool(){
  projectPool.innerHTML = "";
  state.projects.filter(p=>p.where==="pool").forEach(p=>{
    const el = document.createElement("span");
    el.className = "magnet project";
    el.textContent = p.name;
    el.draggable = EDIT_MODE;
    el.addEventListener("dragstart", e=> EDIT_MODE && setDrag(e,{kind:"project", id:p.id}) );

    const del = document.createElement("span");
    del.className="del";
    del.textContent="✖";
    del.title="Projekt endgültig löschen";
    del.addEventListener("click", ()=> deleteProjectEverywhere(p.id));
    el.appendChild(del);

    projectPool.appendChild(el);
  });
}

function renderMonths(){
  monthsGrid.innerHTML = "";
  const year = new Date().getFullYear();

  for(let m=0;m<12;m++){
    const box = document.createElement("div");
    box.className = "month";

    const head = document.createElement("div");
    head.className = "monthHead";
    head.innerHTML = `<span>${MONTHS[m]}</span><span class="small">${year}</span>`;
    box.appendChild(head);

    const drop = document.createElement("div");
    drop.className = "monthDrop";

    drop.addEventListener("dragover", e=>{
      if(!EDIT_MODE) return;
      e.preventDefault();
      drop.classList.add("over");
    });
    drop.addEventListener("dragleave", ()=> drop.classList.remove("over"));
    drop.addEventListener("drop", e=>{
      if(!EDIT_MODE) return;
      e.preventDefault(); drop.classList.remove("over");
      const data = getDrag(e);
      if(!data) return;

      if(data.kind==="project"){
        moveProjectToMonth(data.id, m);
      }
      if(data.kind==="projectBlock"){
        moveProjectToMonth(data.projectId, m);
      }
    });

    state.projects.filter(p=>p.where==="month" && p.monthIndex===m).forEach(p=>{
      const el = document.createElement("span");
      el.className = "magnet project";
      el.textContent = p.name;
      el.draggable = EDIT_MODE;
      el.addEventListener("dragstart", e=> EDIT_MODE && setDrag(e,{kind:"project", id:p.id}) );

      const x = document.createElement("span");
      x.className="del";
      x.textContent="✖";
      x.title="Zurück in Pool";
      x.addEventListener("click", ()=>{
        if(!EDIT_MODE) return;
        moveProjectToPool(p.id);
      });
      el.appendChild(x);

      drop.appendChild(el);
    });

    box.appendChild(drop);
    monthsGrid.appendChild(box);
  }
}

function renderWeeks(){
  weeksEl.innerHTML = "";
  const start = parseISO(state.weekStartISO);

  for(let w=0; w<4; w++){
    const weekStart = addDays(start, w*7);
    const weekEnd = addDays(weekStart, 4);
    const kw = isoWeek(weekStart);

    const weekBox = document.createElement("div");
    weekBox.className = "week";

    const title = document.createElement("div");
    title.className = "weekTitle";
    title.innerHTML = `<span>KW ${kw}</span><span>${fmtDE(weekStart)} – ${fmtDE(weekEnd)}</span>`;
    weekBox.appendChild(title);

    const days = document.createElement("div");
    days.className = "days";

    for(let d=0; d<5; d++){
      const date = addDays(weekStart, d);
      const dayISO = toISO(date);
      const day = ensureDay(dayISO);

      const dayEl = document.createElement("div");
      dayEl.className = "day";

      const head = document.createElement("div");
      head.className = "dayHead";
      head.innerHTML = `<div>${DAYNAMES[d]}</div><span>${fmtDE(date)}</span>`;
      dayEl.appendChild(head);

      const drop = document.createElement("div");
      drop.className = "dayDrop";

      drop.addEventListener("dragover", e=>{
        if(!EDIT_MODE) return;
        e.preventDefault();
        drop.classList.add("over");
      });
      drop.addEventListener("dragleave", ()=> drop.classList.remove("over"));
      drop.addEventListener("drop", e=>{
        if(!EDIT_MODE) return;
        e.preventDefault(); drop.classList.remove("over");
        const data = getDrag(e);
        if(!data) return;

        if(data.kind==="project"){
          placeProjectToDay(data.id, dayISO);
        }
        if(data.kind==="projectBlock"){
          moveProjectBlockDay(data.projectId, data.dayISO, dayISO);
        }
        if(data.kind==="status"){
          addStatusBox(dayISO, data.type);
        }
      });

      // Status area
      const statusArea = document.createElement("div");
      statusArea.className = "statusArea";

      day.status.forEach(sb=>{
        const box = document.createElement("div");
        box.className = "statusBox";

        const sh = document.createElement("div");
        sh.className = "statusBoxHead";

        const label = document.createElement("div");
        label.className = `statusLabel ${sb.type}`;
        label.textContent = sb.type.toUpperCase();
        sh.appendChild(label);

        const del = document.createElement("button");
        del.className = "btn danger";
        del.style.padding = "4px 8px";
        del.style.borderRadius = "10px";
        del.textContent = "✖";
        del.title = "Status löschen";
        del.addEventListener("click", ()=> removeStatusBox(dayISO, sb.id));
        sh.appendChild(del);

        box.appendChild(sh);

        const people = document.createElement("div");
        people.className = "statusPeople";

        people.addEventListener("dragover", e=> EDIT_MODE && e.preventDefault());
        people.addEventListener("drop", e=>{
          if(!EDIT_MODE) return;
          e.preventDefault();
          const data = getDrag(e);
          if(!data || data.kind!=="employee") return;

          if(dayHasEmployee(dayISO, data.id)){
            const ok = confirm(`Mitarbeiter ist an dem Tag schon eingeplant. Trotzdem doppelt?`);
            if(!ok) return;
          }

          if(!sb.employees.includes(data.id)) sb.employees.push(data.id);
          markChanged(); renderAll();
        });

        sb.employees.forEach(eid=>{
          const emp = findEmployee(eid);
          if(!emp) return;
          const tag = document.createElement("div");
          tag.className = "tag";
          tag.style.background = emp.color;
          tag.style.color = "#fff";
          tag.textContent = emp.name;

          const x = document.createElement("span");
          x.className = "x";
          x.textContent = "✖";
          x.title = "Entfernen";
          x.addEventListener("click", ()=>{
            if(!EDIT_MODE) return;
            sb.employees = sb.employees.filter(id=>id!==eid);
            markChanged(); renderAll();
          });
          tag.appendChild(x);

          people.appendChild(tag);
        });

        box.appendChild(people);
        statusArea.appendChild(box);
      });

      drop.appendChild(statusArea);

      // Projects row (nebeneinander)
      const projectsRow = document.createElement("div");
      projectsRow.className = "projectsRow";

      day.projects.forEach(pb=>{
        const proj = findProject(pb.projectId);

        const block = document.createElement("div");
        block.className = "projectBlock";

        const head2 = document.createElement("div");
        head2.className = "projectBlockHead";
        head2.draggable = EDIT_MODE;

        head2.addEventListener("dragstart", e=>{
          if(!EDIT_MODE) return;
          setDrag(e,{kind:"projectBlock", projectId: pb.projectId, dayISO});
        });

        const name = document.createElement("div");
        name.textContent = proj ? proj.name : "(Projekt gelöscht)";
        head2.appendChild(name);

        const xbtn = document.createElement("div");
        xbtn.style.cursor="pointer";
        xbtn.title = "Projekt aus Tag entfernen (zurück in Pool)";
        xbtn.textContent = "✖";
        xbtn.addEventListener("click", ()=>{
          if(!EDIT_MODE) return;
          removeProjectBlockFromDay(pb.projectId, dayISO);
        });
        head2.appendChild(xbtn);

        block.appendChild(head2);

        const body = document.createElement("div");
        body.className = "projectBlockBody";

        // KFZ slot
        const slotV = document.createElement("div");
        slotV.className = "slot";
        slotV.innerHTML = `<div class="slotTitle">KFZ</div><div class="slotItems"></div>`;
        const vItems = slotV.querySelector(".slotItems");
        vItems.addEventListener("dragover", e=> EDIT_MODE && e.preventDefault());
        vItems.addEventListener("drop", e=>{
          if(!EDIT_MODE) return;
          e.preventDefault();
          const data = getDrag(e);
          if(!data || data.kind!=="vehicle") return;

          if(dayHasVehicle(dayISO, data.id)){
            const ok = confirm(`KFZ ist an dem Tag schon eingeplant. Trotzdem doppelt?`);
            if(!ok) return;
          }

          pb.vehicles ||= [];
          if(!pb.vehicles.includes(data.id)) pb.vehicles.push(data.id);
          markChanged(); renderAll();
        });

        (pb.vehicles||[]).forEach(vid=>{
          const v = findVehicle(vid);
          if(!v) return;
          const tag = document.createElement("div");
          tag.className = "tag vehicle";
          tag.textContent = v.name;

          const x = document.createElement("span");
          x.className = "x";
          x.textContent = "✖";
          x.title = "Entfernen";
          x.addEventListener("click", ()=>{
            if(!EDIT_MODE) return;
            pb.vehicles = pb.vehicles.filter(id=>id!==vid);
            markChanged(); renderAll();
          });
          tag.appendChild(x);

          vItems.appendChild(tag);
        });

        // MA slot
        const slotE = document.createElement("div");
        slotE.className = "slot";
        slotE.innerHTML = `<div class="slotTitle">Mitarbeiter</div><div class="slotItems"></div>`;
        const eItems = slotE.querySelector(".slotItems");
        eItems.addEventListener("dragover", e=> EDIT_MODE && e.preventDefault());
        eItems.addEventListener("drop", e=>{
          if(!EDIT_MODE) return;
          e.preventDefault();
          const data = getDrag(e);
          if(!data || data.kind!=="employee") return;

          if(dayHasEmployee(dayISO, data.id)){
            const ok = confirm(`Mitarbeiter ist an dem Tag schon eingeplant/Status. Trotzdem doppelt?`);
            if(!ok) return;
          }

          pb.employees ||= [];
          if(!pb.employees.includes(data.id)) pb.employees.push(data.id);
          markChanged(); renderAll();
        });

        (pb.employees||[]).forEach(eid=>{
          const emp = findEmployee(eid);
          if(!emp) return;
          const tag = document.createElement("div");
          tag.className = "tag";
          tag.style.background = emp.color;
          tag.style.color = "#fff";
          tag.textContent = emp.name;

          const x = document.createElement("span");
          x.className = "x";
          x.textContent = "✖";
          x.title = "Entfernen";
          x.addEventListener("click", ()=>{
            if(!EDIT_MODE) return;
            pb.employees = pb.employees.filter(id=>id!==eid);
            markChanged(); renderAll();
          });
          tag.appendChild(x);

          eItems.appendChild(tag);
        });

        body.appendChild(slotV);
        body.appendChild(slotE);
        block.appendChild(body);

        projectsRow.appendChild(block);
      });

      drop.appendChild(projectsRow);
      dayEl.appendChild(drop);
      days.appendChild(dayEl);
    }

    weekBox.appendChild(days);
    weeksEl.appendChild(weekBox);
  }
}

// ---------- Trash ----------
function bindTrash(){
  trash.addEventListener("dragover", e=>{
    if(!EDIT_MODE) return;
    e.preventDefault();
    trash.classList.add("over");
  });
  trash.addEventListener("dragleave", ()=> trash.classList.remove("over"));
  trash.addEventListener("drop", e=>{
    if(!EDIT_MODE) return;
    e.preventDefault(); trash.classList.remove("over");
    const data = getDrag(e);
    if(!data) return;

    if(data.kind==="project"){
      moveProjectToPool(data.id);
    }
    if(data.kind==="projectBlock"){
      moveProjectToPool(data.projectId);
    }

    if(data.kind==="vehicle"){
      const v = findVehicle(data.id);
      if(!v) return;
      if(!confirm(`Fahrzeug "${v.name}" wirklich aus Stammdaten löschen?`)) return;
      state.vehicles = state.vehicles.filter(x=>x.id!==v.id);
      for(const dayISO of Object.keys(state.days)){
        const day = ensureDay(dayISO);
        day.projects.forEach(pb=> pb.vehicles = (pb.vehicles||[]).filter(id=>id!==v.id));
      }
      markChanged(); renderAll();
    }

    if(data.kind==="employee"){
      const emp = findEmployee(data.id);
      if(!emp) return;
      if(!confirm(`Mitarbeiter "${emp.name}" wirklich aus Stammdaten löschen?`)) return;
      state.employees = state.employees.filter(x=>x.id!==emp.id);
      for(const dayISO of Object.keys(state.days)){
        const day = ensureDay(dayISO);
        day.projects.forEach(pb=> pb.employees = (pb.employees||[]).filter(id=>id!==emp.id));
        day.status.forEach(sb=> sb.employees = (sb.employees||[]).filter(id=>id!==emp.id));
      }
      markChanged(); renderAll();
    }
  });
}

// ---------- Auth ----------
async function refreshAuthMode(){
  currentUser = await window.SB.getUser();
  if(!currentUser){
    EDIT_MODE = false;
    applyMode();
    return;
  }

  const ok = await window.SB.isEditor(currentUser.email);
  EDIT_MODE = !!ok;
  applyMode();
}

function bindLogin(){
  btnLogin.addEventListener("click", openLogin);
  loginClose.addEventListener("click", closeLogin);
  loginModal.addEventListener("click", (e)=>{
    if(e.target === loginModal) closeLogin();
  });

  loginDo.addEventListener("click", async ()=>{
    loginMsg.textContent = "";
    const email = loginEmail.value.trim();
    const pass = loginPass.value;
    if(!email || !pass){
      loginMsg.textContent = "Bitte E-Mail und Passwort eingeben.";
      return;
    }

    const { error } = await window.SB.login(email, pass);
    if(error){
      loginMsg.textContent = `Login fehlgeschlagen: ${error.message}`;
      return;
    }

    await refreshAuthMode();
    if(!EDIT_MODE){
      loginMsg.textContent = "Du bist eingeloggt, aber nicht als Editor freigeschaltet.";
      return;
    }

    closeLogin();
    // sofort einmal speichern (falls lokal schon was drin war)
    await pushRemote();
  });

  btnLogout.addEventListener("click", async ()=>{
    await window.SB.logout();
    await refreshAuthMode();
  });

  window.sb.auth.onAuthStateChange(async ()=>{
    await refreshAuthMode();
  });
}

// ---------- Auto Sync ----------
async function initialLoadFromRemote(){
  const remote = await fetchRemote();
  if(!remote || !remote.data) return;

  lastRemoteUpdatedAt = remote.updated_at;

  // Wenn remote leer ist und wir Editor sind, können wir local seed pushen.
  // Sonst: remote gewinnt.
  const remoteIsEmpty = JSON.stringify(remote.data) === "{}";
  if(remoteIsEmpty){
    // nichts zu tun
    return;
  }

  state = remote.data;
  // normalize
  if(!state.weekStartISO) state.weekStartISO = toISO(mondayOf(new Date()));
  state.vehicles ||= [];
  state.employees ||= [];
  state.projects ||= [];
  state.days ||= {};
  saveLocal();
  renderAll();
}

async function tickSync(){
  const remote = await fetchRemote();
  if(!remote) return;

  const remoteUpdated = remote.updated_at;

  // Wenn wir lokal ungespeicherte Änderungen haben (Editor), nicht automatisch überschreiben
  if(EDIT_MODE && localDirty){
    return;
  }

  if(lastRemoteUpdatedAt && remoteUpdated && remoteUpdated <= lastRemoteUpdatedAt){
    return;
  }

  lastRemoteUpdatedAt = remoteUpdated || lastRemoteUpdatedAt;

  if(remote.data){
    state = remote.data;
    if(!state.weekStartISO) state.weekStartISO = toISO(mondayOf(new Date()));
    state.vehicles ||= [];
    state.employees ||= [];
    state.projects ||= [];
    state.days ||= {};
    saveLocal();
    renderAll();
  }
}

// ---------- Wire events ----------
(function init(){
  // Zoom init
  const z = getZoom();
  // in select setzen, wenn es passt
  if(zoomSelect) zoomSelect.value = String(z);
  setZoom(z);

  zoomSelect.addEventListener("change", ()=> setZoom(parseFloat(zoomSelect.value)));
  zoomInBtn.addEventListener("click", ()=>{
    const values = [0.2,0.4,0.6,0.8,1.0,1.2,1.6];
    const cur = getZoom();
    const idx = values.indexOf(cur);
    const next = idx >= 0 ? values[Math.min(values.length-1, idx+1)] : Math.min(1.6, cur+0.2);
    setZoom(next);
  });
  zoomOutBtn.addEventListener("click", ()=>{
    const values = [0.2,0.4,0.6,0.8,1.0,1.2,1.6];
    const cur = getZoom();
    const idx = values.indexOf(cur);
    const next = idx >= 0 ? values[Math.max(0, idx-1)] : Math.max(0.2, cur-0.2);
    setZoom(next);
  });

  // start date input
  startDateEl.value = state.weekStartISO;

  startDateEl.addEventListener("change", ()=>{
    if(!EDIT_MODE) return; // Ansicht: keine Änderungen
    const d = mondayOf(parseISO(startDateEl.value));
    state.weekStartISO = toISO(d);
    markChanged(); renderAll();
  });

  btnToday.addEventListener("click", ()=>{
    if(!EDIT_MODE) return;
    state.weekStartISO = toISO(mondayOf(new Date()));
    markChanged(); renderAll();
  });

  weekPrev.addEventListener("click", ()=>{
    if(!EDIT_MODE) return;
    const d = addDays(parseISO(state.weekStartISO), -7);
    state.weekStartISO = toISO(mondayOf(d));
    markChanged(); renderAll();
  });

  weekNext.addEventListener("click", ()=>{
    if(!EDIT_MODE) return;
    const d = addDays(parseISO(state.weekStartISO), +7);
    state.weekStartISO = toISO(mondayOf(d));
    markChanged(); renderAll();
  });

  btnReset.addEventListener("click", ()=>{
    if(!EDIT_MODE) return;
    if(!confirm("Wirklich ALLES zurücksetzen (alle Daten weg)?")) return;
    localStorage.removeItem(LS_KEY);
    state = loadLocal();
    markChanged(); renderAll();
  });

  addVehicleBtn.addEventListener("click", ()=>{ addVehicle(vehicleInput.value); vehicleInput.value=""; });
  vehicleInput.addEventListener("keydown", e=>{ if(e.key==="Enter") addVehicleBtn.click(); });

  addEmployeeBtn.addEventListener("click", ()=>{ addEmployee(employeeInput.value); employeeInput.value=""; });
  employeeInput.addEventListener("keydown", e=>{ if(e.key==="Enter") addEmployeeBtn.click(); });

  addProjectBtn.addEventListener("click", ()=>{ addProject(projectInput.value); projectInput.value=""; });
  projectInput.addEventListener("keydown", e=>{ if(e.key==="Enter") addProjectBtn.click(); });

  bindTrash();
  bindLogin();

  // Erst rendern (Ansicht)
  renderAll();
  applyMode();

  // Auth prüfen (Editor ja/nein)
  refreshAuthMode().then(async ()=>{
    // Initial remote load (für alle)
    await initialLoadFromRemote();

    // Auto Sync
    if(syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(tickSync, AUTO_SYNC_MS);

    // Wenn Editor: beim Start einmal pushen (falls remote leer und lokal gefüllt)
    if(EDIT_MODE){
      const remote = await fetchRemote();
      if(remote && JSON.stringify(remote.data || {}) === "{}" && JSON.stringify(state || {}) !== "{}"){
        await pushRemote();
      }
    }
  });
})();
