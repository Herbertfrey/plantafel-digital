// =====================================================
// SUPABASE ONLINE SYNC + EDITOR LOGIN (NEU)
// =====================================================
// 1) Trage hier deine Supabase Daten ein:
const SUPABASE_URL = "https://yzfmviddzhghvcxowbjl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Zm12aWRkemhnaHZjeG93YmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MjkyNzIsImV4cCI6MjA4MDQwNTI3Mn0.BOmbE7xq1-kUBdbH3kpN4lIjDyWIwLaCpS6ZT3mbb9U";

// 2) Tabelle: plantafel_state  (eine Zeile, key="main")
// 3) Tabelle: editors (email als primary key)
// SQL + Policies stehen unter den Dateien.

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Ein Datensatz für die komplette Plantafel:
const REMOTE_KEY = "main";

// UI
const syncStateEl = document.getElementById("syncState");
const btnLoginOpen = document.getElementById("btnLoginOpen");
const btnLogout = document.getElementById("btnLogout");

const loginModal = document.getElementById("loginModal");
const btnLoginClose = document.getElementById("btnLoginClose");
const btnLogin = document.getElementById("btnLogin");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");

let canEdit = false;           // wird nach Login + Editor-Check gesetzt
let applyingRemote = false;    // verhindert Loop
let saveTimer = null;          // debounce
let lastRemoteUpdatedAt = null;

// Badge
function setSyncBadge(text, level){
  syncStateEl.textContent = text;
  syncStateEl.classList.remove("ok","warn","bad");
  if(level) syncStateEl.classList.add(level);
}

// Modal
function openLogin(){ loginModal.classList.add("open"); loginModal.setAttribute("aria-hidden","false"); loginError.textContent=""; }
function closeLogin(){ loginModal.classList.remove("open"); loginModal.setAttribute("aria-hidden","true"); loginError.textContent=""; }

btnLoginOpen?.addEventListener("click", openLogin);
btnLoginClose?.addEventListener("click", closeLogin);
loginModal?.querySelector(".modal__backdrop")?.addEventListener("click", closeLogin);

// Editor Login
btnLogin?.addEventListener("click", async ()=>{
  loginError.textContent = "";
  const email = (loginEmail.value || "").trim();
  const password = (loginPassword.value || "").trim();
  if(!email || !password){
    loginError.textContent = "Bitte E-Mail + Passwort eingeben.";
    return;
  }

  const { error } = await db.auth.signInWithPassword({ email, password });
  if(error){
    loginError.textContent = "Login fehlgeschlagen. Prüfe E-Mail/Passwort.";
    return;
  }
  closeLogin();
  await refreshAuthAndRole();
  // Nach Login: sofort neu rendern (Readonly ggf. raus)
  applyReadonlyUI();
});

// Logout
btnLogout?.addEventListener("click", async ()=>{
  await db.auth.signOut();
  await refreshAuthAndRole();
  applyReadonlyUI();
});

// Prüft: eingeloggt? und ist in editors?
async function refreshAuthAndRole(){
  const { data } = await db.auth.getUser();
  const user = data?.user || null;

  if(!user){
    canEdit = false;
    btnLogout.style.display = "none";
    setSyncBadge("Online · Ansicht", "warn");
    return;
  }

  // editors-Check
  const { data: editorRow } = await db
    .from("editors")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();

  canEdit = !!editorRow;
  btnLogout.style.display = "inline-flex";

  if(canEdit){
    setSyncBadge("Online · Editor", "ok");
  }else{
    setSyncBadge("Online · Ansicht", "warn");
  }
}

function applyReadonlyUI(){
  document.body.classList.toggle("readonly", !canEdit);
}

// Remote load (state holen)
async function loadRemoteState(){
  setSyncBadge("Lade…", "warn");

  const { data, error } = await db
    .from("plantafel_state")
    .select("data, updated_at")
    .eq("key", REMOTE_KEY)
    .maybeSingle();

  if(error){
    // Kein Zugriff / RLS / Tabelle fehlt
    setSyncBadge("Offline (RLS/Tabellen?)", "bad");
    return null;
  }

  if(!data) return null;
  lastRemoteUpdatedAt = data.updated_at;
  setSyncBadge(canEdit ? "Online · Editor" : "Online · Ansicht", canEdit ? "ok" : "warn");
  return data.data;
}

