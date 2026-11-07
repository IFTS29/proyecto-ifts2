import { guardarMedioDeInstagram as guardarMedioDeInstagramLocal } from "./local.js";
import { guardarMedioDeInstagramCloudinary } from "./cloudinary.js";

// Si están las credenciales en .env, usa Cloudinary; si no, fallback a local
const usarCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

// Sincronización con Instagram: nombre fijo por archivo (ver cloudinary.js). Las fotos del alta de eventos
// las guarda fotosEventos.js.
export const guardarMedioDeInstagram = usarCloudinary ? guardarMedioDeInstagramCloudinary : guardarMedioDeInstagramLocal;
