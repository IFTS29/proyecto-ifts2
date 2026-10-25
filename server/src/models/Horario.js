import mongoose from "mongoose";
import { DIAS, HORA, TURNOS } from "../services/academica.js";

// Un día de cursada con su franja horaria, por ejemplo: lunes de 18:00 a 20:00.
export const franjaSchema = new mongoose.Schema(
  {
    dia: { type: String, enum: DIAS, required: true },
    desde: { type: String, match: HORA, required: true },
    hasta: { type: String, match: HORA, required: true },
  },
  { _id: false },
);

// Datos de trabajo: una materia de un período, tal como la carga Bedelía.
// Guardar acá no cambia lo que ven los alumnos: eso sale de la copia publicada (PublicacionHorarios).
// Las reglas completas, con sus mensajes, están en services/academica.js; esto es un segundo control.
const horarioSchema = new mongoose.Schema(
  {
    cicloLectivo: { type: Number, required: true, min: 2020, max: 2100 },
    cuatrimestre: { type: Number, required: true, min: 1, max: 2 },
    anioCarrera: { type: Number, required: true, min: 1, max: 3 },
    turno: { type: String, enum: TURNOS, required: true },
    materia: { type: String, required: true, trim: true, maxlength: 120 },
    profesor: { type: String, trim: true, maxlength: 120, default: "" }, // vacío: "A designar"
    aula: { type: String, trim: true, maxlength: 40, default: "" },
    dias: { type: [franjaSchema], validate: (dias) => dias.length > 0 },
    // Id del horario del que se reutilizó. Evita duplicar al reutilizar otra vez, aunque se cambie el nombre.
    origenId: { type: String, default: "" },
  },
  { timestamps: true },
);

horarioSchema.index({ cicloLectivo: 1, cuatrimestre: 1 });

export const Horario = mongoose.models.Horario || mongoose.model("Horario", horarioSchema, "horarios");