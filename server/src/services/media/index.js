// import { guardarMedio as guardarMedioLocal, mediaAdapter as localMediaAdapter } from "./local.js";

// // Exportación unificada de adaptadores multimedia.
// // Permite alternar o incorporar nuevos adaptadores (ej: Cloudinary) sin modificar el módulo de Instagram.
// export { guardarMedioLocal, localMediaAdapter };

// export const guardarMedio = guardarMedioLocal;
// export const mediaAdapter = localMediaAdapter;


import { guardarMedio as guardarMedioLocal } from "./local.js";
import { guardarMedioCloudinary } from "./cloudinary.js";

// Si están las credenciales en .env, usa Cloudinary; si no, fallback a local
const usarCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

export const guardarMedio = usarCloudinary ? guardarMedioCloudinary : guardarMedioLocal;