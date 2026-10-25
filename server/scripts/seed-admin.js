import "dotenv/config";
import mongoose from "mongoose";
import { leerConfig } from "../src/config.js";
import { conectarDB } from "../src/db.js";
import { crearRepoUsuariosMongo } from "../src/repos/usuarios.mongo.js";
import { hashear } from "../src/services/passwords.js";

async function ejecutarSeedAdmin() {
  const config = leerConfig();
  const mail = (config.seedMail || "admin@ifts2.edu.ar").toLowerCase();
  const password = config.seedPassword || "Admin1234!";
  const nombre = config.seedNombre || "Administrador IFTS2";

  if (!config.mongoUri) {
    console.warn("⚠️  Aviso: No hay MONGODB_URI configurada. Para persistir usuarios en la base de datos local, definí MONGODB_URI en .env.");
    return;
  }

  try {
    await conectarDB();
    const usuariosRepo = crearRepoUsuariosMongo();
    const existente = await usuariosRepo.buscarPorMail(mail);

    if (existente) {
      console.log(`ℹ️  El usuario administrador con correo '${mail}' ya existe en la base de datos.`);
    } else {
      const passwordHash = await hashear(password, config.bcryptCosto);
      await usuariosRepo.crear({
        nombre,
        mail,
        rol: "admin",
        passwordHash,
      });
      console.log(`✅ Usuario administrador creado exitosamente:\n   Correo: ${mail}\n   Contraseña: ${password}\n   Rol: admin`);
    }
  } catch (err) {
    console.error("❌ Error al ejecutar el seed del usuario administrador:", err.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

ejecutarSeedAdmin();
