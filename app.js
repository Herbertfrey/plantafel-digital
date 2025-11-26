import { supa } from "./supabase.js";

/* ======================================================
   Globale Variablen
======================================================= */
let mitarbeiter = [];
let fahrzeuge = [];
let baustellen = [];
let eintraege = [];

let currentView = "14d";

/* ======================================================
   Helper: Farbe aus Name erzeugen
======================================================= */
function colorFromName(name) {
  if (!name) return "#005bbb"; // fallback
  let hash = 0;
  for (let i=0;i<name.length;i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 45%)`;
}

/* ======================================================
   LOAD ALL
======================================================= */
export async function loadAll() {

  const { data: e } = await supa.from("plantafel").select().order("tag");
  const { data: m } = await supa.from("mitarbeiter").select().order("name");
  const { data: f } = await supa.from("fahrzeuge").select().order("name");
  const { data: b } = await supa.from("baustellen").select().order("name");

  eintraege = e || [];
  mitarbeiter = m || [];
  fahrzeuge = f || [];
  baustellen = b || [];

  renderBoard();
}

/* ======================================================
   ENTRY CRUD
======================================================= */
export async function insertEntries(rows) {
  return await supa.from("plantafel").insert(rows);
}

export async function updateEntry(id, payload) {
  return await supa.from("plantafel").update(payload).eq("id", id);
}

export async function deleteEntry(id) {
  return await supa.from("plantafel").delete().eq("id", id);
}

/* ======================================================
   Stammdaten
======================================================= */
export async function addMitarbeiter(name) {
  await supa.from("mitarbeiter").insert({ name });
  loadAll();
}

export async function addFahrzeug(name) {
  await supa.from("fahrzeuge").insert({ name });
  loadAll();
}

export async function addBaustelle(name) {
  await supa.from("baustellen").insert({ name });
  loadAll();
}

export async function deleteMitarbeiter(id) {
  await supa.from("mitarbeiter").delete().eq("id", id);
  loadAll();
}
export async function deleteFahrzeug(id) {
  await supa.from("fahrzeuge").delete().eq("id", id);
  loadAll();
}
export async function deleteBaustelle(id) {
  await supa.from("baustellen").delete().eq("id", id);
  loadAll();
}

/* ======================================================
   RENDER EVERYTHING
======================================================= */
function renderBoard(){
  const start = new Date(startDate.value);
  const container = document.getElementById("boardContainer");
  container.innerHTML = "";

  if(currentView=="14d") render14(start);
  if(currentView=="4w") render4Weeks(start);
  if(currentView=="12m") render12Months(start);
}

/* ======================================================
   14 Tage
======================================================= */
function render14(start){
  const wrap = document.createElement("div");
  wrap.style.display = "grid";
  wrap.style.gridTemplateColumns = "repeat(7 ,1fr)";
  wrap.style.gap = "10px";

  let d=new Date(start);
  let added=0;
  while(added<14){
    const wd = d.getDay();
    if(wd!==0 && wd!==6){
      wrap.appendChild(renderDayBox(d));
      added++;
    }
    d.setDate(d.getDate()+1);
  }
  boardContainer.appendChild(wrap)
}

/* ======================================================
   4 Wochen
======================================================= */
function render4Weeks(start){
  const wrap=document.createElement("div");
  wrap.style.display="grid";
  wrap.style.gridTemplateColumns="repeat(5,1fr)";
  wrap.style.gap="10px";

  const s=new Date(start);
  const weekday=s.getDay();
  const diff=weekday===0?6:weekday-1;
  s.setDate(s.getDate()-diff);

  for(let w=0;w<4;w++){
    for(let wd=0;wd<5;wd++){
      const d=new Date(s);
      d.setDate(s.getDate()+w*7+wd);
      wrap.appendChild(renderDayBox(d));
    }
  }
  boardContainer.appendChild(wrap);
}

/* ======================================================
   12 Monate
======================================================= */
function render12Months(start){
  const wrap=document.createElement("div");
  wrap.style.display="grid";
  wrap.style.gridTemplateColumns="repeat(4,1fr)";
  wrap.style.gap="15px";

  const y=start.getFullYear();

  for(let m=0;m<12;m++){

    const box=document.createElement("div");
    box.className="month-box";

    const head=document.createElement("div");
    head.className="month-head";
    head.textContent=new Date(y,m,1).toLocaleString("de-DE",{
      month:"long",
      year:"numeric"
    });
    box.appendChild(head);

    const content=document.createElement("div");

    eintraege
      .filter(e=>{
        const d=new Date(e.tag);
        return d.getFullYear()==y && d.getMonth()==m;
      })
      .forEach(e=>content.appendChild(renderEntry(e)));

    box.appendChild(content);
    wrap.appendChild(box);
  }
  boardContainer.appendChild(wrap);
}

/* ======================================================
   Tagesbox
======================================================= */
function renderDayBox(d){
  const box=document.createElement("div");
  box.className="day-box";

  const dateStr=d.toISOString().slice(0,10);

  const head=document.createElement("div");
  head.className="day-head";
  head.textContent=d.toLocaleDateString("de-DE",{
    weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"
  });
  box.appendChild(head);

  const body=document.createElement("div");
  eintraege.filter(e=>e.tag===dateStr)
           .forEach(e=>body.appendChild(renderEntry(e)));

  box.onclick=(evt)=>{
    if(evt.target===box || evt.target===head || evt.target===body){
      openEntryDialog({tag:dateStr});
    }
  };

  box.appendChild(body);
  return box;
}

/* ======================================================
   Entry Card
======================================================= */
function renderEntry(e){
  const div=document.createElement("div");
  div.className="entry";
  div.draggable=true;

  const bar=document.createElement("div");
  bar.className="entry-color";
  bar.style.background=e.status ? "#005bbb" : colorFromName(e.mitarbeiter?.split(",")[0]);

  const title=document.createElement("div");
  title.className="entry-title";
  title.textContent=e.titel;

  const info=document.createElement("div");
  info.className="entry-meta";
  info.textContent=e.mitarbeiter || "";

  const btn=document.createElement("button");
  btn.textContent="✏️";
  btn.onclick = ()=> openEntryDialog(e);

  const del=document.createElement("button");
  del.textContent="🗑️";
  del.onclick = ()=> deleteEntry(e.id).then(loadAll);

  div.append(bar,title,info,btn,del);
  return div;
}

/* ======================================================
   Init
======================================================= */
window.onload=()=>{
  const t=new Date();
  startDate.value=t.toISOString().slice(0,10);
  loadAll();
}
