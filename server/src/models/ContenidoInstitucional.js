import mongoose from "mongoose";
import { SECCIONES } from "../services/contenido.js";

// Una sección del contenido institucional (perfil, personas o contacto). Los datos se validan en
// services/contenido.js antes de guardarlos; acá se guardan tal cual.
const contenidoSchema = new mongoose.Schema(
  {
    clave: { type: String, required: true, unique: true, enum: SECCIONES },
    datos: { type: mongoose.Schema.Types.Mixed, required: true },
    actualizadoEn: { type: Date, required: true },
    actualizadoPor: { type: String, default: "" }, // nombre de quien guardó, tomado de la sesión
  },
  { collection: "contenidoinstitucional", minimize: false },
);

export const ContenidoInstitucional =
  mongoose.models.ContenidoInstitucional || mongoose.model("ContenidoInstitucional", contenidoSchema);
