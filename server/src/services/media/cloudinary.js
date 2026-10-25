import { v2 as cloudinary } from "cloudinary";

let configurado = false;

function asegurarConfiguracion() {
  if (!configurado) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configurado = true;
  }
}

/**
 * Sube una imagen o video a Cloudinary (recibe URL remota, buffer o ruta local)
 * @param {string|{url?: string, buffer?: Buffer, filename: string}} params
 * @param {string} [nombreArchivo]
 * @returns {Promise<string|null>} URL segura https://res.cloudinary.com/...
 */
export async function guardarMedioCloudinary(params, nombreArchivo) {
  asegurarConfiguracion();
  const source = typeof params === "string" ? params : params.url || params.buffer;
  if (!source) return null;

  try {
    const res = await cloudinary.uploader.upload(source, {
      folder: "ifts29/events",
      resource_type: "auto", // detecta automáticamente imagen o video MP4
      quality: "auto",       // compresión inteligente para web
      fetch_format: "auto",  // formato moderno (WebP / AVIF)
    });
    return res.secure_url;
  } catch (err) {
    console.error("[Cloudinary] Error al subir medio:", err.message);
    return null;
  }
}