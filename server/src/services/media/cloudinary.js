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

// ----- Archivos de la sincronización con Instagram -----

// Cada archivo se sube con un nombre fijo armado con los ids de Instagram, en la carpeta ifts2/instagram.
// Con overwrite: false, si el archivo ya existe Cloudinary no lo pisa y responde con el que está guardado:
// así un reintento reutiliza lo que ya se había subido. Se sube el original; la compresión (q_auto, f_auto)
// corresponde al enlace con el que se muestra.
export const opcionesDeSubidaDeInstagram = ({ nombre, tipo }) => ({
  folder: "ifts2/instagram",
  public_id: nombre,
  resource_type: tipo === "VIDEO" ? "video" : "image",
  overwrite: false,
});

// Devuelve { url, publicId } del archivo en Cloudinary, o null si no se pudo subir
// (por ejemplo, un error de conexión o de credenciales).
export async function guardarMedioDeInstagramCloudinary(url, { nombre, tipo }) {
  asegurarConfiguracion();
  try {
    const res = await cloudinary.uploader.upload(url, opcionesDeSubidaDeInstagram({ nombre, tipo }));
    return { url: res.secure_url, publicId: res.public_id };
  } catch (err) {
    console.error(`[Cloudinary] No se pudo subir ${nombre}:`, err.message || err.error?.message);
    return null;
  }
}
