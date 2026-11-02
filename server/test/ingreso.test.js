import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import request from "supertest";
import { appDePrueba, tokenDe, ADMIN, BEDELIA } from "./ayuda.js";
import { crearRepoContenidoMemoria } from "../src/repos/contenido.memoria.js";
import { VALORES_INICIALES, validarSeccion } from "../src/services/contenido.js";
import {
  cronogramaDe,
  estaEnCurso,
  estadoDePreinscripcion,
  hoyEnArgentina,
  textoDeDia,
  textoDeRango,
} from "../../client/src/ingreso.js";

// Ingreso editable desde el panel: sección «ingreso» del contenido institucional y su página pública.

const leer = (ruta) => readFileSync(new URL(`../../client/src/${ruta}`, import.meta.url), "utf8");

// Convocatoria del 2.º cuatrimestre 2026, tal como la publicó el GCBA.
const CONVOCATORIA_2026 = {
  convocatoria: "2.º cuatrimestre 2026",
  preinscripcion: { desde: "2026-06-08", hasta: "2026-07-28", detalle: "En SIU Guaraní." },
  etapas: [
    { nombre: "Curso de ingreso (optativo)", desde: "2026-06-08", hasta: "2026-08-07", detalle: "" },
    { nombre: "Examen obligatorio", desde: "2026-08-03", hasta: "2026-08-07", detalle: "" },
    { nombre: "Confirmación de vacantes", desde: "2026-08-10", hasta: "", detalle: "" },
    { nombre: "Inicio de clases", desde: "2026-08-10", hasta: "", detalle: "" },
  ],
  preguntas: [{ pregunta: "¿Hay que pagar?", respuesta: "No, las carreras son gratuitas." }],
  correo: "",
};

const conCambio = (cambio) => ({ ...CONVOCATORIA_2026, ...cambio });
const errorDe = (datos) => validarSeccion("ingreso", datos).error;

async function preparar() {
  const { app } = await appDePrueba({ contenido: crearRepoContenidoMemoria() });
  const admin = await tokenDe(app, ADMIN);
  const bedelia = await tokenDe(app, BEDELIA);
  const guardar = (datos, token = admin) =>
    request(app).put("/api/content/ingreso").set("Authorization", `Bearer ${token}`).send({ datos });
  return { app, guardar, bedelia };
}

test("sin nada guardado: sin convocatoria, sin correo y con las preguntas frecuentes iniciales", async () => {
  const { app } = await preparar();
  const res = await request(app).get("/api/content");
  assert.deepEqual(res.body.ingreso, { datos: VALORES_INICIALES.ingreso, actualizadoEn: null, inicial: true });
  const { datos } = res.body.ingreso;
  assert.equal(datos.convocatoria, "");
  assert.deepEqual(datos.etapas, []);
  assert.equal(datos.correo, "");
  assert.equal(datos.preguntas.length, 5);
  // Respuestas generales: nada que cambie según la convocatoria (plazos, duración o cantidad de exámenes, meses).
  const respuestas = datos.preguntas.map((p) => p.respuesta).join(" ");
  assert.doesNotMatch(respuestas, /7 días|dos horas|90 minutos|marzo|ECOPE|IPEMAT/);
  assert.equal(validarSeccion("ingreso", VALORES_INICIALES.ingreso).error, undefined, "los valores iniciales son válidos");
});

test("Administración guarda la convocatoria y el sitio la ve; Bedelía no puede", async () => {
  const { app, guardar, bedelia } = await preparar();
  assert.equal((await guardar(CONVOCATORIA_2026, bedelia)).status, 403);
  const res = await guardar(conCambio({ correo: "Consultas.DETS@bue.edu.ar" }));
  assert.equal(res.status, 200);
  const sitio = (await request(app).get("/api/content")).body.ingreso;
  assert.equal(sitio.inicial, false);
  assert.equal(sitio.datos.convocatoria, "2.º cuatrimestre 2026");
  assert.equal(sitio.datos.etapas.length, 4);
  assert.equal(sitio.datos.correo, "consultas.dets@bue.edu.ar");
});

