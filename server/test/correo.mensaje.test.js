import test from "node:test";
import assert from "node:assert/strict";
import { armarCorreoConsulta } from "../src/services/correo.mensaje.js";
import { MOTIVOS } from "../src/services/contacto.js";

const CASILLAS = { correoBedelia: "bedelia@prueba.com", correoInstitucional: "institucional@prueba.com" };
const CONSULTA = {
  nombre: "Lucía Fernández",
  mail: "lucia@correo.com",
  telefono: "",
  motivo: "inscripcion",
  mensaje: "¿Cuándo abre la inscripción?",
};

test("los motivos administrativos van a Bedelía con copia a la casilla institucional", () => {
  for (const motivo of ["inscripcion", "equivalencias", "horarios", "tramites"]) {
    const correo = armarCorreoConsulta({ ...CONSULTA, motivo }, CASILLAS);
    assert.equal(correo.to, "bedelia@prueba.com", motivo);
    assert.equal(correo.cc, "institucional@prueba.com", motivo);
  }
});

test("el motivo Otro va a la casilla institucional con copia a Bedelía", () => {
  const correo = armarCorreoConsulta({ ...CONSULTA, motivo: "otro" }, CASILLAS);
  assert.equal(correo.to, "institucional@prueba.com");
  assert.equal(correo.cc, "bedelia@prueba.com");
});

test("todos los motivos tienen una casilla responsable y otra de respaldo", () => {
  for (const motivo of Object.keys(MOTIVOS)) {
    const correo = armarCorreoConsulta({ ...CONSULTA, motivo }, CASILLAS);
    assert.ok(correo.to && correo.cc && correo.to !== correo.cc, motivo);
  }
});

test("la respuesta va al visitante, que no recibe copia", () => {
  const correo = armarCorreoConsulta(CONSULTA, CASILLAS);
  assert.equal(correo.replyTo, "lucia@correo.com");
  assert.ok(![correo.to, correo.cc].includes("lucia@correo.com"));
});

test("el asunto y el texto incluyen el motivo y los datos de la consulta", () => {
  const correo = armarCorreoConsulta({ ...CONSULTA, telefono: "11 4567-8901" }, CASILLAS);
  assert.equal(correo.subject, "[Portal IFTS 2] Inscripción a la carrera - Lucía Fernández");
  assert.match(correo.text, /Teléfono: 11 4567-8901/);
  assert.match(correo.text, /¿Cuándo abre la inscripción\?/);
  assert.match(armarCorreoConsulta(CONSULTA, CASILLAS).text, /Teléfono: \(no informado\)/);
});

test("el texto indica quién responde y que se use Responder a todos", () => {
  const { text } = armarCorreoConsulta(CONSULTA, CASILLAS);
  assert.match(text, /Responde la casilla que figura en "Para"/);
  assert.match(text, /Usá "Responder a todos"/);
});

test("un nombre con saltos de línea no agrega líneas al asunto", () => {
  const correo = armarCorreoConsulta({ ...CONSULTA, nombre: "Ana\r\nBcc: otro@spam.com" }, CASILLAS);
  assert.ok(!/[\r\n]/.test(correo.subject));
});

test("sin las dos casillas configuradas no se arma el correo", () => {
  assert.throws(() => armarCorreoConsulta(CONSULTA, { correoBedelia: "", correoInstitucional: "x@y.com" }), /Faltan configurar/);
  assert.throws(() => armarCorreoConsulta(CONSULTA, { correoBedelia: "x@y.com", correoInstitucional: "" }), /Faltan configurar/);
});

test("si las dos casillas son la misma (aunque cambien mayúsculas o espacios) no se arma el correo", () => {
  const mismas = { correoBedelia: "Equipo@Prueba.com", correoInstitucional: " equipo@prueba.com " };
  assert.throws(() => armarCorreoConsulta(CONSULTA, mismas), /casillas distintas/);
});