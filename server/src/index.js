import "dotenv/config";
import { crearApp } from "./app.js";
import { leerConfig } from "./config.js";
import { conectarDB } from "./db.js";
import { crearRepoUsuariosMemoria } from "./repos/usuarios.memoria.js";
import { crearRepoUsuariosMongo } from "./repos/usuarios.mongo.js";
import { crearRepoEventosMemoria } from "./repos/eventos.memoria.js";
import { crearRepoEventosMongo } from "./repos/eventos.mongo.js";
import { asegurarAdminInicial } from "./services/seed.js";

const config = leerConfig();
let usuarios;
let eventos;

if (config.mongoUri) {
  await conectarDB();
  console.log("Conectado a MongoDB");
  usuarios = crearRepoUsuariosMongo();
  eventos = crearRepoEventosMongo();
} else if (config.produccion) {
  throw new Error("Falta MONGODB_URI en producción");
} else {
  console.warn("Sin MONGODB_URI: modo memoria. Los datos se pierden al reiniciar el servidor.");
  usuarios = crearRepoUsuariosMemoria();
  eventos = crearRepoEventosMemoria();
}

if (await asegurarAdminInicial({ usuarios, config })) {
  console.log(`Se creó el administrador inicial (${config.seedMail}).`);
}

const puerto = process.env.PORT || 4000;
crearApp({ config, usuarios, eventos }).listen(puerto, () =>
  console.log(`API escuchando en http://localhost:${puerto}`),
);
