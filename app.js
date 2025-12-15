// ===============================
// PLANTAFEL – DRAG-STABILE VERSION
// ===============================

const LS_KEY = "plantafel_drag_final";

const state = JSON.parse(localStorage.getItem(LS_KEY)) || {
  start: new Date().toISOString().slice(0,10),
  projects: [],
  months: {},
  days: {}
};

function save(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
function uid(){ return Math.random().toString(36).slice(2); }

const months = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

// ---------- TABS ----------
document.querySelectorAll(".tab-btn").forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-week").classList.toggle("active", btn.dataset.tab==="week");
    document.getElementById("tab-year").classList.toggle("active", btn.dataset.tab==="year");
  };
});

// ---------- PROJECT ADD ----------
document.getElementById("addProjectBtn").onclick = ()=>{
  const inp = document.getElementById("projectInput");
  if(!inp.value.trim()) return;
  const id = uid();
  state.projects.push({id, name: inp.value});
  state.months[id] = 0;
  inp.value = "";
  save(); render();
};

// ---------- YEAR ----------
function renderYear(){
  const grid = document.getElementById("yearGrid");
  grid.innerHTML = "";

  months.forEach((m,idx)=>{
    const box = document.createElement("div");
    box.className = "month";
    box.innerHTML = `<div class="month-head">${m}</div>`;
    const drop = document.createElement("div");
    drop.className = "month-drop";

    drop.ondragover = e=>e.preventDefault();
    drop.ondrop = e=>{
      const id = e.dataTransfer.getData("text/plain");
      if(!id) return;
      delete state.days[id];
      state.months[id] = idx;
      save(); render();
    };

    state.projects.forEach(p=>{
      if(state.months[p.id] === idx){
        const el = document.createElement("div");
        el.className = "year-bar";
        el.textContent = p.name;
        el.setAttribute("draggable","true");
        el.ondragstart = e=>{
          e.dataTransfer.setData("text/plain", p.id);
        };
        drop.appendChild(el);
      }
    });

    box.appendChild(drop);
    grid.appendChild(box);
  });
}

// ---------- WEEK ----------
function renderWeek(){
  const wrap = document.getElementById("weeks");
  wrap.innerHTML = "";
  const start = new Date(state.start);

  for(let i=0;i<14;i++){
    const d = new Date(start);
    d.setDate(d.getDate()+i);
    const iso = d.toISOString().slice(0,10);

    const day = document.createElement("div");
    day.className = "day";
    day.innerHTML = `<b>${iso}</b>`;

    day.ondragover = e=>e.preventDefault();
    day.ondrop = e=>{
      const id = e.dataTransfer.getData("text/plain");
      if(!id) return;
      state.days[id] = iso;
      save(); render();
    };

    Object.entries(state.days).forEach(([pid,date])=>{
      if(date===iso){
        const p = state.projects.find(x=>x.id===pid);
        const el = document.createElement("div");
        el.className = "project-block";
        el.textContent = p.name;
        el.setAttribute("draggable","true");
        el.ondragstart = e=>{
          e.dataTransfer.setData("text/plain", pid);
        };
        day.appendChild(el);
      }
    });

    wrap.appendChild(day);
  }
}

// ---------- TRASH ----------
const trash = document.getElementById("trash");
trash.ondragover = e=>e.preventDefault();
trash.ondrop = e=>{
  const id = e.dataTransfer.getData("text/plain");
  delete state.days[id];
  delete state.months[id];
  save(); render();
};

// ---------- DATE ----------
document.getElementById("btnToday").onclick = ()=>{
  state.start = new Date().toISOString().slice(0,10);
  save(); render();
};

// ---------- RENDER ----------
function render(){
  renderYear();
  renderWeek();
}
render();
