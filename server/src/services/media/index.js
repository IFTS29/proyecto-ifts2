import { guardarMedio as guardarMedioLocal, mediaAdapter as localMediaAdapter } from "./local.js";

// Exportación unificada de adaptadores multimedia.
// Permite alternar o incorporar nuevos adaptadores (ej: Cloudinary) sin modificar el módulo de Instagram.
export { guardarMedioLocal, localMediaAdapter };

export const guardarMedio = guardarMedioLocal;
export const mediaAdapter = localMediaAdapter;
