import test from "node:test";
import assert from "node:assert/strict";
import { correEnVercel, leerConfig } from "../src/config.js";

// La dirección del sitio se usa en los enlaces de los PDF: tiene que salir de la configuración.
test("dirección del sitio: SITIO_URL tiene prioridad y se le quita la barra final", () => {
  const config = leerConfig({ SITIO_URL: "https://proyecto-ifts2.vercel.app/", VERCEL_URL: "otra.vercel.app" });
  assert.equal(config.sitioUrl, "https://proyecto-ifts2.vercel.app");
});

test("dirección del sitio: en Vercel usa las variables que define Vercel", () => {
  const produccion = leerConfig({
    VERCEL_ENV: "production",
    VERCEL_PROJECT_PRODUCTION_URL: "proyecto-ifts2.vercel.app",
    VERCEL_URL: "proyecto-ifts2-abc123.vercel.app",
  });
  assert.equal(produccion.sitioUrl, "https://proyecto-ifts2.vercel.app");

  const prueba = leerConfig({ VERCEL_ENV: "preview", VERCEL_URL: "proyecto-ifts2-abc123.vercel.app" });
  assert.equal(prueba.sitioUrl, "https://proyecto-ifts2-abc123.vercel.app");
});

test("dirección del sitio: sin nada configurado, la de desarrollo", () => {
  assert.equal(leerConfig({}).sitioUrl, "http://localhost:3000");
  assert.equal(leerConfig({ PORT: "4000" }).sitioUrl, "http://localhost:4000");
});

// En Vercel no siempre existe VERCEL=1 (depende de una opción del panel): se miran otras señales.
test("correEnVercel: reconoce Vercel aunque falte VERCEL=1", () => {
  assert.equal(correEnVercel({}, "/home/mariana/proyecto"), false);
  assert.equal(correEnVercel({ VERCEL: "1" }, "/home/mariana/proyecto"), true);
  assert.equal(correEnVercel({ VERCEL_ENV: "preview" }, "/home/mariana/proyecto"), true);
  assert.equal(correEnVercel({ VERCEL_URL: "proyecto-ifts2-abc.vercel.app" }, "/home/mariana/proyecto"), true);
  assert.equal(correEnVercel({}, "/var/task"), true);
});

test("en Vercel, aunque falte VERCEL=1, se exige MongoDB y se usa la IP que informa Vercel", () => {
  for (const env of [{ VERCEL: "1" }, { VERCEL_ENV: "preview" }, { VERCEL_URL: "proyecto-ifts2-abc.vercel.app" }]) {
    const config = leerConfig(env);
    assert.equal(config.exigeBaseDeDatos, true, JSON.stringify(env));
    assert.equal(config.detrasDeVercel, true, JSON.stringify(env));
  }
  const local = leerConfig({});
  assert.equal(local.exigeBaseDeDatos, false);
  assert.equal(local.detrasDeVercel, false);
  assert.equal(leerConfig({ NODE_ENV: "production" }).exigeBaseDeDatos, true);
});
