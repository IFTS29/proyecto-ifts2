import { conectarDB } from "./db.js";
import { crearRepoUsuariosMemoria } from "./repos/usuarios.memoria.js";
import { crearRepoUsuariosMongo } from "./repos/usuarios.mongo.js";
import { crearRepoEventosMemoria } from "./repos/eventos.memoria.js";
import { crearRepoEventosMongo } from "./repos/eventos.mongo.js";
import { crearRepoAcademicoMemoria } from "./repos/academica.memoria.js";
import { crearRepoAcademicoMongo } from "./repos/academica.mongo.js";
import { crearRepoPublicacionesMemoria } from "./repos/publicaciones.memoria.js";
import { crearRepoPublicacionesMongo } from "./repos/publicaciones.mongo.js";
import { Horario } from "./models/Horario.js";
import { asegurarAdminInicial } from "./services/seed.js";

// Inicializa los repositorios según el entorno.
// En producción exige MongoDB; en desarrollo permite trabajar en memoria.
export async function prepararDatos(config, { conectar = conectarDB } = {}) {
  const repos = await elegirRepositorios(config, conectar);
  const { usuarios } = repos;

  try {
    if (await asegurarAdminInicial({ usuarios, config })) {
      console.log(`Se creó el administrador inicial (${config.seedMail}).`);
    }
  } catch (err) {
    console.warn("No se pudo crear el administrador inicial:", err.message);
  }

  return repos;
}

// Todos los repositorios salen de la misma fuente: o todos en MongoDB o todos en memoria.
const reposEnMemoria = () => ({
  usuarios: crearRepoUsuariosMemoria(),
  eventos: crearRepoEventosMemoria(),
  horarios: crearRepoAcademicoMemoria(),
  publicacionesHorarios: crearRepoPublicacionesMemoria(),
});

const reposEnMongo = () => ({
  usuarios: crearRepoUsuariosMongo(),
  eventos: crearRepoEventosMongo(),
  horarios: crearRepoAcademicoMongo(Horario),
  publicacionesHorarios: crearRepoPublicacionesMongo(),
});

async function elegirRepositorios(config, conectar) {
  if (!config.mongoUri) {
    if (config.exigeBaseDeDatos) {
      throw new Error("Falta MONGODB_URI: en producción los datos tienen que guardarse en MongoDB.");
    }
    console.warn("Sin MONGODB_URI: modo memoria. Los datos se pierden al reiniciar el servidor.");
    return reposEnMemoria();
  }

  try {
    await conectar(config.mongoUri);
    console.log("Conectado a MongoDB");
    return reposEnMongo();
  } catch (err) {
    if (config.exigeBaseDeDatos) {
      throw new Error(`No se pudo conectar con MongoDB: ${err.message}`);
    }
    console.warn(`MongoDB no conectado (${err.message}). Modo memoria: los datos se pierden al reiniciar.`);
    return reposEnMemoria();
  }
}