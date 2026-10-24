import { conectarDB } from "./db.js";
import { crearRepoUsuariosMemoria } from "./repos/usuarios.memoria.js";
import { crearRepoUsuariosMongo } from "./repos/usuarios.mongo.js";
import { asegurarAdminInicial } from "./services/seed.js";

// Inicializa los repositorios según el entorno.
// En producción exige MongoDB; en desarrollo permite trabajar en memoria.
export async function prepararDatos(config, { conectar = conectarDB } = {}) {
  const usuarios = await elegirRepositorios(config, conectar);

  try {
    if (await asegurarAdminInicial({ usuarios, config })) {
      console.log(`Se creó el administrador inicial (${config.seedMail}).`);
    }
  } catch (err) {
    console.warn("No se pudo crear el administrador inicial:", err.message);
  }

  return { usuarios };
}

async function elegirRepositorios(config, conectar) {
  if (!config.mongoUri) {
    if (config.exigeBaseDeDatos) {
      throw new Error("Falta MONGODB_URI: en producción los datos tienen que guardarse en MongoDB.");
    }
    console.warn("Sin MONGODB_URI: modo memoria. Los datos se pierden al reiniciar el servidor.");
    return crearRepoUsuariosMemoria();
  }

  try {
    await conectar();
    console.log("Conectado a MongoDB");
    return crearRepoUsuariosMongo();
  } catch (err) {
    if (config.exigeBaseDeDatos) {
      throw new Error(`No se pudo conectar con MongoDB: ${err.message}`);
    }
    console.warn(`MongoDB no conectado (${err.message}). Modo memoria: los datos se pierden al reiniciar.`);
    return crearRepoUsuariosMemoria();
  }
}