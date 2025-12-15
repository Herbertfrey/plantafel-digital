function renderProjectAssignmentBlock(a){
  const proj = findById(state.projects, a.projectId);

  const block = document.createElement("div");
  block.className = "project-block";
  block.draggable = true;

  // EINZIGER DRAG: Projekt zurück in 12 Monate
  block.addEventListener("dragstart", e=>{
    setDrag(e, { kind: "plannedProject", projectId: a.projectId });
  });

  const title = document.createElement("div");
  title.className = "project-title";
  title.textContent = proj ? proj.name : "(Projekt gelöscht)";
  block.appendChild(title);

  // TAG LÖSCHEN – NUR PER KLICK
  const delBtn = document.createElement("button");
  delBtn.textContent = "✖ Tag löschen";
  delBtn.style.marginBottom = "6px";
  delBtn.style.cursor = "pointer";
  delBtn.addEventListener("click", ()=>{
    if(!confirm("Diesen Tag-Einsatz wirklich löschen?")) return;
    state.assignments = state.assignments.filter(x => x.id !== a.id);
    saveState();
    renderAll();
  });
  block.appendChild(delBtn);

  // FAHRZEUGE
  const vTitle = document.createElement("div");
  vTitle.className = "day-section-title";
  vTitle.textContent = "Fahrzeuge";
  block.appendChild(vTitle);

  const vZone = document.createElement("div");
  vZone.className = "day-dropzone";
  vZone.addEventListener("dragover", e=>e.preventDefault());
  vZone.addEventListener("drop", e=>{
    e.preventDefault();
    const data = getDrag(e);
    if(data && data.kind === "master" && data.type === "vehicle"){
      if(!a.vehicles.includes(data.id)) a.vehicles.push(data.id);
      saveState(); renderAll();
    }
  });

  (a.vehicles || []).forEach(id=>{
    const v = findById(state.vehicles, id);
    if(!v) return;
    const chip = document.createElement("span");
    chip.className = "magnet vehicle";
    chip.textContent = v.name;
    chip.style.cursor = "pointer";
    chip.addEventListener("click", ()=>{
      a.vehicles = a.vehicles.filter(x=>x!==id);
      saveState(); renderAll();
    });
    vZone.appendChild(chip);
  });
  block.appendChild(vZone);

  // MITARBEITER
  const eTitle = document.createElement("div");
  eTitle.className = "day-section-title";
  eTitle.textContent = "Mitarbeiter";
  block.appendChild(eTitle);

  const eZone = document.createElement("div");
  eZone.className = "day-dropzone";
  eZone.addEventListener("dragover", e=>e.preventDefault());
  eZone.addEventListener("drop", e=>{
    e.preventDefault();
    const data = getDrag(e);
    if(!data || data.kind !== "master" || data.type !== "employee") return;

    if(isEmployeeAbsent(data.id, a.dateISO)){
      alert("Mitarbeiter ist an diesem Tag abwesend.");
      return;
    }
    if(employeePlannedElsewhere(data.id, a.dateISO, a.id)){
      alert("Mitarbeiter ist an diesem Tag bereits eingeplant.");
      return;
    }

    if(!a.employees.includes(data.id)) a.employees.push(data.id);
    saveState(); renderAll();
  });

  (a.employees || []).forEach(id=>{
    const emp = findById(state.employees, id);
    if(!emp) return;
    const chip = document.createElement("span");
    chip.className = `magnet employee ${emp.colorClass}`;
    chip.textContent = emp.name;
    chip.style.cursor = "pointer";
    chip.addEventListener("click", ()=>{
      a.employees = a.employees.filter(x=>x!==id);
      saveState(); renderAll();
    });
    eZone.appendChild(chip);
  });
  block.appendChild(eZone);

  return block;
}
