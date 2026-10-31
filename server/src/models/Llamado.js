import mongoose from "mongoose";

// Copia de una mesa en el momento de publicar. "mesaId" es el id de la mesa de trabajo:
// sirve para comparar y mostrar qué cambió desde la última publicación.
const mesaPublicadaSchema = new mongoose.Schema(
  {
    mesaId: { type: String, required: true },
    materia: { type: String, required: true },
    anioCarrera: { type: Number, required: true },
    fecha: { type: String, default: "" },
    hora: { type: String, default: "" },
    aula: { type: String, default: "" },
    tribunal: { type: String, default: "" },
  },
  { _id: false },
);

// Lo que ven los alumnos. Publicar o actualizar la reemplaza entera, en una sola escritura.
// Retirar pone "publicado" en false y la conserva: si existe, el llamado se publicó alguna vez.
const publicacionSchema = new mongoose.Schema(
  {
    publicado: { type: Boolean, required: true },
    publicadoEn: { type: Date, required: true },
    nombre: { type: String, required: true },
    desde: { type: String, default: "" },
    hasta: { type: String, default: "" },
    aviso: { type: String, default: "" },
    mesas: { type: [mesaPublicadaSchema], default: [] },
  },
  { _id: false },
);

// Un llamado de mesas de examen ("Febrero 2027"): datos de trabajo y copia publicada en el mismo documento.
const llamadoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 60 },
    // Nombre sin mayúsculas ni espacios de más: no puede haber dos "Febrero 2027".
    nombreClave: { type: String, required: true, unique: true },
    desde: { type: String, default: "" }, // AAAA-MM-DD, opcional
    hasta: { type: String, default: "" },
    aviso: { type: String, trim: true, maxlength: 300, default: "" },
    publicacion: { type: publicacionSchema, default: null },
  },
  { timestamps: true },
);

export const Llamado = mongoose.models.Llamado || mongoose.model("Llamado", llamadoSchema, "llamados");
