let dragItem = null;
let farben = ["#2563eb","#16a34a","#7c3aed","#ea580c","#0891b2"];

function drag(ev){ dragItem = ev.target; }
function allowDrop(ev){ ev.preventDefault(); }

function drop(ev){
  ev.preventDefault();
  if(dragItem) ev.target.appendChild(dragItem);
  dragItem = null;
}

function deleteItem(ev){
  ev.preventDefault();
  if(dragItem) dragItem.remove();
  dragItem = null;
}

/* ---------- Magnet anlegen ---------- */

function createMagnet(text, cls, color){
  const d = document.createElement("div");
  d.className = `magnet ${cls}`;
  if(color) d.style.background = color;
  d.textContent = text;
  d.draggable = true;
  d.ondragstart = drag;
  return d;
}

function addProjekt(){
  const v = projektName.value.trim();
  if(!v) return;
  projekte.appendChild(createMagnet(v,"projekt"));
  projektName.value="";
}

function addFahrzeug(){
  const v = fahrzeugName.value.trim();
  if(!v) return;
  fahrzeuge.appendChild(createMagnet(v,"fahrzeug"));
  fahrzeugName.value="";
}

function addMitarbeiter(){
  const v = mitarbeiterName.value.trim();
  if(!v) return;
  const color = farben[Math.floor(Math.random()*farben.length)];
  mitarbeiter.appendChild(createMagnet(v,"mitarbeiter",color));
  mitarbeiterName.value="";
}

/* ---------- Plantafel ---------- */

function buildPlantafel(){
  const p = document.getElementById("plantafel");
  p.innerHTML="";
  const start = new Date();
  start.setDate(start.getDate() - start.getDay() + 1);

  for(let w=0; w<4; w++){
    const kw = document.createElement("div");
    kw.className="kw";
    const d1 = new Date(start);
    d1.setDate(start.getDate()+w*7);
    const d2 = new Date(d1);
    d2.setDate(d1.getDate()+4);

    kw.innerHTML = `<h3>KW ${getKW(d1)} · ${fmt(d1)}–${fmt(d2)}</h3>`;
    ["Mo","Di","Mi","Do","Fr"].forEach(t=>{
      const day = document.createElement("div");
      day.className="tag";
      day.ondragover=allowDrop;
      day.ondrop=drop;
      day.innerHTML=`<strong>${t}</strong>`;
      kw.appendChild(day);
    });
    p.appendChild(kw);
  }
}

function fmt(d){
  return `${d.getDate().toString().padStart(2,"0")}.${(d.getMonth()+1).toString().padStart(2,"0")}`;
}

function getKW(d){
  const x = new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const day = x.getUTCDay()||7;
  x.setUTCDate(x.getUTCDate()+4-day);
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(),0,1));
  return Math.ceil((((x-yearStart)/86400000)+1)/7);
}

buildPlantafel();
