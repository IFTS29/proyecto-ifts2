import test from "node:test";
import assert from "node:assert/strict";
import { leerConfig } from "../src/config.js";
import { prepararDatos } from "../src/arranque.js";
import handler, { crearHandler } from "../../api/index.js";

// En lugar de conectarse a una base real, estas pruebas simulan que MongoDB no responde.
const baseCaida = async () => {
  throw new Error("connect ECONNREFUSED");
};

test("la base de datos es obligatoria en producción y en Vercel, no en desarrollo", () => {
  assert.equal(leerConfig({ NODE_ENV: "production" }).exigeBaseDeDatos, true);
  assert.equal(leerConfig({ VERCEL: "1" }).exigeBaseDeDatos, true);
  assert.equal(leerConfig({}).exigeBaseDeDatos, false);
});

test("producción sin MONGODB_URI: no arranca en memoria", async () => {
  const config = leerConfig({ NODE_ENV: "production" });
  await assert.rejects(prepararDatos(config), /Falta MONGODB_URI/);
});

test("producción con MongoDB caído: no arranca en memoria", async () => {
  const config = leerConfig({ NODE_ENV: "production", MONGODB_URI: "mongodb://base-de-prueba" });
  await assert.rejects(prepararDatos(config, { conectar: baseCaida }), /No se pudo conectar con MongoDB/);
});

test("desarrollo sin MONGODB_URI: trabaja en memoria y los datos se pueden usar", async () => {
  const { usuarios } = await prepararDatos(leerConfig({}));
  const datos = { nombre: "Prueba", mail: "prueba@ifts2.edu.ar", rol: "admin", passwordHash: "x" };
  const creado = await usuarios.crear(datos);
  assert.equal((await usuarios.buscarPorId(creado.id)).mail, "prueba@ifts2.edu.ar");
});

test("desarrollo con MongoDB caído: sigue en memoria", async () => {
  const config = leerConfig({ MONGODB_URI: "mongodb://base-de-prueba" });
  const { usuarios } = await prepararDatos(config, { conectar: baseCaida });
  assert.deepEqual(await usuarios.listar(), []);
});

// Simula una petición de Vercel a la función de api/index.js, sin servidor real.
function pedirAVercel(url, funcion = handler) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      encabezados: {},
      setHeader(nombre, valor) {
        this.encabezados[nombre.toLowerCase()] = valor;
      },
      end(cuerpo) {
        resolve({ status: this.statusCode, encabezados: this.encabezados, cuerpo });
      },
    };
    funcion({ url, method: "GET", headers: {} }, res);
  });
}

test("Vercel sin base de datos: responde 503 en JSON, no un éxito en memoria", async () => {
  const anterior = { VERCEL: process.env.VERCEL, MONGODB_URI: process.env.MONGODB_URI };
  process.env.VERCEL = "1";
  delete process.env.MONGODB_URI;
  try {
    const res = await pedirAVercel("/users");
    assert.equal(res.status, 503);
    assert.match(res.encabezados["content-type"], /application\/json/);
    assert.match(JSON.parse(res.cuerpo).error, /no está disponible/);
  } finally {
    if (anterior.VERCEL === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = anterior.VERCEL;
    if (anterior.MONGODB_URI !== undefined) process.env.MONGODB_URI = anterior.MONGODB_URI;
  }
});

test("Vercel con MONGODB_URI pero la base caída: responde 503 y reintenta en la próxima petición", async () => {
  // Producción con una URI cargada, pero la conexión falla.
  let intentos = 0;
  const preparar = (config) => {
    intentos++;
    const enProduccion = { ...config, mongoUri: "mongodb://base-de-prueba", exigeBaseDeDatos: true };
    return prepararDatos(enProduccion, { conectar: baseCaida });
  };
  const vercel = crearHandler({ preparar });

  const primera = await pedirAVercel("/salud", vercel);
  assert.equal(primera.status, 503);
  assert.match(JSON.parse(primera.cuerpo).error, /no está disponible/);

  await pedirAVercel("/salud", vercel);
  assert.equal(intentos, 2); // no guardó el error: volvió a intentar conectarse
});