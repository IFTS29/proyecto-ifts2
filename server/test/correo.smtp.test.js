import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { crearApp } from "../src/app.js";
import { leerConfig } from "../src/config.js";
import { crearCorreoSmtp, crearServicioCorreo } from "../src/services/correo.smtp.js";

// Configuración de prueba: casillas y cuenta inventadas, no se conecta a ningún servidor real.
const CONFIG = {
  ...leerConfig({}),
  correoBedelia: "bedelia@prueba.com",
  correoInstitucional: "institucional@prueba.com",
  smtpUsuario: "portal@prueba.com",
  smtpClave: "clave-de-prueba",
};

const CONSULTA = {
  nombre: "Lucía Fernández",
  mail: "lucia@correo.com",
  telefono: "",
  motivo: "inscripcion",
  mensaje: "¿Cuándo abre la inscripción?",
};

// Transporte falso: guarda lo que se habría enviado por SMTP.
function transporteFalso() {
  const enviados = [];
  return { enviados, async sendMail(correo) { enviados.push(correo); return { messageId: "prueba" }; } };
}

test("envía el correo armado desde la cuenta remitente, con Para, CC y Responder a", async (t) => {
  const aviso = t.mock.method(console, "warn", () => {});
  const transporte = transporteFalso();
  await crearCorreoSmtp(CONFIG, { transporte }).enviarConsulta(CONSULTA);
  const [correo] = transporte.enviados;
  assert.equal(correo.from, '"Portal IFTS 2" <portal@prueba.com>');
  assert.equal(correo.to, "bedelia@prueba.com");
  assert.equal(correo.cc, "institucional@prueba.com");
  assert.equal(correo.replyTo, "lucia@correo.com");
  assert.match(correo.subject, /Inscripción a la carrera/);
  assert.equal(aviso.mock.callCount(), 0);
});

test("si el servidor rechaza una casilla, avisa en el registro sin fallar ni reintentar", async (t) => {
  const aviso = t.mock.method(console, "warn", () => {});
  const enviados = [];
  const transporte = {
    async sendMail(correo) {
      enviados.push(correo);
      return { accepted: ["bedelia@prueba.com"], rejected: ["institucional@prueba.com"] };
    },
  };
  await crearCorreoSmtp(CONFIG, { transporte }).enviarConsulta(CONSULTA);
  assert.equal(enviados.length, 1);
  assert.equal(aviso.mock.callCount(), 1);
  assert.match(aviso.mock.calls[0].arguments[0], /institucional@prueba\.com/);
});

test("si el servidor de correo falla, el error llega a quien envía", async () => {
  const transporte = { async sendMail() { throw new Error("SMTP caído"); } };
  await assert.rejects(() => crearCorreoSmtp(CONFIG, { transporte }).enviarConsulta(CONSULTA), /SMTP caído/);
});

test("con SMTP configurado se usa el envío real", async () => {
  const transporte = transporteFalso();
  await crearServicioCorreo(CONFIG, { transporte }).enviarConsulta(CONSULTA);
  assert.equal(transporte.enviados.length, 1);
});

test("con la configuración SMTP incompleta el envío falla, también en desarrollo", async (t) => {
  const error = t.mock.method(console, "error", () => {});
  const soloUsuario = crearServicioCorreo({ ...CONFIG, smtpClave: "", produccion: false });
  const soloClave = crearServicioCorreo({ ...CONFIG, smtpUsuario: "", produccion: false });
  await assert.rejects(() => soloUsuario.enviarConsulta(CONSULTA), /no está configurado/);
  await assert.rejects(() => soloClave.enviarConsulta(CONSULTA), /no está configurado/);
  assert.equal(error.mock.callCount(), 2);
});

test("sin SMTP en desarrollo se usa el envío simulado y no falla", async () => {
  const servicio = crearServicioCorreo({ ...CONFIG, smtpUsuario: "", smtpClave: "", produccion: false });
  await servicio.enviarConsulta(CONSULTA);
  assert.ok(Array.isArray(servicio.enviados));
});

test("sin SMTP en producción el envío falla en lugar de simularse", async () => {
  const servicio = crearServicioCorreo({ ...CONFIG, smtpUsuario: "", smtpClave: "", produccion: true });
  await assert.rejects(() => servicio.enviarConsulta(CONSULTA), /no está configurado/);
});

test("leerConfig toma la cuenta SMTP del entorno y usa Gmail por defecto", () => {
  const config = leerConfig({ SMTP_USUARIO: "portal@prueba.com", SMTP_CLAVE: "x" });
  assert.equal(config.smtpHost, "smtp.gmail.com");
  assert.equal(config.smtpPuerto, 465);
  assert.equal(config.smtpUsuario, "portal@prueba.com");
  assert.equal(leerConfig({ SMTP_PUERTO: "587" }).smtpPuerto, 587);
});

test("integración: el formulario envía la consulta por SMTP al destinatario según el motivo", async () => {
  const transporte = transporteFalso();
  const app = crearApp({ config: CONFIG, correo: crearCorreoSmtp(CONFIG, { transporte }) });

  const inscripcion = await request(app).post("/api/contact").send(CONSULTA);
  const otro = await request(app).post("/api/contact").send({ ...CONSULTA, motivo: "otro" });

  assert.equal(inscripcion.status, 200);
  assert.equal(otro.status, 200);
  assert.equal(transporte.enviados[0].to, "bedelia@prueba.com");
  assert.equal(transporte.enviados[1].to, "institucional@prueba.com");
  assert.equal(transporte.enviados[1].cc, "bedelia@prueba.com");
});

test("integración: si el servidor rechaza una casilla, el formulario confirma el envío igual", async (t) => {
  t.mock.method(console, "warn", () => {});
  const transporte = {
    async sendMail() {
      return { accepted: ["bedelia@prueba.com"], rejected: ["institucional@prueba.com"] };
    },
  };
  const app = crearApp({ config: CONFIG, correo: crearCorreoSmtp(CONFIG, { transporte }) });
  const res = await request(app).post("/api/contact").send(CONSULTA);
  assert.equal(res.status, 200);
});

test("integración: si el servidor de correo falla, el formulario responde 502", async () => {
  const transporte = { async sendMail() { throw new Error("SMTP caído"); } };
  const app = crearApp({ config: CONFIG, correo: crearCorreoSmtp(CONFIG, { transporte }) });
  const res = await request(app).post("/api/contact").send(CONSULTA);
  assert.equal(res.status, 502);
});