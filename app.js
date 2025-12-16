const KEY="plantafel_real_v1";
const COLORS=["blue","green","orange","purple","teal"];
const MONTHS=["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
const DAYS=["Mo","Di","Mi","Do","Fr"];

const uid=()=>Math.random().toString(36).slice(2);
const iso=d=>d.toISOString().slice(0,10);

function mondayOf(d){
  const x=new Date(d);const day=x.getDay()||7;
  if(day!==1)x.setDate(x.getDate()-(day-1));
  x.setHours(0,0,0,0);return x;
}

let state={
  startMonday:null,
  projects:[],        // {id,name}
  vehicles:[],        // {id,name}
  employees:[],       // {id,name,color}
  assignments:[],     // {id,projectId,date,vehicles:[],employees:[]}
  yearBars:{}         // {month:[projectId]}
};

function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function load(){
  const s=localStorage.getItem(KEY);
  if(s)state={...state,...JSON.parse(s)};
}

load();
if(!state.startMonday)state.startMonday=iso(mondayOf(new Date()));
document.getElementById("startDate").value=state.startMonday;

/* ===== ADD MASTER DATA ===== */
addVehicleBtn.onclick=()=>{
  const v=vehicleInput.value.trim();if(!v)return;
  state.vehicles.push({id:uid(),name:v});
  vehicleInput.value="";save();render();
};
addEmployeeBtn.onclick=()=>{
  const e=employeeInput.value.trim();if(!e)return;
  const c=COLORS[state.employees.length%COLORS.length];
  state.employees.push({id:uid(),name:e,color:c});
  employeeInput.value="";save();render();
};
addProjectBtn.onclick=()=>{
  const p=projectInput.value.trim();if(!p)return;
  const id=uid();
  state.projects.push({id,name:p});
  const m=new Date().getMonth();
  state.yearBars[m]=state.yearBars[m]||[];
  state.yearBars[m].push(id);
  projectInput.value="";save();render();
};

/* ===== DRAG HELPERS ===== */
function drag(e,data){
  e.dataTransfer.setData("text/plain",JSON.stringify(data));
}
function drop(e){
  try{return JSON.parse(e.dataTransfer.getData("text/plain"))}catch{return null}
}

/* ===== RENDER ===== */
function render(){
  renderMasters();
  renderMonths();
  renderWeeks();
}
function renderMasters(){
  vehicleList.innerHTML="";
  employeeList.innerHTML="";
  state.vehicles.forEach(v=>{
    const s=document.createElement("span");
    s.className="magnet vehicle";s.textContent=v.name;
    s.draggable=true;
    s.ondragstart=e=>drag(e,{type:"vehicle",id:v.id});
    vehicleList.appendChild(s);
  });
  state.employees.forEach(e=>{
    const s=document.createElement("span");
    s.className=`magnet employee ${e.color}`;s.textContent=e.name;
    s.draggable=true;
    s.ondragstart=ev=>drag(ev,{type:"employee",id:e.id});
    employeeList.appendChild(s);
  });
}

function renderMonths(){
  months.innerHTML="";
  for(let m=0;m<12;m++){
    const box=document.createElement("div");
    box.className="month";
    box.innerHTML=`<h4>${MONTHS[m]}</h4>`;
    box.ondragover=e=>e.preventDefault();
    box.ondrop=e=>{
      const d=drop(e);if(!d||d.type!=="planned")return;
      state.assignments=state.assignments.filter(a=>a.projectId!==d.projectId);
      state.yearBars[m]=state.yearBars[m]||[];
      state.yearBars[m].push(d.projectId);
      save();render();
    };
    (state.yearBars[m]||[]).forEach(pid=>{
      const p=state.projects.find(x=>x.id===pid);if(!p)return;
      const s=document.createElement("span");
      s.className="magnet";s.textContent=p.name;
      s.draggable=true;
      s.ondragstart=e=>drag(e,{type:"year",projectId:pid});
      box.appendChild(s);
    });
    months.appendChild(box);
  }
}

function renderWeeks(){
  weeks.innerHTML="";
  const start=new Date(state.startMonday);
  for(let w=0;w<4;w++){
    const ws=new Date(start);ws.setDate(ws.getDate()+w*7);
    const week=document.createElement("div");
    week.className="week";
    week.innerHTML=`<div class="week-title">KW ${w+1}</div>`;
    const days=document.createElement("div");
    days.className="days";

    for(let d=0;d<5;d++){
      const date=new Date(ws);date.setDate(date.getDate()+d);
      const dateISO=iso(date);
      const day=document.createElement("div");
      day.className="day";
      day.innerHTML=`<div class="day-title">${DAYS[d]} · ${dateISO}</div>`;
      const zone=document.createElement("div");
      zone.className="day-drop";
      zone.ondragover=e=>e.preventDefault();
      zone.ondrop=e=>{
        const data=drop(e);
        if(!data)return;

        if(data.type==="year"){
          const len=parseInt(prompt("Wie viele Arbeitstage?","1"),10)||1;
          for(let i=0;i<len;i++){
            const nd=new Date(date);nd.setDate(nd.getDate()+i);
            const nISO=iso(nd);
            state.assignments.push({
              id:uid(),projectId:data.projectId,date:nISO,
              vehicles:[],employees:[]
            });
          }
        }
        if(data.type==="vehicle"){
          const a=state.assignments.find(x=>x.date===dateISO);
          if(a&&!a.vehicles.includes(data.id))a.vehicles.push(data.id);
        }
        if(data.type==="employee"){
          const a=state.assignments.find(x=>x.date===dateISO);
          if(a&&!a.employees.includes(data.id))a.employees.push(data.id);
        }
        save();render();
      };

      state.assignments.filter(a=>a.date===dateISO).forEach(a=>{
        const p=state.projects.find(x=>x.id===a.projectId);
        const b=document.createElement("div");
        b.className="project-block";b.draggable=true;
        b.ondragstart=e=>drag(e,{type:"planned",projectId:a.projectId});
        b.innerHTML=`<b>${p?p.name:"?"}</b>`;
        zone.appendChild(b);
      });

      day.appendChild(zone);
      days.appendChild(day);
    }
    week.appendChild(days);
    weeks.appendChild(week);
  }
}

/* ===== TRASH ===== */
trash.ondragover=e=>e.preventDefault();
trash.ondrop=e=>{
  const d=drop(e);if(!d)return;
  if(d.type==="planned"){
    state.assignments=state.assignments.filter(a=>a.projectId!==d.projectId);
  }
  save();render();
};

render();