// Remote save (nur Editor)
async function saveRemoteState(nextState){
  if(!canEdit) return;
  if(applyingRemote) return;

  setSyncBadge("Speichere…", "warn");

  const payload = {
    key: REMOTE_KEY,
    data: nextState
  };

  const { error } = await db
    .from("plantafel_state")
    .upsert(payload, { onConflict: "key" });

  if(error){
    setSyncBadge("Fehler beim Speichern", "bad");
    return;
  }
  setSyncBadge("Online · Gespeichert", "ok");
}

// Debounced save -> Remote
function scheduleRemoteSave(){
  if(!canEdit) return;
  if(saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(()=> saveRemoteState(state), 800);
}

// Realtime Updates (wenn jemand anders speichert)
function subscribeRealtime(){
  try{
    db.channel("plantafel_state_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "plantafel_state" },
        async (payload) => {
          // nur auf unseren key reagieren
          const row = payload.new;
          if(!row || row.key !== REMOTE_KEY) return;

          // wenn wir gerade selbst gespeichert haben, trotzdem ok – wir übernehmen remote als Quelle
          applyingRemote = true;
          try{
            const remote = row.data;
            if(remote){
              state = remote;
              saveLocalOnly();   // local cache aktualisieren
              renderAll();
            }
          } finally {
            applyingRemote = false;
          }
        }
      )
      .subscribe();
  }catch{
    // falls Realtime nicht aktiv, egal
  }
}

// =====================================================
// DEINE PLANTAFEL – ORIGINAL (nur SAVE/LOAD erweitert)
// =====================================================

// Plantafel – Komplett, stabil, Drag&Drop, localStorage + Online Sync
const LS_KEY = "plantafel_frey_full_v1";

const MONTHS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
const DAYNAMES = ["Mo","Di","Mi","Do","Fr"];
const EMP_COLORS = ["#1e88e5","#43a047","#fb8c00","#8e24aa","#00897b","#e11d48","#0ea5e9","#64748b","#22c55e","#f97316"];

const defaultState = {
  weekStartISO: null, // Monday ISO
  vehicles: [],       // {id,name}
  employees: [],      // {id,name,color}
  projects: [],       // {id,name, where:"pool"|"month"|"day", monthIndex?:0-11, dayISO?:string}
  days: {
    // [dayISO]: { projects:[{id,projectId, vehicles:[vehicleId], employees:[employeeId]}], status:[{id,type, employees:[employeeId]}] }
  }
};

let state = load();

function saveLocalOnly(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }

// WICHTIG: save() speichert lokal IMMER, remote NUR wenn Editor
function save(){
  saveLocalOnly();
  scheduleRemoteSave();
}

// WICHTIG: load() bleibt lokal – Remote laden wir danach async
function load(){
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

// ---------- DnD helpers ----------
function setDrag(e, payload){
  if(!canEdit){ e.preventDefault(); return; }   // Viewer: kein Drag
  e.dataTransfer.setData("application/json", JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "move";
}
function getDrag(e){
  try{
    const raw = e.dataTransfer.getData("application/json");
    return raw ? JSON.parse(raw) : null;
  }catch{ return null; }
}

// ---------- Actions ----------
function addVehicle(name){
  if(!canEdit) return;
  name = name.trim();
  if(!name) return;
  state.vehicles.push({ id: uid(), name });
  save(); renderAll();
}
function addEmployee(name){
  if(!canEdit) return;
  name = name.trim();
  if(!name) return;
  const color = EMP_COLORS[state.employees.length % EMP_COLORS.length];
  state.employees.push({ id: uid(), name, color });
  save(); renderAll();
}
function addProject(name){
  if(!canEdit) return;
  name = name.trim();
  if(!name) return;
  const id = uid();
  state.projects.push({ id, name, where:"pool" });
  save(); renderAll();
}

function deleteProjectEverywhere(projectId){
  if(!canEdit) return;
  const p = findProject(projectId);
  if(!p) return;
  if(!confirm(`Projekt wirklich löschen: "${p.name}" ?`)) return;

  for(const dayISO of Object.keys(state.days)){
    const day = ensureDay(dayISO);
    day.projects = day.projects.filter(pb=>pb.projectId!==projectId);
  }
  state.projects = state.projects.filter(x=>x.id!==projectId);

  save(); renderAll();
}

function moveProjectToPool(projectId){
  if(!canEdit) return;
  const p = findProject(projectId);
  if(!p) return;
  for(const dayISO of Object.keys(state.days)){
    const day = ensureDay(dayISO);
    day.projects = day.projects.filter(pb=>pb.projectId!==projectId);
  }
  p.where="pool";
  delete p.monthIndex;
  delete p.dayISO;
  save(); renderAll();
}

function moveProjectToMonth(projectId, monthIndex){
  if(!canEdit) return;
  const p = findProject(projectId);
  if(!p) return;

  for(const dayISO of Object.keys(state.days)){
    const day = ensureDay(dayISO);
    day.projects = day.projects.filter(pb=>pb.projectId!==projectId);
  }
  p.where="month";
  p.monthIndex = monthIndex;
  delete p.dayISO;
  save(); renderAll();
}

function placeProjectToDay(projectId, dayISO){
  if(!canEdit) return;
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

  save(); renderAll();
}

function moveProjectBlockDay(projectId, fromDayISO, toDayISO){
  if(!canEdit) return;
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

  save(); renderAll();
}

function removeProjectBlockFromDay(projectId, dayISO){
  if(!canEdit) return;
  const day = ensureDay(dayISO);
  day.projects = day.projects.filter(pb=>pb.projectId!==projectId);
  moveProjectToPool(projectId);
}

// Status
function addStatusBox(dayISO, type){
  if(!canEdit) return;
  const day = ensureDay(dayISO);
  day.status.push({ id: uid(), type, employees:[] });
  save(); renderAll();
}
function removeStatusBox(dayISO, statusId){
  if(!canEdit) return;
  const day = ensureDay(dayISO);
  day.status = day.status.filter(s=>s.id!==statusId);
  save(); renderAll();
}

// ---------- Render ----------
function renderAll(){
  renderTop();
  renderMasters();
  renderPool();
  renderMonths();
  renderWeeks();
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
    el.draggable = canEdit;
    el.addEventListener("dragstart", e=> setDrag(e,{kind:"vehicle", id:v.id}) );

    const del = document.createElement("span");
    del.className="del";
    del.textContent="✖";
    del.title="Fahrzeug löschen (Stammdaten)";
    del.addEventListener("click", ()=>{
      if(!canEdit) return;
      if(!confirm(`Fahrzeug wirklich löschen: "${v.name}"?`)) return;
      state.vehicles = state.vehicles.filter(x=>x.id!==v.id);
      for(const dayISO of Object.keys(state.days)){
        const day = ensureDay(dayISO);
        day.projects.forEach(pb=>{
          pb.vehicles = (pb.vehicles||[]).filter(id=>id!==v.id);
        });
      }
      save(); renderAll();
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
    el.draggable = canEdit;
    el.addEventListener("dragstart", e=> setDrag(e,{kind:"employee", id:emp.id}) );

    const del = document.createElement("span");
    del.className="del";
    del.textContent="✖";
    del.title="Mitarbeiter löschen (Stammdaten)";
    del.addEventListener("click", ()=>{
      if(!canEdit) return;
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
      save(); renderAll();
    });
    el.appendChild(del);

    employeeList.appendChild(el);
  });

  // Status palette drag
  document.querySelectorAll(".status-chip").forEach(ch=>{
    ch.setAttribute("draggable", canEdit ? "true" : "false");
    ch.addEventListener("dragstart", e=>{
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
    el.draggable = canEdit;
    el.addEventListener("dragstart", e=> setDrag(e,{kind:"project", id:p.id}) );

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

    drop.addEventListener("dragover", e=>{ if(!canEdit) return; e.preventDefault(); drop.classList.add("over"); });
    drop.addEventListener("dragleave", ()=> drop.classList.remove("over"));
    drop.addEventListener("drop", e=>{
      if(!canEdit) return;
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
      el.draggable = canEdit;
      el.addEventListener("dragstart", e=> setDrag(e,{kind:"project", id:p.id}) );

      const x = document.createElement("span");
      x.className="del";
      x.textContent="✖";
      x.title="Zurück in Pool";
      x.addEventListener("click", ()=> moveProjectToPool(p.id));
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

      drop.addEventListener("dragover", e=>{ if(!canEdit) return; e.preventDefault(); drop.classList.add("over"); });
      drop.addEventListener("dragleave", ()=> drop.classList.remove("over"));
      drop.addEventListener("drop", e=>{
        if(!canEdit) return;
        e.preventDefault(); drop.classList.remove("over");
        const data = getDrag(e);
        if(!data) return;

        if(data.kind==="project") placeProjectToDay(data.id, dayISO);
        if(data.kind==="projectBlock") moveProjectBlockDay(data.projectId, data.dayISO, dayISO);
        if(data.kind==="status") addStatusBox(dayISO, data.type);
      });

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

        people.addEventListener("dragover", e=>{ if(!canEdit) return; e.preventDefault(); });
        people.addEventListener("drop", e=>{
          if(!canEdit) return;
          e.preventDefault();
          const data = getDrag(e);
          if(!data || data.kind!=="employee") return;

          if(dayHasEmployee(dayISO, data.id)){
            const ok = confirm(`Mitarbeiter ist an dem Tag schon eingeplant. Trotzdem doppelt?`);
            if(!ok) return;
          }
          if(!sb.employees.includes(data.id)) sb.employees.push(data.id);
          save(); renderAll();
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
            if(!canEdit) return;
            sb.employees = sb.employees.filter(id=>id!==eid);
            save(); renderAll();
          });
          tag.appendChild(x);

          people.appendChild(tag);
        });

        box.appendChild(people);
        statusArea.appendChild(box);
      });

      drop.appendChild(statusArea);

      const projectsRow = document.createElement("div");
      projectsRow.className = "projectsRow";

      day.projects.forEach(pb=>{
        const proj = findProject(pb.projectId);
        const block = document.createElement("div");
        block.className = "projectBlock";

        const head2 = document.createElement("div");
        head2.className = "projectBlockHead";
        head2.draggable = canEdit;

        head2.addEventListener("dragstart", e=>{
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
          if(!canEdit) return;
          removeProjectBlockFromDay(pb.projectId, dayISO);
        });
        head2.appendChild(xbtn);

        block.appendChild(head2);

        const body = document.createElement("div");
        body.className = "projectBlockBody";

        const slotV = document.createElement("div");
        slotV.className = "slot";
        slotV.innerHTML = `<div class="slotTitle">KFZ</div><div class="slotItems"></div>`;
        const vItems = slotV.querySelector(".slotItems");
        vItems.addEventListener("dragover", e=>{ if(!canEdit) return; e.preventDefault(); });
        vItems.addEventListener("drop", e=>{
          if(!canEdit) return;
          e.preventDefault();
          const data = getDrag(e);
          if(!data || data.kind!=="vehicle") return;

          if(dayHasVehicle(dayISO, data.id)){
            const ok = confirm(`KFZ ist an dem Tag schon eingeplant. Trotzdem doppelt?`);
            if(!ok) return;
          }
          pb.vehicles ||= [];
          if(!pb.vehicles.includes(data.id)) pb.vehicles.push(data.id);
          save(); renderAll();
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
            if(!canEdit) return;
            pb.vehicles = pb.vehicles.filter(id=>id!==vid);
            save(); renderAll();
          });
          tag.appendChild(x);

          vItems.appendChild(tag);
        });

        const slotE = document.createElement("div");
        slotE.className = "slot";
        slotE.innerHTML = `<div class="slotTitle">Mitarbeiter</div><div class="slotItems"></div>`;
        const eItems = slotE.querySelector(".slotItems");
        eItems.addEventListener("dragover", e=>{ if(!canEdit) return; e.preventDefault(); });
        eItems.addEventListener("drop", e=>{
          if(!canEdit) return;
          e.preventDefault();
          const data = getDrag(e);
          if(!data || data.kind!=="employee") return;

          if(dayHasEmployee(dayISO, data.id)){
            const ok = confirm(`Mitarbeiter ist an dem Tag schon eingeplant/Status. Trotzdem doppelt?`);
            if(!ok) return;
          }
          pb.employees ||= [];
          if(!pb.employees.includes(data.id)) pb.employees.push(data.id);
          save(); renderAll();
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
            if(!canEdit) return;
            pb.employees = pb.employees.filter(id=>id!==eid);
            save(); renderAll();
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

// ---------- Wire events ----------
(async function init(){
  // Auth/Role zuerst
  await refreshAuthAndRole();
  applyReadonlyUI();
  subscribeRealtime();

  // Remote zuerst versuchen (damit Handy/PC gleich ist)
  const remote = await loadRemoteState();
  if(remote){
    applyingRemote = true;
    try{
      state = remote;
      saveLocalOnly();
    } finally {
      applyingRemote = false;
    }
  }

  // start date input
  startDateEl.value = state.weekStartISO;

  startDateEl.addEventListener("change", ()=>{
    if(!canEdit) return;
    const d = mondayOf(parseISO(startDateEl.value));
    state.weekStartISO = toISO(d);
    save(); renderAll();
  });

  btnToday.addEventListener("click", ()=>{
    if(!canEdit) return;
    state.weekStartISO = toISO(mondayOf(new Date()));
    save(); renderAll();
  });

  weekPrev.addEventListener("click", ()=>{
    if(!canEdit) return;
    const d = addDays(parseISO(state.weekStartISO), -7);
    state.weekStartISO = toISO(mondayOf(d));
    save(); renderAll();
  });

  weekNext.addEventListener("click", ()=>{
    if(!canEdit) return;
    const d = addDays(parseISO(state.weekStartISO), +7);
    state.weekStartISO = toISO(mondayOf(d));
    save(); renderAll();
  });

  btnReset.addEventListener("click", ()=>{
    if(!canEdit) return;
    if(!confirm("Wirklich ALLES zurücksetzen (alle Daten weg)?")) return;
    localStorage.removeItem(LS_KEY);
    state = load();
    save(); renderAll();
  });

  addVehicleBtn.addEventListener("click", ()=>{ addVehicle(vehicleInput.value); vehicleInput.value=""; });
  vehicleInput.addEventListener("keydown", e=>{ if(e.key==="Enter") addVehicleBtn.click(); });

  addEmployeeBtn.addEventListener("click", ()=>{ addEmployee(employeeInput.value); employeeInput.value=""; });
  employeeInput.addEventListener("keydown", e=>{ if(e.key==="Enter") addEmployeeBtn.click(); });

  addProjectBtn.addEventListener("click", ()=>{ addProject(projectInput.value); projectInput.value=""; });
  projectInput.addEventListener("keydown", e=>{ if(e.key==="Enter") addProjectBtn.click(); });

  // trash
  trash.addEventListener("dragover", e=>{ if(!canEdit) return; e.preventDefault(); trash.classList.add("over"); });
  trash.addEventListener("dragleave", ()=> trash.classList.remove("over"));
  trash.addEventListener("drop", e=>{
    if(!canEdit) return;
    e.preventDefault(); trash.classList.remove("over");
    const data = getDrag(e);
    if(!data) return;

    if(data.kind==="project") moveProjectToPool(data.id);
    if(data.kind==="projectBlock") moveProjectToPool(data.projectId);

    if(data.kind==="vehicle"){
      const v = findVehicle(data.id);
      if(!v) return;
      if(!confirm(`Fahrzeug "${v.name}" wirklich aus Stammdaten löschen?`)) return;
      state.vehicles = state.vehicles.filter(x=>x.id!==v.id);
      for(const dayISO of Object.keys(state.days)){
        const day = ensureDay(dayISO);
        day.projects.forEach(pb=> pb.vehicles = (pb.vehicles||[]).filter(id=>id!==v.id));
      }
      save(); renderAll();
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
      save(); renderAll();
    }
  });

  // Login UI Buttons sichtbar
  btnLoginOpen.style.display = "inline-flex";
  btnLogout.style.display = (await db.auth.getUser()).data?.user ? "inline-flex" : "none";

  renderAll();
  saveLocalOnly(); // nur cache
})();
