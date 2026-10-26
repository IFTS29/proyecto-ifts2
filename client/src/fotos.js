// Prepara las fotos del formulario de eventos antes de mandarlas al servidor.
// En el sitio publicado (Vercel) cada pedido puede pesar como máximo 4,5 MB, así que las fotos
// se achican en el navegador. El servidor las guarda en Cloudinary.

export const TIPOS_DE_FOTO = ["image/jpeg", "image/png", "image/webp"];
// Margen bajo los 4,5 MB de Vercel para el pedido completo (fotos, título, descripción y demás datos).
export const LIMITE_DEL_PEDIDO = 4 * 1024 * 1024;

const LADO_MAXIMO = 1600; // píxeles del lado más largo
const CALIDAD_JPEG = 0.8;
const CALIDAD_WEBP = 0.9;
const PESO_SIN_ACHICAR = 500 * 1024; // una foto chica y liviana se manda tal cual

const leerArchivo = (archivo) =>
  new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(lector.result);
    lector.onerror = () => rechazar(lector.error);
    lector.readAsDataURL(archivo);
  });

// Devuelve la foto lista para enviar, como texto "data:image/...". Si no se puede usar, lanza un Error
// con un mensaje para mostrar en el formulario.
export async function prepararFoto(archivo) {
  if (!TIPOS_DE_FOTO.includes(archivo.type)) {
    throw new Error(`«${archivo.name}» no se puede cargar: tiene que ser una imagen JPG, PNG o WebP.`);
  }

  let imagen;
  try {
    imagen = await createImageBitmap(archivo);
  } catch {
    throw new Error(`No se pudo leer la foto «${archivo.name}». Probá con otra o guardala como JPG.`);
  }

  try {
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
    if (escala === 1 && archivo.size <= PESO_SIN_ACHICAR) return await leerArchivo(archivo);

    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d").drawImage(imagen, 0, 0, lienzo.width, lienzo.height);

    // Las fotos (JPG) siguen siendo JPG. Los PNG y WebP suelen ser afiches, capturas o imágenes con
    // fondo transparente: se guardan como WebP, que conserva la transparencia y el texto nítido.
    if (archivo.type === "image/jpeg") return lienzo.toDataURL("image/jpeg", CALIDAD_JPEG);
    const webp = lienzo.toDataURL("image/webp", CALIDAD_WEBP);
    // Si el navegador no sabe generar WebP, devuelve un PNG: se usa ese.
    return webp.startsWith("data:image/webp") ? webp : lienzo.toDataURL("image/png");
  } finally {
    imagen.close?.();
  }
}

// Tamaño real del pedido que se va a mandar, en bytes.
export const pesoDelPedido = (datos) => new Blob([JSON.stringify(datos)]).size;
