const state = JSON.parse(localStorage.getItem("plantafel_v1")) || {
  projects: [],
  vehicles: [],
  employees: [],
  year: {},
  weeks: {}
};

function save() {
  localStorage.setItem("plantafel_v1", JSON.stringify(state));
  render();
}

/* ---------- PROJEKTE ---------- */

function addProject() {
  const name = projectInput.value.trim();
  if (!name) return;
  state.projects.push({ id: crypto.randomUUID(), name });
  projectInput.value = "";
  save();
}

/* ---------- FAHRZEUGE ---------- */

function addVehicle() {
  const name = vehicleInput.value.trim();
  if (!name) return;
  state.vehicles.push({ id: crypto.randomUUID(), name });
  vehicleInput.value = "";
  save();
}

/* ---------- MITARBEITER ---------- */

let colorIndex = 0;
const colors = ["c1","c2","c3","c4"];

function addEmployee() {
  const name = employeeInput.value.trim();
  if (!name) return;
  state.employees.push({
    id: crypto.randomUUID(),
    name,
    color: colors[colorIndex++ % colors.length]
  });
  employeeInput.value = "";
  save();
}

/* ---------- RENDER ---------- */

function render() {
  renderPools();
  renderYear();
  renderWeeks();
}

function renderPools() {
  projectPool.innerHTML = "";
  state.projects.forEach(p => {
    const el = document.createElement("div");
    el.className = "magnet project";
    el.textContent = p.name;
    projectPool.appendChild(el);
  });

  vehiclePool.innerHTML = "";
  state.vehicles.forEach(v => {
    const el = document.createElement("div");
    el.className = "magnet vehicle";
    el.textContent = v.name;
    vehiclePool.appendChild(el);
  });

  employeePool.innerHTML = "";
  state.employees.forEach(e => {
    const el = document.createElement("div");
    el.className = `magnet employee ${e.color}`;
    el.textContent = e.name;
    employeePool.appendChild(el);
  });
}

function renderYear() {
  yearGrid.innerHTML = "";
  for (let i = 0; i < 12; i++) {
    const m = document.createElement("div");
    m.className = "month";
    m.textContent = `Monat ${i+1}`;
    yearGrid.appendChild(m);
  }
}

function renderWeeks() {
  weeks.innerHTML = "";
  for (let w = 1; w <= 4; w++) {
    const week = document.createElement("div");
    week.className = "week";
    week.innerHTML = `<strong>KW ${w}</strong>`;
    const days = document.createElement("div");
    days.className = "days";
    ["Mo","Di","Mi","Do","Fr"].forEach(d => {
      const day = document.createElement("div");
      day.className = "day";
      day.textContent = d;
      days.appendChild(day);
    });
    week.appendChild(days);
    weeks.appendChild(week);
  }
}

render();
