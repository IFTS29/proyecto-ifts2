import { crearApp } from "../server/src/app.js";
import { leerConfig } from "../server/src/config.js";
import { conectarDB } from "../server/src/db.js";
import { crearRepoUsuariosMemoria } from "../server/src/repos/usuarios.memoria.js";
import { crearRepoUsuariosMongo } from "../server/src/repos/usuarios.mongo.js";
import { crearRepoEventosMemoria } from "../server/src/repos/eventos.memoria.js";
import { crearRepoEventosMongo } from "../server/src/repos/eventos.mongo.js";
import { asegurarAdminInicial } from "../server/src/services/seed.js";

let app = null;
let conectadoMongo = false;

async function obtenerApp() {
  const config = leerConfig();

  if (config.mongoUri && !conectadoMongo) {
    try {
      await conectarDB();
      console.log("Conectado a MongoDB");
      conectadoMongo = true;
      const usuarios = crearRepoUsuariosMongo();
      const eventos = crearRepoEventosMongo();
      try {
        await asegurarAdminInicial({ usuarios, config });
      } catch (err) {
        console.warn("Error asegurando admin en MongoDB:", err.message);
      }
      app = crearApp({ config, usuarios, eventos });
      return app;
    } catch (err) {
      console.warn("MongoDB no conectado, usando modo memoria:", err.message);
      if (!app) {
        const usuarios = crearRepoUsuariosMemoria();
        const eventos = crearRepoEventosMemoria();
        try {
          await asegurarAdminInicial({ usuarios, config });
        } catch (e) {
          console.warn("Error asegurando admin en memoria:", e.message);
        }
        app = crearApp({ config, usuarios, eventos });
      }
      return app;
    }
  }

  if (app) return app;

  const usuarios = crearRepoUsuariosMemoria();
  const eventos = crearRepoEventosMemoria();
  try {
    await asegurarAdminInicial({ usuarios, config });
  } catch (err) {
    console.warn("Error asegurando admin:", err.message);
  }
  app = crearApp({ config, usuarios, eventos });
  return app;
}

export default async function handler(req, res) {
  // En Vercel, normalizamos la URL para que coincida con las rutas de Express (/api/*).
  if (req.url && !req.url.startsWith("/api")) {
    req.url = `/api${req.url}`;
  }

  const app = await obtenerApp();
  return app(req, res);
}
