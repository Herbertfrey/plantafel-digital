window.createEintrag = async function (data) {
  const { error } = await supabase
    .from("plantafel")
    .insert([data]);

  if (error) {
    console.error("Supabase Fehler:", error);
    throw error;
  }
};
