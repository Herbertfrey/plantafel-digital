const state = {


const e=document.getElementById('employees'); e.innerHTML='';
state.employees.forEach(x=>{
const s=document.createElement('span');
s.className='magnet employee'; s.textContent=x.name;
s.draggable=true;
s.ondragstart=e=>e.dataTransfer.setData('employee',x.id);
e.appendChild(s);
});
}


function renderWeeks(){
const w=document.getElementById('weeks'); w.innerHTML='';
for(let d=0;d<20;d++){
const day=`Tag ${d+1}`;
const div=document.createElement('div');
div.className='day';
div.ondragover=e=>e.preventDefault();
div.ondrop=e=>{
const pid=e.dataTransfer.getData('project');
if(!pid) return;
state.assignments[day]=state.assignments[day]||[];
state.assignments[day].push(pid);
render();
};
div.innerHTML=`<h4>${day}</h4>`;
(state.assignments[day]||[]).forEach(pid=>{
const p=state.projects.find(x=>x.id===pid);
if(!p) return;
const el=document.createElement('div');
el.className='project'; el.textContent=p.name;
el.draggable=true;
el.ondragstart=e=>e.dataTransfer.setData('remove',JSON.stringify({day,pid}));
div.appendChild(el);
});
w.appendChild(div);
}
}


function renderMonths(){
const m=document.getElementById('months'); m.innerHTML='';
['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'].forEach(mon=>{
const div=document.createElement('div');
div.className='month';
div.ondragover=e=>e.preventDefault();
div.ondrop=e=>{
const pid=e.dataTransfer.getData('project');
if(!pid) return;
};
div.innerHTML=`<h4>${mon}</h4>`;
state.projects.forEach(p=>{
const el=document.createElement('div');
el.className='project'; el.textContent=p.name;
el.draggable=true;
el.ondragstart=e=>e.dataTransfer.setData('project',p.id);
div.appendChild(el);
});
m.appendChild(div);
});
}


// ---------- Trash ----------
document.getElementById('trash').ondragover=e=>e.preventDefault();
document.getElementById('trash').ondrop=e=>{
const data=e.dataTransfer.getData('remove');
if(!data) return;
const {day,pid}=JSON.parse(data);
state.assignments[day]=state.assignments[day].filter(x=>x!==pid);
render();
};


render();
