const state = {
  vehicles: [],
  employees: [],
  projects: []
};

const months = [
  "Jan","Feb","Mär","Apr",
  "Mai","Jun","Jul","Aug",
  "Sep","Okt","Nov","Dez"
];

const vehiclesDiv = document.getElementById("vehicles");
const employeesDiv = document.getElementById("employees");
const monthsDiv = document.getElementById("months");
const trash = document.getElementById("trash");

/* ---------- HELPERS ---------- */
function uid() {
  return Math.random().toString(36).slice(2);
}

function makeMagnet(text, type, id) {
  const el = document.createElement("span");
  el.className = "magnet";
  el.textContent = text;
  el.draggable = true;
  el.ondragstart = e => {
    e.dataTransfer.setData("type", type);
    e.dataTransfer.setData("id", id);
  };
  return el;
}

/* ---------- ADD ---------- */
document.getElementById("addVehicle").onclick = () => {
  const v = vehicleInput.value.trim();
  if (!v) return;
  state.vehicles.push({id:uid(), name:v});
  vehicleInput.value="";
  render();
};

document.getElementById("addEmployee").onclick = () => {
  const e = employeeInput.value.trim();
  if (!e) return;
  state.employees.push({id:uid(), name:e});
  employeeInput.value="";
  render();
};

document.getElementById("addProject").onclick = () => {
  const p = projectInput.value.trim();
  if (!p) return;
  state.projects.push({id:uid(), name:p, month:null});
  projectInput.value="";
  render();
};

/* ---------- RENDER ---------- */
function render() {
  vehiclesDiv.innerHTML="";
  employeesDiv.innerHTML="";
  monthsDiv.innerHTML="";

  state.vehicles.forEach(v =>
    vehiclesDiv.appendChild(makeMagnet(v.name,"vehicle",v.id))
  );
  state.employees.forEach(e =>
    employeesDiv.appendChild(makeMagnet(e.name,"employee",e.id))
  );

  months.forEach((m,i)=>{
    const box = document.createElement("div");
    box.className="month";
    box.innerHTML = `<b>${m}</b>`;
    box.ondragover = e=>e.preventDefault();
    box.ondrop = e=>{
      const type = e.dataTransfer.getData("type");
      const id = e.dataTransfer.getData("id");
      if (type==="project") {
        const p = state.projects.find(x=>x.id===id);
        if (p) p.month=i;
        render();
      }
    };

    state.projects
      .filter(p=>p.month===i)
      .forEach(p=>box.appendChild(makeMagnet(p.name,"project",p.id)));

    monthsDiv.appendChild(box);
  });
}

/* ---------- DELETE ---------- */
trash.ondragover = e=>e.preventDefault();
trash.ondrop = e=>{
  const type = e.dataTransfer.getData("type");
  const id = e.dataTransfer.getData("id");
  state[type+"s"] = state[type+"s"].filter(x=>x.id!==id);
  render();
};

render();
