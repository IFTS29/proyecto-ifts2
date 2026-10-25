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
    mongoUri: env.MONGODB_URI || "",
    // En producción y en Vercel (que define VERCEL=1) no se permite trabajar sin MongoDB: ver arranque.js.
    exigeBaseDeDatos: produccion || env.VERCEL === "1",
    bcryptCosto: Number(env.BCRYPT_COSTO) || 10,
    intentosMax: 5,
    bloqueoMs: 15 * 60 * 1000,
    // Formulario de contacto: intentos de envío por visitante en cada ventana de tiempo.
    contactoMax: 10,
    contactoVentanaMs: 15 * 60 * 1000,
    // Vercel define VERCEL=1 en sus servidores; ahí la IP del visitante viene en x-real-ip.
    detrasDeVercel: env.VERCEL === "1",
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
