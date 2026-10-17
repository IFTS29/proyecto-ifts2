import rateLimit from "express-rate-limit";

export const MSJ_BLOQUEO = "Demasiados intentos fallidos. Probá de nuevo en 15 minutos.";

// Se cuenta por correo y no por IP: la IP se puede falsear con el encabezado X-Forwarded-For.
export const claveDeLogin = (req) => String(req.body?.mail || "").trim().toLowerCase() || "sin-correo";

// Limita los intentos fallidos de login. Solo cuentan los que terminan en error (skipSuccessfulRequests)
// y el login correcto borra los fallos anteriores desde la ruta (resetKey).
// La cuenta está en memoria: en un servidor con varias instancias (Vercel) cada una lleva la suya.
export function crearLimitadorLogin({ max = 5, duracionMs = 15 * 60 * 1000 } = {}) {
  return rateLimit({
    windowMs: duracionMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: claveDeLogin,
    handler: (req, res) => res.status(429).json({ error: MSJ_BLOQUEO }),
    // La clave no usa la IP, así que el aviso por X-Forwarded-For no corresponde.
    validate: { xForwardedForHeader: false },
  });
}
