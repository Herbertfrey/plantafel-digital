async function loadWeek(kw) {
  const { data, error } = await supabase
    .from("plantafel")
    .select("*")
    .eq("kw", kw)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const board = document.getElementById("board");
  board.innerHTML = "";

  data.forEach(e => {
    const div = document.createElement("div");
    div.className = "board-item";
    div.textContent =
      `${e.wochentag} | ${e.titel} | ${e.baustelle} | ${e.mitarbeiter} | ${e.fahrzeug}`;
    board.appendChild(div);
  });
}
