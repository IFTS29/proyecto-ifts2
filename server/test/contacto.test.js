import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { crearApp } from "../src/app.js";
import { leerConfig } from "../src/config.js";
import { crearCorreoMemoria } from "../src/services/correo.memoria.js";
import { validarConsulta, MOTIVOS } from "../src/services/contacto.js";

const CONSULTA = {
  nombre: "Lucía Fernández",
  mail: "lucia@correo.com",
  telefono: "",
  motivo: "inscripcion",
  mensaje: "¿Cuándo abre la inscripción?",
};

// App con el correo simulado, para revisar qué se habría enviado.
function appDePrueba(correo = crearCorreoMemoria({ guardarEnviados: true })) {
  return { app: crearApp({ correo }), correo };
}

test("una consulta válida se envía y responde 200", async () => {
  const { app, correo } = appDePrueba();
  const res = await request(app).post("/api/contact").send(CONSULTA);
  assert.equal(res.status, 200);
  assert.equal(correo.enviados.length, 1);
  assert.equal(correo.enviados[0].mail, "lucia@correo.com");
  assert.equal(correo.enviados[0].motivo, "inscripcion");
});

test("el correo se normaliza sin espacios y en minúsculas", () => {
  const { consulta } = validarConsulta({
    ...CONSULTA,
    mail: "  Lucia@Correo.COM ",
  });
  assert.equal(consulta.mail, "lucia@correo.com");
});

test("se aceptan los cinco motivos de la lista y se rechaza cualquier otro", () => {
  for (const motivo of Object.keys(MOTIVOS)) {
    assert.ok(
      validarConsulta({ ...CONSULTA, motivo }).consulta,
      `debería aceptar "${motivo}"`,
    );
  }
  assert.equal(Object.keys(MOTIVOS).length, 5);
  assert.ok(validarConsulta({ ...CONSULTA, motivo: "cualquiera" }).error);
});

test("sin nombre, correo o mensaje responde 400 y no envía nada", async () => {
  const { app, correo } = appDePrueba();
  for (const campo of ["nombre", "mail", "mensaje"]) {
    const res = await request(app)
      .post("/api/contact")
      .send({ ...CONSULTA, [campo]: "  " });
    assert.equal(res.status, 400, `falta ${campo}`);
  }
  assert.equal(correo.enviados.length, 0);
});

test("un correo con formato inválido responde 400", async () => {
  const { app } = appDePrueba();
  const res = await request(app)
    .post("/api/contact")
    .send({ ...CONSULTA, mail: "lucia@correo" });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "El correo no tiene un formato válido.");
});

test("los datos que no son texto (arreglos, objetos, números) se rechazan", () => {
  for (const cambio of [
    { nombre: ["Ana"] },
    { mensaje: { texto: "hola" } },
    { telefono: 1145678901 },
  ]) {
    const { error } = validarConsulta({ ...CONSULTA, ...cambio });
    assert.equal(error, "Los datos enviados no tienen el formato esperado.");
  }
});

test("un cuerpo que no es un objeto (null, arreglo o texto) se rechaza", async () => {
  for (const cuerpo of [null, [CONSULTA], "hola"]) {
    assert.equal(
      validarConsulta(cuerpo).error,
      "Los datos enviados no tienen el formato esperado.",
    );
  }
  const { app, correo } = appDePrueba();
  const res = await request(app).post("/api/contact").send([CONSULTA]);
  assert.equal(res.status, 400);
  assert.equal(correo.enviados.length, 0);
});

test("el teléfono es opcional y acepta formatos argentinos habituales", () => {
  for (const telefono of [
    "",
    "+54 11 1234-5678",
    "(011) 4567-8901",
    "1145678901",
  ]) {
    assert.ok(
      validarConsulta({ ...CONSULTA, telefono }).consulta,
      `debería aceptar "${telefono}"`,
    );
  }
  const sinTelefono = { ...CONSULTA };
  delete sinTelefono.telefono;
  assert.ok(
    validarConsulta(sinTelefono).consulta,
    "debería aceptar una consulta sin el campo teléfono",
  );
});

test("un teléfono con letras o muy corto se rechaza", () => {
  for (const telefono of ["11-ABCD-1234", "123"]) {
    assert.ok(
      validarConsulta({ ...CONSULTA, telefono }).error,
      `debería rechazar "${telefono}"`,
    );
  }
});

test("cada campo respeta su largo máximo", () => {
  const casos = {
    nombre: "a".repeat(101),
    mail: "a".repeat(145) + "@x.com",
    telefono: "11" + " ".repeat(25) + "12345678",
    mensaje: "a".repeat(3001),
  };
  for (const [campo, valor] of Object.entries(casos)) {
    const { error } = validarConsulta({ ...CONSULTA, [campo]: valor });
    assert.match(error ?? "", /supera los/, `${campo} demasiado largo`);
  }
});

test("si el campo oculto (honeypot) viene lleno, responde como éxito pero no envía nada", async () => {
  const { app, correo } = appDePrueba();
  const res = await request(app)
    .post("/api/contact")
    .send({ ...CONSULTA, sitioWeb: "http://spam.com" });
  assert.equal(res.status, 200);
  assert.equal(correo.enviados.length, 0);
});

test("fuera de las pruebas, el correo simulado no conserva las consultas", async () => {
  const correo = crearCorreoMemoria();
  await correo.enviarConsulta(validarConsulta(CONSULTA).consulta);
  assert.equal(correo.enviados.length, 0);
});

test("si falla el envío del correo responde 502 con un mensaje claro", async () => {
  const correoQueFalla = {
    async enviarConsulta() {
      throw new Error("SMTP caído");
    },
  };
  const res = await request(crearApp({ correo: correoQueFalla }))
    .post("/api/contact")
    .send(CONSULTA);
  assert.equal(res.status, 502);
  assert.match(res.body.error, /No pudimos enviar tu consulta/);
});

test("en producción sin servicio de correo configurado no confirma un envío falso", async () => {
  const config = { ...leerConfig({}), produccion: true };
  const res = await request(crearApp({ config }))
    .post("/api/contact")
    .send(CONSULTA);
  assert.equal(res.status, 502);
});
