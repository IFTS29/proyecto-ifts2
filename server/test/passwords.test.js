import test from "node:test";
import assert from "node:assert/strict";
import { comparar, hashear, validarPassword } from "../src/services/passwords.js";

test("validarPassword acepta 8 o más caracteres con una mayúscula y un número", () => {
  assert.equal(validarPassword("Clave1234"), null);
});

test("validarPassword rechaza cortas, sin número o sin mayúscula", () => {
  for (const p of ["Ab1", "Sololetras", "clave1234", "12345678", "", undefined]) {
    assert.match(validarPassword(p), /al menos 8 caracteres/, `debía rechazar ${p}`);
  }
});

test("hashear no guarda la contraseña en texto plano y comparar la reconoce", async () => {
  const hash = await hashear("Clave1234", 4);
  assert.notEqual(hash, "Clave1234");
  assert.match(hash, /^\$2[aby]\$/);
  assert.equal(await comparar("Clave1234", hash), true);
  assert.equal(await comparar("otra", hash), false);
});
