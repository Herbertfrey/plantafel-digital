const state = {
  vehicles: [],
  employees: [],
  projects: {}
};

const months = [
  "Jan","Feb","Mär","Apr","Mai","Jun",
  "Jul","Aug","Sep","Okt","Nov","Dez"
];

function uid() {
  return Math.random().toString(36).slice(2);
}

// ---------- ADD ----------
function addVehicle() {
  const v = vehicleInput.value.trim();
  if (!v) return;
  state.vehicles.push({ id: uid(), name: v });
  vehicleInput.value = "";
  render();
}

function addEmployee() {
  const e = employeeInput.value.trim();
  if (!e) return;
  state.employees.push({ id: uid(), name: e });
  employeeInput.value = "";
  render();
}

function addProject() {
  const p = projectInput.value.trim();
  if (!p) return;
  state.projects[uid()] = { name: p, month: null };
  projectInput.value = "";
  render();
}

// ---------- RENDER ----------
function render() {
  vehicles.innerHTML = "";
  employees.innerHTML = "";
  monthsDiv.innerHTML = "";

  state.vehicles.forEach(v =>
    vehicles.appendChild(makeItem(v, "vehicle"))
  );

  state.employees.forEach(e =>
    employees.appendChild(makeItem(e, "employee"))
  );

  months.forEach(m => {
    const div = document.createElement("div");
    div.className = "month";
    div.dataset.month = m;
    div.innerHTML = "<strong>" + m + "</strong>";

    div.ondragover = ev => ev.preventDefault();
    div.ondrop = ev => dropProject(ev, m);

    Object.entries(state.projects).forEach(([id,p])=>{
      if (p.month === m)
        div.appendChild(makeItem({id,name:p.name},"project"));
    });

    monthsDiv.appendChild(div);
  });
}

function makeItem(obj, type) {
  const el = document.createElement("span");
  el.className = "item";
  el.textContent = obj.name;
  el.draggable = true;
  el.dataset.id = obj.id;
  el.dataset.type = type;
  el.ondragstart = ev => {
    ev.dataTransfer.setData("id", obj.id);
    ev.dataTransfer.setData("type", type);
  };
  return el;
}

// ---------- DROP ----------
function dropProject(ev, month) {
  const id = ev.dataTransfer.getData("id");
  if (!state.projects[id]) return;
  state.projects[id].month = month;
  render();
}

function removeItem(ev) {
  const id = ev.dataTransfer.getData("id");
  const type = ev.dataTransfer.getData("type");

  if (type === "project") delete state.projects[id];
  if (type === "vehicle")
    state.vehicles = state.vehicles.filter(v=>v.id!==id);
  if (type === "employee")
    state.employees = state.employees.filter(e=>e.id!==id);

  render();
}

// ---------- INIT ----------
const monthsDiv = document.getElementById("months");
render();
