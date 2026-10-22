import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { crearApp } from "../src/app.js";
import { crearCorreoMemoria } from "../src/services/correo.memoria.js";
import {
  crearLimitadorContacto,
  claveDeContacto,
  normalizarIp,
} from "../src/services/limitador.contacto.js";

const CONSULTA = {
  nombre: "Lucía Fernández",
  mail: "lucia@correo.com",
  motivo: "inscripcion",
  mensaje: "¿Cuándo abre la inscripción?",
};

// App con un límite chico (3 intentos) para que las pruebas sean cortas
function appConLimite({
  max = 3,
  duracionMs = 60_000,
  detrasDeVercel = false,
} = {}) {
  const correo = crearCorreoMemoria({ guardarEnviados: true });
  const limitadorContacto = crearLimitadorContacto({
    max,
    duracionMs,
    detrasDeVercel,
  });
  return { app: crearApp({ correo, limitadorContacto }), correo };
}

const enviar = (app, encabezados = {}, datos = CONSULTA) =>
  request(app).post("/api/contact").set(encabezados).send(datos);

test("al superar el límite de intentos responde 429 y no envía el correo", async () => {
  const { app, correo } = appConLimite();
  for (let i = 0; i < 3; i++) assert.equal((await enviar(app)).status, 200);
  const res = await enviar(app);
  assert.equal(res.status, 429);
  assert.match(res.body.error, /varias consultas seguidas/);
  assert.equal(correo.enviados.length, 3);
});

test("los intentos rechazados por validación también gastan el cupo", async () => {
  const { app } = appConLimite();
  for (let i = 0; i < 3; i++)
    assert.equal(
      (await enviar(app, {}, { ...CONSULTA, mail: "mal" })).status,
      400,
    );
  assert.equal((await enviar(app)).status, 429);
});

test("los envíos detectados por el honeypot también gastan el cupo", async () => {
  const { app, correo } = appConLimite();
  for (let i = 0; i < 3; i++)
    await enviar(app, {}, { ...CONSULTA, sitioWeb: "http://spam.com" });
  assert.equal((await enviar(app)).status, 429);
  assert.equal(correo.enviados.length, 0);
});

test("fuera de Vercel, cambiar X-Forwarded-For o X-Real-IP no saltea el límite", async () => {
  const { app } = appConLimite();
  for (let i = 0; i < 3; i++) await enviar(app);
  const res = await enviar(app, {
    "X-Forwarded-For": "203.0.113.9",
    "X-Real-IP": "203.0.113.9",
  });
  assert.equal(res.status, 429);
});

test("en Vercel se usa x-real-ip: cada visitante tiene su propio cupo", async () => {
  const { app } = appConLimite({ detrasDeVercel: true });
  for (let i = 0; i < 3; i++)
    await enviar(app, { "X-Real-IP": "198.51.100.1" });
  assert.equal(
    (await enviar(app, { "X-Real-IP": "198.51.100.1" })).status,
    429,
  );
  assert.equal(
    (await enviar(app, { "X-Real-IP": "198.51.100.2" })).status,
    200,
  );
});

test("claveDeContacto usa la conexión fuera de Vercel y x-real-ip en Vercel", () => {
  const req = {
    socket: { remoteAddress: "10.0.0.1" },
    headers: { "x-real-ip": "198.51.100.7" },
  };
  assert.equal(claveDeContacto(req), "10.0.0.1");
  assert.equal(claveDeContacto(req, { detrasDeVercel: true }), "198.51.100.7");
});

test("normalizarIp: IPv4 y sus formas IPv6 dan la misma clave, sin mezclar visitantes distintos", () => {
  for (const ip of [
    "192.168.1.1",
    "::ffff:192.168.1.1",
    "::FFFF:192.168.1.1",
    "::ffff:c0a8:101",
    "0:0:0:0:0:ffff:c0a8:0101",
  ]) {
    assert.equal(normalizarIp(ip), "192.168.1.1", ip);
  }
  assert.notEqual(
    normalizarIp("::ffff:10.0.0.1"),
    normalizarIp("::ffff:10.0.0.2"),
  );
  assert.notEqual(
    normalizarIp("::FFFF:10.0.0.1"),
    normalizarIp("::FFFF:10.0.0.2"),
  );
});

test("normalizarIp: las IPv6 se agrupan por red /64 sin importar cómo estén escritas", () => {
  for (const ip of [
    "2001:db8:abcd:12:1::5",
    "2001:0DB8:ABCD:0012:ffff:1:2:3",
    "2001:db8:abcd:12::99",
    "2001:db8:abcd:12::1%eth0",
  ]) {
    assert.equal(normalizarIp(ip), "2001:db8:abcd:12::/64", ip);
  }
  assert.equal(normalizarIp("2001:db8::1"), "2001:db8:0:0::/64");
  assert.notEqual(
    normalizarIp("2001:db8:abcd:12::1"),
    normalizarIp("2001:db8:abcd:13::1"),
  );
  assert.equal(normalizarIp("no-es-una-ip"), "no-es-una-ip");
});

test("las direcciones IPv6 de una misma red /64 comparten el cupo", async () => {
  const { app } = appConLimite({ detrasDeVercel: true });
  for (let i = 0; i < 3; i++)
    await enviar(app, { "X-Real-IP": `2001:db8:abcd:12::${i + 1}` });
  assert.equal(
    (await enviar(app, { "X-Real-IP": "2001:DB8:ABCD:12::99" })).status,
    429,
  );
  assert.equal(
    (await enviar(app, { "X-Real-IP": "2001:db8:abcd:13::1" })).status,
    200,
  );
});

test("el límite se reinicia cuando pasa la ventana de tiempo", async () => {
  const { app } = appConLimite({ max: 1, duracionMs: 300 });
  assert.equal((await enviar(app)).status, 200);
  assert.equal((await enviar(app)).status, 429);
  await new Promise((r) => setTimeout(r, 350));
  assert.equal((await enviar(app)).status, 200);
});
