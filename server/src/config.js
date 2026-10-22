// Lee la configuración desde las variables de entorno (ver .env.example).
export function leerConfig(env = process.env) {
  const produccion = env.NODE_ENV === "production";
  const jwtSecret = env.JWT_SECRET || "clave-solo-para-desarrollo";

  return {
    produccion,
    jwtSecret,
    jwtDuracion: env.JWT_DURACION || "8h",
    clientUrl: env.CLIENT_URL || "http://localhost:5173",
    mongoUri: env.MONGODB_URI || "",
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
    // Primer administrador: solo se crea si la base está vacía y están cargadas las variables SEED_ADMIN_*.
    // No hay valores por defecto para el correo ni la contraseña, así no quedan credenciales en el código.
    seedNombre: env.SEED_ADMIN_NOMBRE || "Administrador",
    seedMail: env.SEED_ADMIN_MAIL || "",
    seedPassword: env.SEED_ADMIN_PASSWORD || "",
  };
}