test("fechas: día de calendario real, en formato AAAA-MM-DD y con el cierre no antes del inicio", () => {
  const pre = (desde, hasta) => conCambio({ preinscripcion: { desde, hasta, detalle: "" } });
  assert.match(errorDe(pre("2026-02-30", "2026-03-01")), /Preinscripción: la fecha de inicio no es válida/);
  assert.match(errorDe(pre("08/06/2026", "2026-07-28")), /no es válida/);
  assert.match(errorDe(pre("2026-07-28", "2026-06-08")), /no puede ser anterior/);
  assert.match(errorDe(pre("2026-06-08", "")), /Preinscripción: completar la fecha de cierre/);
  assert.match(errorDe(pre("1999-06-08", "2026-07-28")), /no es válida/);
  assert.equal(errorDe(pre("2026-06-08", "2026-06-08")), undefined, "puede durar un solo día");
  const etapaMal = conCambio({ etapas: [{ nombre: "Examen", desde: "2026-08-07", hasta: "2026-08-03" }] });
  assert.match(errorDe(etapaMal), /^Etapa 1: la fecha de cierre no puede ser anterior/);
  const fechaNoTexto = conCambio({ etapas: [{ nombre: "Examen", desde: 20260803 }] });
  assert.match(errorDe(fechaNoTexto), /^Etapa 1: la fecha de inicio no es válida/);
});

test("convocatoria, etapas y preguntas: obligatorios y límites", () => {
  assert.match(errorDe(conCambio({ convocatoria: "" })), /Completar el nombre de la convocatoria/);
  assert.match(errorDe(conCambio({ convocatoria: "x".repeat(61) })), /hasta 60 caracteres/);
  assert.match(errorDe(conCambio({ etapas: [{ nombre: "", desde: "2026-08-03" }] })), /^Etapa 1: completar el nombre/);
  assert.match(errorDe(conCambio({ etapas: [{ nombre: "Examen" }] })), /^Etapa 1: completar la fecha de inicio/);
  const muchas = Array.from({ length: 7 }, (_, i) => ({ nombre: `Etapa ${i}`, desde: "2026-08-03" }));
  assert.match(errorDe(conCambio({ etapas: muchas })), /hasta 6 etapas/);
  assert.match(errorDe(conCambio({ preguntas: [{ pregunta: "¿Cuándo?", respuesta: "" }] })), /^Pregunta 1: completar la respuesta/);
  const preguntas = Array.from({ length: 11 }, (_, i) => ({ pregunta: `P${i}`, respuesta: "R" }));
  assert.match(errorDe(conCambio({ preguntas })), /hasta 10 preguntas/);
  assert.match(errorDe(conCambio({ correo: "consultas@" })), /correo de consultas no tiene un formato válido/);
  assert.match(errorDe(conCambio({ etapas: "examen" })), /lista de etapas no es válida/);
  assert.match(errorDe(conCambio({ preinscripcion: "junio" })), /preinscripción no son válidos/);
});

test("sin convocatoria no se aceptan fechas sueltas; las filas vacías se descartan", () => {
  const sinNombre = { ...VALORES_INICIALES.ingreso, etapas: [{ nombre: "Examen", desde: "2026-08-03" }] };
  assert.match(errorDe(sinNombre), /Completar el nombre de la convocatoria/);
  const vacias = conCambio({
    etapas: [...CONVOCATORIA_2026.etapas, { nombre: " ", desde: "", hasta: "", detalle: "" }],
    preguntas: [{ pregunta: "", respuesta: "  " }],
  });
  const { datos } = validarSeccion("ingreso", vacias);
  assert.equal(datos.etapas.length, 4);
  assert.deepEqual(datos.preguntas, []);
});

test("textos de fechas sin corrimientos por la zona horaria", () => {
  assert.equal(textoDeDia("2026-06-08"), "8 de junio de 2026");
  assert.equal(textoDeDia("2026-01-01"), "1 de enero de 2026");
  assert.equal(textoDeRango({ desde: "2026-06-08", hasta: "2026-07-28" }), "Del 8 de junio al 28 de julio de 2026");
  assert.equal(
    textoDeRango({ desde: "2026-11-06", hasta: "2027-03-05" }),
    "Del 6 de noviembre de 2026 al 5 de marzo de 2027",
  );
  assert.equal(textoDeRango({ desde: "2026-08-03", hasta: "2026-08-03" }), "3 de agosto de 2026");
  assert.equal(textoDeRango({ desde: "2026-08-10", hasta: "" }), "A partir del 10 de agosto de 2026");
  // 31/12 a las 23:30 en Argentina ya es 1/1 en UTC: el día sigue siendo el de Argentina.
  assert.equal(hoyEnArgentina(new Date("2027-01-01T02:30:00Z")), "2026-12-31");
  // Siempre AAAA-MM-DD, con ceros, justo antes y justo después de la medianoche de Argentina.
  assert.equal(hoyEnArgentina(new Date("2026-03-05T02:59:59Z")), "2026-03-04");
  assert.equal(hoyEnArgentina(new Date("2026-03-05T03:00:00Z")), "2026-03-05");
  assert.match(hoyEnArgentina(), /^\d{4}-\d{2}-\d{2}$/);
});

