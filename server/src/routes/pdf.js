// Ayudas para las rutas que devuelven PDF (horarios y mesas de examen).

// "Turno mañana" → "turno-manana", "Febrero 2027" → "febrero-2027": para el nombre del archivo.
export const paraArchivo = (valor) =>
  valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function enviarPdf(res, contenido, nombre) {
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${nombre}.pdf"`,
  });
  res.send(contenido);
}
