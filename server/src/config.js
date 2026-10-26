// Dirección pública del sitio, para el enlace a Contacto de los PDF. No se arma con los encabezados
// de la petición (Host, X-Forwarded-Proto), porque los manda el navegador y se pueden falsear.
// Orden: SITIO_URL si está cargada; en Vercel, las variables que define Vercel; si no, la de desarrollo.
function direccionDelSitio(env) {
  const configurada = env.SITIO_URL?.trim().replace(/\/+$/, "");
  if (configurada) return configurada;
  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return `http://localhost:${env.PORT || 3000}`;
}

// Indica si el servidor corre en Vercel. No alcanza con VERCEL=1: Vercel solo la define si está activada
// la opción de exponer sus variables de sistema. Por eso se miran también otras variables y la carpeta
// donde corre la función (/var/task en Vercel).
export function correEnVercel(env = process.env, carpeta = process.cwd()) {
  return Boolean(
    env.VERCEL || env.VERCEL_ENV || env.VERCEL_URL || env.AWS_LAMBDA_FUNCTION_NAME || carpeta.startsWith("/var/task"),
  );
}

// Lee la configuración desde las variables de entorno (ver .env.example).
export function leerConfig(env = process.env) {
  const produccion = env.NODE_ENV === "production";
  const jwtSecret = env.JWT_SECRET || "clave-solo-para-desarrollo";

  return {
    produccion,
    jwtSecret,
    jwtDuracion: env.JWT_DURACION || "8h",
    clientUrl: env.CLIENT_URL || "http://localhost:5173",
    sitioUrl: direccionDelSitio(env),
    instagramToken: env.INSTAGRAM_TOKEN || env.INSTAGRAM_ACCESS_TOKEN || "",
    instagramAccountId: env.INSTAGRAM_ACCOUNT_ID || "",
    instagramHashtag: env.INSTAGRAM_HASHTAG || "eventosIFTS2",
    mongoUri: env.MONGODB_URI || "",
    // Cloudinary guarda las fotos de los eventos (ver services/media/fotosEventos.js).
    cloudinaryNombre: env.CLOUDINARY_CLOUD_NAME || "",
    cloudinaryClave: env.CLOUDINARY_API_KEY || "",
    cloudinarySecreto: env.CLOUDINARY_API_SECRET || "",
    // Sin Cloudinary, las fotos se pueden guardar en el disco solo en desarrollo local:
    // en producción y en Vercel ese disco es temporal y las fotos se perderían.
    fotosEnDisco: !produccion && !correEnVercel(env),
    // En producción y en Vercel no se permite trabajar sin MongoDB: ver arranque.js.
    exigeBaseDeDatos: produccion || correEnVercel(env),
    bcryptCosto: Number(env.BCRYPT_COSTO) || 10,
    intentosMax: 5,
    bloqueoMs: 15 * 60 * 1000,
    // Formulario de contacto: intentos de envío por visitante en cada ventana de tiempo.
    contactoMax: 10,
    contactoVentanaMs: 15 * 60 * 1000,
    // En Vercel la IP del visitante viene en x-real-ip (fuera de Vercel ese encabezado no es confiable).
    detrasDeVercel: correEnVercel(env),
    // Casillas que reciben las consultas del formulario (ver el reparto en services/correo.mensaje.js).
    correoBedelia: env.CORREO_BEDELIA || "",
    correoInstitucional: env.CORREO_INSTITUCIONAL || "",
    // Cuenta que envía los correos del formulario (SMTP). Qué pasa si falta, en services/correo.smtp.js.
    smtpHost: env.SMTP_HOST || "smtp.gmail.com",
    smtpPuerto: Number(env.SMTP_PUERTO) || 465,
    smtpUsuario: env.SMTP_USUARIO || "",
    smtpClave: env.SMTP_CLAVE || "",
    // Primer administrador: solo se crea si la base está vacía y están cargadas las variables SEED_ADMIN_*.
    // No hay valores por defecto para el correo ni la contraseña, así no quedan credenciales en el código.
    seedNombre: env.SEED_ADMIN_NOMBRE || "Administrador",
    seedMail: env.SEED_ADMIN_MAIL || "",
    seedPassword: env.SEED_ADMIN_PASSWORD || "",
  };
}
