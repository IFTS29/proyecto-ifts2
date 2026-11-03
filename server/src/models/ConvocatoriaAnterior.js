import mongoose from "mongoose";

// Historial de convocatorias de ingreso (#35, PR B). Una copia completa por convocatoria («2.º cuatrimestre 2026»),
// guardada cuando el panel pasa a otra o la quita. Solo de consulta: no se edita, no se restaura ni se borra.
const convocatoriaAnteriorSchema = new mongoose.Schema(
  {
    convocatoria: { type: String, required: true, unique: true },
    // Copia de lo que tenía la sección «ingreso» en ese momento: preinscripción, etapas, enlaces, video y correo.
    datos: { type: mongoose.Schema.Types.Mixed, required: true },
    guardadaEn: { type: Date, required: true },
  },
  { collection: "convocatoriasanteriores", minimize: false },
);

export const ConvocatoriaAnterior =
  mongoose.models.ConvocatoriaAnterior || mongoose.model("ConvocatoriaAnterior", convocatoriaAnteriorSchema);
