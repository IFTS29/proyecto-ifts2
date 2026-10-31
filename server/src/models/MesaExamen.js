import mongoose from "mongoose";
import { HORA } from "../services/academica.js";

// Datos de trabajo: una mesa de examen de un llamado, tal como la carga Bedelía.
// Guardar acá no cambia lo que ven los alumnos: eso sale de la copia publicada del llamado.
// Las reglas completas, con sus mensajes, están en services/mesas.js; esto es un segundo control.
const mesaSchema = new mongoose.Schema(
  {
    llamadoId: { type: String, required: true },
    materia: { type: String, required: true, trim: true, maxlength: 120 },
    anioCarrera: { type: Number, required: true, min: 1, max: 3 },
    fecha: { type: String, match: /^(\d{4}-\d{2}-\d{2})?$/, default: "" }, // vacía: "A confirmar"
    hora: { type: String, default: "", validate: (valor) => valor === "" || HORA.test(valor) },
    aula: { type: String, trim: true, maxlength: 40, default: "" },
    tribunal: { type: String, trim: true, maxlength: 200, default: "" }, // mesa examinadora
  },
  { timestamps: true },
);

mesaSchema.index({ llamadoId: 1 });

export const MesaExamen = mongoose.models.MesaExamen || mongoose.model("MesaExamen", mesaSchema, "mesas_examen");
