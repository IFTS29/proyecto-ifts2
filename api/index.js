import { crearApp } from "../server/src/app.js";
import { leerConfig } from "../server/src/config.js";
import { conectarDB } from "../server/src/db.js";
import { crearRepoUsuariosMemoria } from "../server/src/repos/usuarios.memoria.js";
import { crearRepoUsuariosMongo } from "../server/src/repos/usuarios.mongo.js";
import { asegurarAdminInicial } from "../server/src/services/seed.js";

let appPromise = null;

async function obtenerApp() {
  if (appPromise) return appPromise;

  appPromise = (async () => {
    const config = leerConfig();
    let usuarios;

    if (config.mongoUri) {
      try {
        await conectarDB();
        console.log("Conectado a MongoDB");
        usuarios = crearRepoUsuariosMongo();
      } catch (err) {
        console.warn("MongoDB no conectado, usando modo memoria:", err.message);
        usuarios = crearRepoUsuariosMemoria();
      }
    } else {
      console.warn("Sin MONGODB_URI: modo memoria. Los datos se pierden al reiniciar.");
      usuarios = crearRepoUsuariosMemoria();
    }

    try {
      await asegurarAdminInicial({ usuarios, config });
    } catch (err) {
      console.warn("Error asegurando admin:", err.message);
    }

    return crearApp({ config, usuarios });
  })();

  return appPromise;
}

export default async function handler(req, res) {
  // En Vercel, normalizamos la URL para que coincida con las rutas de Express (/api/*).
  if (req.url && !req.url.startsWith("/api")) {
    req.url = `/api${req.url}`;
  }

  const app = await obtenerApp();
  return app(req, res);
}
