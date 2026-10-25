import test from "node:test";
import assert from "node:assert/strict";
import { leerConfig } from "../src/config.js";

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