test("estado de la preinscripción: a confirmar, próxima, abierta (incluidos el primer y el último día) y finalizada", () => {
  const estado = (hoy, datos = CONVOCATORIA_2026) => estadoDePreinscripcion(datos, hoy);
  assert.equal(estado("2026-11-02", VALORES_INICIALES.ingreso).tipo, "sin-convocatoria");
  assert.equal(estado("2026-11-02", VALORES_INICIALES.ingreso).etiqueta, "Fechas a confirmar");
  assert.equal(estado("2026-06-07").tipo, "proxima");
  assert.equal(estado("2026-06-07").texto, "La preinscripción abre el 8 de junio de 2026.");
  assert.equal(estado("2026-06-08").tipo, "abierta");
  assert.equal(estado("2026-07-28").tipo, "abierta");
  assert.equal(estado("2026-07-28").texto, "Hasta el 28 de julio de 2026.");
  assert.equal(estado("2026-07-29").tipo, "finalizada");
  // Hoy (noviembre de 2026) la convocatoria de ejemplo no aparece como inscripción abierta.
  const noviembre = estado("2026-11-02");
  assert.equal(noviembre.tipo, "finalizada");
  assert.equal(noviembre.texto, "La preinscripción de esta convocatoria cerró el 28 de julio de 2026.");
});

test("etapas en curso: pueden ser varias a la vez y las que no tienen cierre nunca se marcan", () => {
  const enCurso = (hoy) =>
    cronogramaDe(CONVOCATORIA_2026, hoy)
      .filter((paso) => paso.enCurso)
      .map((paso) => paso.nombre);
  assert.deepEqual(enCurso("2026-06-10"), ["Preinscripción", "Curso de ingreso (optativo)"]);
  assert.deepEqual(enCurso("2026-08-05"), ["Curso de ingreso (optativo)", "Examen obligatorio"]);
  assert.deepEqual(enCurso("2026-08-20"), [], "«A partir del 10 de agosto» no queda en curso para siempre");
  assert.equal(estaEnCurso({ desde: "2026-08-10", hasta: "" }, "2026-08-10"), false);
});

test("cronograma: la preinscripción primero y después las etapas en el orden cargado; vacío sin convocatoria", () => {
  const pasos = cronogramaDe(CONVOCATORIA_2026, "2026-11-02");
  assert.deepEqual(
    pasos.map((p) => [p.nombre, p.fechas]),
    [
      ["Preinscripción", "Del 8 de junio al 28 de julio de 2026"],
      ["Curso de ingreso (optativo)", "Del 8 de junio al 7 de agosto de 2026"],
      ["Examen obligatorio", "Del 3 al 7 de agosto de 2026"],
      ["Confirmación de vacantes", "A partir del 10 de agosto de 2026"],
      ["Inicio de clases", "A partir del 10 de agosto de 2026"],
    ],
  );
  assert.equal(pasos[0].detalle, "En SIU Guaraní.");
  assert.deepEqual(cronogramaDe(VALORES_INICIALES.ingreso), []);
});

test("la página de Ingreso no tiene fechas, años ni contenido escritos a mano", () => {
  const pagina = leer("pages/Ingreso.jsx");
  for (const texto of [
    "anio(",
    "Ingresos anteriores",
    "de marzo",
    "de noviembre",
    "preingreso.ifts",
    "Fechas a confirmar",
    "ofertaEducativa",
  ]) {
    assert.ok(!pagina.includes(texto), texto);
  }
  assert.doesNotMatch(pagina, /style=\{\{(?! "--foto")/, "estilos en styles.css");
  assert.doesNotMatch(pagina, /\b(cargás|elegís|tenés|escribile|escribí|Podés)\b/, "sin voseo");
  assert.match(pagina, /preinscripcion\.tipo === "abierta" && \(\s*<EnlaceExterno href=\{ENLACES\.preinscripcion\}/);
  assert.doesNotMatch(leer("utils.js"), /anioIngreso|export function anio/);
});

test("quitar la convocatoria: confirmación con lo que se borra y lo que se conserva", async () => {
  const { QUITAR_CONVOCATORIA } = await import("../../client/src/confirmaciones.js");
  assert.equal(QUITAR_CONVOCATORIA.accion, "Quitar convocatoria");
  assert.match(QUITAR_CONVOCATORIA.texto, /Fechas a confirmar/);
  assert.match(QUITAR_CONVOCATORIA.texto, /preguntas frecuentes y el correo de consultas se conservan/);
  // Lo que queda después de quitarla es válido: el servidor acepta guardarlo.
  const sinConvocatoria = { ...CONVOCATORIA_2026, convocatoria: "", preinscripcion: { desde: "", hasta: "", detalle: "" }, etapas: [] };
  assert.equal(errorDe(sinConvocatoria), undefined);
});
