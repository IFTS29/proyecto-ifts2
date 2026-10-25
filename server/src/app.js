import express from "express";
import cors from "cors";
import helmet from "helmet";
import { leerConfig } from "./config.js";
import { crearLimitadorLogin } from "./services/limitador.js";
import { crearRepoUsuariosMemoria } from "./repos/usuarios.memoria.js";
import { crearRepoEventosMemoria } from "./repos/eventos.memoria.js";
import { crearRutasAuth } from "./routes/auth.js";
import { crearRutasUsuarios } from "./routes/usuarios.js";
import { crearRutasContacto } from "./routes/contacto.js";
import { crearRutasEventos } from "./routes/eventos.js";
import { crearServicioCorreo } from "./services/correo.smtp.js";
import { crearLimitadorContacto } from "./services/limitador.contacto.js";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { crearRutasInstagram } from "./routes/instagram.js";
import { crearRepoFeedInstagram } from "./services/instagram/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INLINE_PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <defs>
    <linearGradient id="bgG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#002d54"/><stop offset="50%" stop-color="#004b87"/><stop offset="100%" stop-color="#0f172a"/></linearGradient>
    <linearGradient id="bdG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/></linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#bgG)"/>
  <g transform="translate(400, 180)">
    <rect x="-45" y="-45" width="90" height="90" rx="20" fill="url(#bdG)"/>
    <path d="M-22,-6 L-15,-16 L15,-16 L22,-6 L26,-6 C29,-6 32,-3 32,1 L32,18 C32,22 29,25 26,25 L-26,25 C-29,25 -32,22 -32,18 L-32,1 C-32,-3 -29,-6 -26,-6 Z" fill="#002d54"/>
    <circle cx="0" cy="9" r="10" fill="none" stroke="#f59e0b" stroke-width="3.5"/>
    <circle cx="0" cy="9" r="4" fill="#f59e0b"/>
  </g>
  <text x="400" y="295" fill="#f59e0b" font-family="-apple-system, sans-serif" font-size="14" font-weight="800" letter-spacing="2" text-anchor="middle">GOBIERNO DE LA CIUDAD DE BUENOS AIRES</text>
  <text x="400" y="335" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="26" font-weight="900" text-anchor="middle">IFTS N.° 2</text>
  <text x="400" y="365" fill="#93c5fd" font-family="-apple-system, sans-serif" font-size="16" font-weight="500" text-anchor="middle">Tecnicatura Superior en Emprendimientos Gastronómicos</text>
  <rect x="270" y="395" width="260" height="30" rx="15" fill="rgba(255, 255, 255, 0.1)"/>
  <text x="400" y="415" fill="#cbd5e1" font-family="-apple-system, sans-serif" font-size="12" font-weight="600" text-anchor="middle">PUBLICACIÓN INSTITUCIONAL</text>
</svg>`;

// Las dependencias se reciben por parámetro: en producción son las de MongoDB,
// en desarrollo y en las pruebas pueden ser las de memoria.
export function crearApp({
  config = leerConfig(),
  usuarios = crearRepoUsuariosMemoria(),
  eventos = crearRepoEventosMemoria(),
  limitadorLogin = crearLimitadorLogin({ max: config.intentosMax, duracionMs: config.bloqueoMs }),
  correo = crearServicioCorreo(config),
  limitadorContacto = crearLimitadorContacto({
    max: config.contactoMax,
    duracionMs: config.contactoVentanaMs,
    detrasDeVercel: config.detrasDeVercel,
  }),
  repoFeedInstagram = crearRepoFeedInstagram(),
  mediaService,
} = {}) {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "15mb" }));

  // Ruta estática multimedia con fallback para Instagram (sirve desde storage o inline SVG)
  const mediaStorageDir = path.resolve(__dirname, "../storage/instagram/media");
  const placeholderPath = path.join(mediaStorageDir, "placeholder.svg");

  app.use("/media/instagram", (req, res) => {
    const safeFilename = path.basename(req.path);
    const targetFile = path.join(mediaStorageDir, safeFilename);

    if (safeFilename && fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()) {
      return res.sendFile(targetFile);
    }

    if (fs.existsSync(placeholderPath)) {
      return res.type("image/svg+xml").sendFile(placeholderPath);
    }

    return res.type("image/svg+xml").send(INLINE_PLACEHOLDER_SVG);
  });

  app.get("/api/salud", (req, res) => {
    res.json({ estado: "ok" });
  });

  app.use("/api/auth", crearRutasAuth({ config, usuarios, limitadorLogin }));
  app.use("/api/users", crearRutasUsuarios({ config, usuarios }));
  app.use("/api/contact", crearRutasContacto({ correo, limitadorContacto }));
  app.use("/api/events", crearRutasEventos({ config, usuarios, eventos }));

  // Faltan montar: /api/academic, /api/content
  app.use(
    "/api/instagram",
    crearRutasInstagram({ config, usuarios, repoFeed: repoFeedInstagram, mediaService }),
  );

  app.use("/api", (req, res) => {
    res.status(404).json({ error: "Ruta no encontrada" });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
      return res.status(400).json({ error: "El cuerpo de la petición no es JSON válido." });
    }
    if (err.type === "entity.too.large") {
      return res.status(413).json({ error: "Las fotos o el contenido exceden el tamaño máximo permitido (15MB)." });
    }
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  });

  return app;
}
