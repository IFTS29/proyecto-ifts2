import mongoose from "mongoose";
import { TURNOS } from "../services/academica.js";
import { franjaSchema } from "./Horario.js";

// Copia de una materia en el momento de publicar. "horarioId" es el id del horario de trabajo:
// sirve para comparar y mostrar qué cambió desde la última publicación.
const horarioPublicadoSchema = new mongoose.Schema(
  {
    horarioId: { type: String, required: true },
    anioCarrera: { type: Number, required: true },
    turno: { type: String, enum: TURNOS, required: true },
    materia: { type: String, required: true },
    profesor: { type: String, default: "" },
    aula: { type: String, default: "" },
    dias: { type: [franjaSchema], default: [] },
  },
  { _id: false },
);

// Lo que ven los alumnos: un documento por período.
// Publicar o actualizar reemplaza este documento en una sola escritura, así nunca se ve una mezcla
// de la versión anterior y la nueva. Retirar pone publicado en false y conserva la copia.
const publicacionSchema = new mongoose.Schema(
  {
    cicloLectivo: { type: Number, required: true },
    cuatrimestre: { type: Number, required: true },
    publicado: { type: Boolean, required: true },
    publicadoEn: { type: Date, required: true },
    horarios: { type: [horarioPublicadoSchema], default: [] },
  },
  { timestamps: true },
);

publicacionSchema.index({ cicloLectivo: 1, cuatrimestre: 1 }, { unique: true });

export const PublicacionHorarios =
  mongoose.models.PublicacionHorarios ||
  mongoose.model("PublicacionHorarios", publicacionSchema, "publicaciones_horarios");