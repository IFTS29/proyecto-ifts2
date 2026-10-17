import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { crearApp } from "./server/src/app.js";
import { leerConfig } from "./server/src/config.js";
import { conectarDB } from "./server/src/db.js";
import { crearRepoUsuariosMemoria } from "./server/src/repos/usuarios.memoria.js";
import { crearRepoUsuariosMongo } from "./server/src/repos/usuarios.mongo.js";
import { asegurarAdminInicial } from "./server/src/services/seed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  console.warn("Sin MONGODB_URI: modo memoria. Los datos se pierden al reiniciar el servidor.");
  usuarios = crearRepoUsuariosMemoria();
}

try {
  if (await asegurarAdminInicial({ usuarios, config })) {
    console.log(`Se creó el administrador inicial (${config.seedMail}).`);
  }
} catch (err) {
  console.warn("No se pudo inicializar admin:", err.message);
}

const app = crearApp({ config, usuarios });
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const isProduction = process.env.NODE_ENV === "production";
const clientDistPath = path.resolve(__dirname, "client/dist");

if (isProduction && fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.resolve(clientDistPath, "index.html"));
  });
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      host: HOST,
      port: Number(PORT),
      hmr: false,
    },
    appType: "spa",
    root: path.resolve(__dirname, "client"),
  });
  app.use(vite.middlewares);
}

app.listen(PORT, HOST, () => {
  console.log(`Servidor iniciado en http://${HOST}:${PORT}`);
});
