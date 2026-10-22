import { isIP } from "node:net";
import rateLimit from "express-rate-limit";

export const MSJ_LIMITE_CONTACTO =
  "Enviaste varias consultas seguidas. Probá de nuevo en unos minutos.";

// Normaliza la IP para usarla como clave del límite:
// - IPv4 (también escrita como IPv6, por ejemplo ::ffff:192.168.1.1 o ::ffff:c0a8:101) → "192.168.1.1".
// - IPv6 → su red /64 (los primeros 4 bloques), porque un mismo visitante suele tener muchas
//   direcciones dentro de esa red.
// Una dirección inválida se devuelve tal cual: igual sirve como clave y no rompe el límite.
export function normalizarIp(ip) {
  const texto = String(ip).trim().toLowerCase().split("%")[0]; // sin el "%zona" de algunas IPv6
  if (isIP(texto) === 4) return texto;
  if (isIP(texto) !== 6) return texto;

  const bloques = expandirIPv6(texto);
  const esIPv4Mapeada =
    bloques.slice(0, 5).every((b) => b === 0) && bloques[5] === 0xffff;
  if (esIPv4Mapeada) {
    return [
      bloques[6] >> 8,
      bloques[6] & 255,
      bloques[7] >> 8,
      bloques[7] & 255,
    ].join(".");
  }
  return (
    bloques
      .slice(0, 4)
      .map((b) => b.toString(16))
      .join(":") + "::/64"
  );
}

// Pasa una IPv6 válida a sus 8 bloques numéricos (resuelve "::" y una IPv4 al final).
function expandirIPv6(ip) {
  let texto = ip;
  const ipv4Final = texto.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (ipv4Final) {
    const [a, b, c, d] = ipv4Final[1].split(".").map(Number);
    texto =
      texto.slice(0, -ipv4Final[1].length) +
      ((a << 8) | b).toString(16) +
      ":" +
      ((c << 8) | d).toString(16);
  }
  const [inicio, fin] = texto.split("::");
  const izquierda = inicio ? inicio.split(":") : [];
  const derecha = fin ? fin.split(":") : [];
  const ceros =
    fin === undefined
      ? []
      : Array(8 - izquierda.length - derecha.length).fill("0");
  return [...izquierda, ...ceros, ...derecha].map((b) => parseInt(b, 16));
}

// Clave para contar los envíos de cada visitante.
// En Vercel se usa x-real-ip: lo completa Vercel y lo sobrescribe, así que el visitante no puede falsearlo.
// Fuera de Vercel se usa la dirección de la conexión, sin leer encabezados que el visitante podría inventar.
export function claveDeContacto(req, { detrasDeVercel = false } = {}) {
  const ipConexion = req.socket?.remoteAddress || "desconocida";
  const ipVercel = req.headers["x-real-ip"];
  const ip =
    detrasDeVercel && typeof ipVercel === "string" && ipVercel
      ? ipVercel
      : ipConexion;
  return normalizarIp(ip);
}

// Limita los intentos de envío por visitante. Cuentan todos, también los rechazados, para que
// nadie pueda mandar solicitudes sin fin; por eso el cupo es amplio (varias personas pueden
// compartir la misma IP, por ejemplo en el Wi-Fi del instituto).
// La cuenta está en memoria: en Vercel cada instancia del servidor lleva la suya, por lo que
// es una protección básica para bajo volumen, no un bloqueo garantizado.
export function crearLimitadorContacto({
  max = 10,
  duracionMs = 15 * 60 * 1000,
  detrasDeVercel = false,
} = {}) {
  return rateLimit({
    windowMs: duracionMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => claveDeContacto(req, { detrasDeVercel }),
    handler: (req, res) => res.status(429).json({ error: MSJ_LIMITE_CONTACTO }),
    // La clave se arma con claveDeContacto, no con req.ip: estas comprobaciones de la librería no aplican.
    validate: { xForwardedForHeader: false, trustProxy: false },
  });
}
