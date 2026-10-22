import { test } from "node:test";
import assert from "node:assert/strict";
import { leerConfig } from "../src/config.js";
import { crearRepoUsuariosMemoria } from "../src/repos/usuarios.memoria.js";
import { asegurarAdminInicial } from "../src/services/seed.js";

test("con la base vacía y las variables SEED_ADMIN_* cargadas, se crea el admin inicial", async () => {
  const config = {
    ...leerConfig({
      SEED_ADMIN_MAIL: "admin@prueba.com",
      SEED_ADMIN_PASSWORD: "Prueba1234",
    }),
    bcryptCosto: 4,
  };
  const usuarios = crearRepoUsuariosMemoria();
  assert.equal(await asegurarAdminInicial({ usuarios, config }), true);
  const admin = await usuarios.buscarPorMail("admin@prueba.com");
  assert.equal(admin.rol, "admin");
});

test("sin las variables SEED_ADMIN_* no se crea ningún usuario (no hay credenciales por defecto)", async () => {
  const config = { ...leerConfig({}), bcryptCosto: 4 };
  const usuarios = crearRepoUsuariosMemoria();
  assert.equal(await asegurarAdminInicial({ usuarios, config }), false);
  assert.equal((await usuarios.listar()).length, 0);
});
