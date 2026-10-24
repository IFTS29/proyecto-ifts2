import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { crearApp } from "./server/src/app.js";
import { leerConfig } from "./server/src/config.js";
import { prepararDatos } from "./server/src/arranque.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = leerConfig();

// En producción, si MongoDB no está disponible, el servidor no arranca (ver server/src/arranque.js).
let usuarios;
try {
  ({ usuarios } = await prepararDatos(config));
} catch (err) {
  console.error(`No se puede iniciar el servidor. ${err.message}`);
  process.exit(1);
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
