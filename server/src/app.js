import express from "express";
import cors from "cors";
import helmet from "helmet";
import { leerConfig } from "./config.js";
import { crearLimitadorLogin } from "./services/limitador.js";
import { crearRepoUsuariosMemoria } from "./repos/usuarios.memoria.js";
import { crearRutasAuth } from "./routes/auth.js";
import { crearRutasUsuarios } from "./routes/usuarios.js";
import { crearRutasContacto } from "./routes/contacto.js";
import { crearServicioCorreo } from "./services/correo.smtp.js";
import { crearLimitadorContacto } from "./services/limitador.contacto.js";
import { crearRepoAcademicoMemoria } from "./repos/academica.memoria.js";
import { crearRepoPublicacionesMemoria } from "./repos/publicaciones.memoria.js";
import { crearRutasAcademica } from "./routes/academica.js";

// Las dependencias se reciben por parámetro: en producción son las de MongoDB,
// en desarrollo y en las pruebas pueden ser las de memoria.
export function crearApp({
  config = leerConfig(),
  usuarios = crearRepoUsuariosMemoria(),
  limitadorLogin = crearLimitadorLogin({ max: config.intentosMax, duracionMs: config.bloqueoMs }),
  correo = crearServicioCorreo(config),
  limitadorContacto = crearLimitadorContacto({
    max: config.contactoMax,
    duracionMs: config.contactoVentanaMs,
    detrasDeVercel: config.detrasDeVercel,
  }),
  horarios = crearRepoAcademicoMemoria(),
  publicacionesHorarios = crearRepoPublicacionesMemoria(),
} = {}) {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  app.get("/api/salud", (req, res) => {
    res.json({ estado: "ok" });
  });

  app.use("/api/auth", crearRutasAuth({ config, usuarios, limitadorLogin }));
  app.use("/api/users", crearRutasUsuarios({ config, usuarios }));
  app.use("/api/contact", crearRutasContacto({ correo, limitadorContacto }));
  app.use("/api/academic", crearRutasAcademica({ config, usuarios, horarios, publicacionesHorarios }));

  // Faltan montar: /api/events, /api/content, /api/instagram

  app.use("/api", (req, res) => {
    res.status(404).json({ error: "Ruta no encontrada" });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
      return res.status(400).json({ error: "El cuerpo de la petición no es JSON válido." });
    }
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  });

  return app;
}
