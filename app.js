// =============================
// PLANTAFEL – STABILER KERN
// =============================

document.addEventListener("DOMContentLoaded", () => {

  // ---------- ELEMENTE ----------
  const projectInput = document.getElementById("projectInput");
  const addProjectBtn = document.getElementById("addProjectBtn");
  const yearGrid = document.getElementById("yearGrid");
  const trash = document.getElementById("trash");

  if (!projectInput || !addProjectBtn || !yearGrid || !trash) {
    console.error("Pflicht-Element fehlt – Abbruch");
    return;
  }

  // ---------- MONATE ----------
  const MONTHS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

  // ---------- STATE ----------
  let projects = [];

  // ---------- INIT ----------
  renderMonths();

  // ---------- EVENTS ----------
  addProjectBtn.onclick = () => {
    const name = projectInput.value.trim();
    if (!name) return;

    projects.push({ id: crypto.randomUUID(), name });
    projectInput.value = "";
    renderProjects();
  };

  trash.addEventListener("dragover", e => e.preventDefault());
  trash.addEventListener("drop", e => {
    const id = e.dataTransfer.getData("text");
    projects = projects.filter(p => p.id !== id);
    renderProjects();
  });

  // ---------- FUNKTIONEN ----------
  function renderMonths() {
    yearGrid.innerHTML = "";
    MONTHS.forEach(month => {
      const box = document.createElement("div");
      box.className = "month";
      box.innerHTML = `
        <div class="month-head">${month}</div>
        <div class="month-drop"></div>
      `;
      yearGrid.appendChild(box);
    });
  }

  function renderProjects() {
    document.querySelectorAll(".month-drop").forEach(drop => drop.innerHTML = "");

    projects.forEach(project => {
      const el = document.createElement("div");
      el.className = "year-bar";
      el.textContent = project.name;
      el.draggable = true;

      el.addEventListener("dragstart", e => {
        e.dataTransfer.setData("text", project.id);
      });

      document.querySelector(".month-drop").appendChild(el);
    });
  }

});
