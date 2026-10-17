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
    // Primer administrador. Si no se especifican en Vercel, toma los valores por defecto.
    seedNombre: env.SEED_ADMIN_NOMBRE || "Matías Peláez",
    seedMail: env.SEED_ADMIN_MAIL || "matias.pelaez@ifts2.edu.ar",
    seedPassword: env.SEED_ADMIN_PASSWORD || "Cambiar1234",
  };
}
