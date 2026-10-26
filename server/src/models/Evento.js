import mongoose from "mongoose";

const medioSchema = new mongoose.Schema(
  {
    id: { type: String },
    tipo: { type: String, enum: ["IMAGE", "VIDEO"], default: "IMAGE" },
    url: { type: String, required: true },
    thumbnailUrl: { type: String },
    // Identificador de la foto en Cloudinary (no es secreto): sirve para encontrarla si hay que reemplazarla o borrarla.
    publicId: { type: String },
  },
  { _id: false },
);

const eventoSchema = new mongoose.Schema(
  {
    // 1. Identificación y Origen
    origen: {
      type: String,
      enum: ["manual", "instagram"],
      default: "manual",
      required: true,
      index: true,
    },
    instagramId: {
      type: String,
      unique: true,
      sparse: true, // Permite nulos para eventos creados manualmente sin colisionar
      index: true,
    },
    permalink: {
      type: String,
      default: null,
    },

    // 2. Contenido Editorial (Editable desde el Panel de Administración)
    titulo: {
      type: String,
      required: true,
      trim: true,
    },
    resumen: {
      type: String,
      default: "",
      trim: true,
    },
    descripcion: {
      type: String,
      required: true,
      trim: true,
    },
    captionOriginal: {
      type: String,
      default: null, // Respaldo del texto crudo original si provino de Instagram
    },
    editadoPorAdmin: {
      type: Boolean,
      default: false, // Flag de protección: si es true, la sincronización automática no pisa título ni descripción
    },

    // 3. Fechas
    fechaEvento: {
      type: Date,
      required: true,
      default: Date.now,
    },
    fechaPublicacionOriginal: {
      type: Date,
      default: null,
    },

    // 4. Multimedia (Normalizado para compatibilidad con Cloudinary y almacenamiento local)
    tipoMedio: {
      type: String,
      enum: ["IMAGE", "VIDEO", "CAROUSEL_ALBUM"],
      default: "IMAGE",
    },
    fotoPrincipal: {
      type: String,
      required: true, // Ruta local (/media/instagram/...) o URL de Cloudinary
    },
    videoUrl: {
      type: String,
      default: null,
    },
    videoThumbnail: {
      type: String,
      default: null,
    },
    medios: {
      type: [medioSchema],
      default: [],
    },
    cantidadMedios: {
      type: Number,
      default: 1,
    },

    // 5. Estado y Moderación (Para el flujo de AdminEventos.jsx)
    estado: {
      type: String,
      enum: ["visible", "oculto", "archivado"],
      default: "visible",
      index: true,
    },
    categorias: {
      type: [String],
      default: ["eventos"],
    },
  },
  {
    timestamps: true,
  },
);

export const Evento = mongoose.models.Evento || mongoose.model("Evento", eventoSchema);
