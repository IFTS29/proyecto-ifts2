import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import request from "supertest";
import { appDePrueba, tokenDe, ADMIN, BEDELIA } from "./ayuda.js";
import { crearRepoContenidoMemoria } from "../src/repos/contenido.memoria.js";
import { VALORES_INICIALES, idDeYoutube as idDeYoutubeServidor, validarSeccion } from "../src/services/contenido.js";
import { filaDelError } from "../../client/src/components/useFilas.js";
import {
  aniosDeConvocatoria,
  cronogramaDe,
  esConvocatoriaAnterior,
  estaEnCurso,
  estadoDePreinscripcion,
  hoyEnArgentina,
  idDeYoutube,
  normalizarIngreso,
  partesDeConvocatoria,
  pideConfirmarConvocatoriaNueva,
  textoDeConvocatoria,
  textoDeDia,
  textoDeRango,
  ultimaFechaConocida,
  vaciarConvocatoria,
  videoDeYoutube,
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
  correo: "",
};
const PREGUNTAS = [{ pregunta: "¿Hay que pagar?", respuesta: "No, las carreras son gratuitas." }];

const conCambio = (cambio) => ({ ...CONVOCATORIA_2026, ...cambio });
const errorDe = (datos) => validarSeccion("ingreso", datos).error;
const errorDePreguntas = (preguntas) => validarSeccion("ingresoPreguntas", { preguntas }).error;

async function preparar(contenido = crearRepoContenidoMemoria()) {
  const { app } = await appDePrueba({ contenido });
  const admin = await tokenDe(app, ADMIN);
  const bedelia = await tokenDe(app, BEDELIA);
  const guardarEn = (clave) => (datos, token = admin) =>
    request(app).put(`/api/content/${clave}`).set("Authorization", `Bearer ${token}`).send({ datos });
  const sitio = async () => (await request(app).get("/api/content")).body;
  return { app, guardar: guardarEn("ingreso"), guardarPreguntas: guardarEn("ingresoPreguntas"), bedelia, sitio };
}

test("sin nada guardado: etapas de modelo sin fechas, sin convocatoria y las preguntas iniciales aparte", async () => {
  const { sitio } = await preparar();
  const { ingreso, ingresoPreguntas } = await sitio();
  assert.deepEqual(ingreso, { datos: VALORES_INICIALES.ingreso, actualizadoEn: null, inicial: true });
  const { datos } = ingreso;
  assert.equal(datos.convocatoria, "");
  assert.deepEqual(
    datos.etapas.map((e) => e.nombre),
    ["Curso de ingreso (optativo)", "Examen de ingreso", "Confirmación de vacantes", "Inicio de clases"],
  );
  assert.ok([datos.preinscripcion, ...datos.etapas].every((e) => !e.desde && !e.hasta), "el modelo no trae fechas");
  // Sin aclaraciones que dependan de una convocatoria (modalidad, aula, obligatoriedad): las completa el instituto.
  assert.ok(datos.etapas.every((e) => !e.detalle && !e.textoEnlace && !e.urlEnlace));
  assert.equal(datos.video, "");
  assert.equal(datos.correo, "");
  assert.equal("preguntas" in datos, false);
  assert.equal(ingresoPreguntas.inicial, true);
  assert.equal(ingresoPreguntas.datos.preguntas.length, 5);
  // Respuestas generales: nada que cambie según la convocatoria (plazos, duración o cantidad de exámenes, meses).
  const respuestas = ingresoPreguntas.datos.preguntas.map((p) => p.respuesta).join(" ");
  assert.doesNotMatch(respuestas, /7 días|dos horas|90 minutos|marzo|ECOPE|IPEMAT/);
  assert.equal(validarSeccion("ingreso", VALORES_INICIALES.ingreso).error, undefined, "los valores iniciales son válidos");
  assert.equal(validarSeccion("ingresoPreguntas", VALORES_INICIALES.ingresoPreguntas).error, undefined);
  // Lo que sale del panel sin tocar nada (el modelo normalizado) también se puede guardar.
  assert.equal(errorDe(normalizarIngreso(VALORES_INICIALES.ingreso)), undefined);
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
  // Lo guardado tiene prioridad: el modelo no vuelve aunque se hayan quitado o cambiado etapas.
  assert.equal((await guardar(conCambio({ etapas: [CONVOCATORIA_2026.etapas[1]] }))).status, 200);
  const despues = (await request(app).get("/api/content")).body.ingreso.datos;
  assert.deepEqual(
    despues.etapas.map((e) => e.nombre),
    ["Examen obligatorio"],
  );
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

test("convocatoria: solo «N.º cuatrimestre AAAA» o vacía; también años pasados, como referencia", () => {
  assert.equal(errorDe(conCambio({ convocatoria: "1.º cuatrimestre 2027" })), undefined);
  assert.equal(errorDe(conCambio({ convocatoria: "2.º cuatrimestre 2025" })), undefined, "una anterior sigue siendo válida");
  for (const mal of ["Segundo cuatrimestre 2026", "2° cuatrimestre 2026", "3.º cuatrimestre 2026", "2.º cuatrimestre", "2026"]) {
    assert.match(errorDe(conCambio({ convocatoria: mal })), /^Elegir el cuatrimestre y el año de la convocatoria\.$/, mal);
  }
  assert.match(errorDe(conCambio({ convocatoria: "x".repeat(61) })), /hasta 60 caracteres/);
});

test("etapas, preguntas y correo: obligatorios y límites", () => {
  assert.match(errorDe(conCambio({ etapas: [{ nombre: "", desde: "2026-08-03" }] })), /^Etapa 1: completar el nombre/);
  assert.match(errorDe(conCambio({ etapas: [{ nombre: "Examen" }] })), /^Etapa 1: completar la fecha de inicio/);
  const muchas = Array.from({ length: 7 }, (_, i) => ({ nombre: `Etapa ${i}`, desde: "2026-08-03" }));
  assert.match(errorDe(conCambio({ etapas: muchas })), /hasta 6 etapas/);
  assert.match(errorDePreguntas([{ pregunta: "¿Cuándo?", respuesta: "" }]), /^Pregunta 1: completar la respuesta/);
  assert.match(errorDePreguntas([{ pregunta: "", respuesta: "Sí." }]), /^Pregunta 1: completar la pregunta/);
  const preguntas = Array.from({ length: 11 }, (_, i) => ({ pregunta: `P${i}`, respuesta: "R" }));
  assert.match(errorDePreguntas(preguntas), /hasta 10 preguntas/);
  assert.match(errorDePreguntas([{ pregunta: "x".repeat(151), respuesta: "R" }]), /hasta 150 caracteres/);
  assert.match(errorDePreguntas("todas"), /lista de preguntas frecuentes no es válida/);
  assert.deepEqual(validarSeccion("ingresoPreguntas", { preguntas: [{ pregunta: " ", respuesta: "" }] }).datos, {
    preguntas: [],
  });
  assert.match(errorDe(conCambio({ correo: "consultas@" })), /correo de consultas no tiene un formato válido/);
  assert.match(errorDe(conCambio({ etapas: "examen" })), /lista de etapas no es válida/);
  assert.match(errorDe(conCambio({ preinscripcion: "junio" })), /preinscripción no son válidos/);
  // Las preguntas tienen su propia sección: si llegan con la convocatoria, no se guardan ahí.
  assert.equal("preguntas" in validarSeccion("ingreso", conCambio({ preguntas: PREGUNTAS })).datos, false);
});

test("sin convocatoria: el modelo sin fechas se acepta, las fechas sueltas no; las filas vacías se descartan", () => {
  const modelo = { ...VALORES_INICIALES.ingreso, etapas: [{ nombre: "Examen de ingreso", detalle: "Presencial." }] };
  assert.equal(errorDe(modelo), undefined);
  const conFecha = { ...modelo, etapas: [{ nombre: "Examen", desde: "2026-08-03" }] };
  assert.match(errorDe(conFecha), /^Elegir el cuatrimestre y el año de la convocatoria\.$/);
  const preConFecha = { ...modelo, preinscripcion: { desde: "2026-06-08", hasta: "", detalle: "" } };
  assert.match(errorDe(preConFecha), /^Elegir el cuatrimestre y el año/);
  const vacias = conCambio({ etapas: [...CONVOCATORIA_2026.etapas, { nombre: " ", desde: "", hasta: "", detalle: "" }] });
  assert.equal(validarSeccion("ingreso", vacias).datos.etapas.length, 4);
});

test("enlaces de las etapas: texto y dirección juntos, y solo https", () => {
  const conEnlace = (textoEnlace, urlEnlace) =>
    conCambio({ etapas: [{ ...CONVOCATORIA_2026.etapas[0], textoEnlace, urlEnlace }] });
  const { datos } = validarSeccion("ingreso", conEnlace("Aula virtual", "https://aulasvirtuales.bue.edu.ar/"));
  assert.deepEqual(
    [datos.etapas[0].textoEnlace, datos.etapas[0].urlEnlace],
    ["Aula virtual", "https://aulasvirtuales.bue.edu.ar/"],
  );
  assert.match(errorDe(conEnlace("Aula virtual", "")), /^Etapa 1: completar el texto y la dirección del enlace/);
  assert.match(errorDe(conEnlace("", "https://aulasvirtuales.bue.edu.ar/")), /^Etapa 1: completar el texto y la dirección/);
  for (const mal of ["http://aulasvirtuales.bue.edu.ar/", "javascript:alert(1)", "aulasvirtuales.bue.edu.ar"]) {
    assert.match(errorDe(conEnlace("Aula", mal)), /^Etapa 1: la dirección del enlace tiene que empezar con https:\/\//, mal);
  }
  // Una etapa vieja, guardada antes de que existieran los enlaces, sigue siendo válida.
  const vieja = { nombre: "Examen", desde: "2026-08-03", hasta: "", detalle: "" };
  assert.equal(errorDe(conCambio({ etapas: [vieja] })), undefined);
});

test("video: solo la dirección de un video de YouTube; el reproductor se arma con el identificador", () => {
  const ID = "6jLOQx0zqTo";
  const validas = [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=30s`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
  ];
  const invalidas = [
    `http://www.youtube.com/watch?v=${ID}`,
    `https://youtube.evil.com/watch?v=${ID}`,
    `https://www.youtube.com/watch?v=${ID}"><script>`,
    `<iframe src="https://www.youtube.com/embed/${ID}"></iframe>`,
    "https://www.youtube.com/@ifts2",
    "javascript:alert(1)",
  ];
  for (const url of validas) {
    assert.equal(idDeYoutube(url), ID, url);
    assert.equal(idDeYoutubeServidor(url), ID, `servidor: ${url}`);
    assert.equal(errorDe(conCambio({ video: url })), undefined, url);
  }
  for (const url of invalidas) {
    assert.equal(idDeYoutube(url), null, url);
    assert.equal(idDeYoutubeServidor(url), null, `servidor: ${url}`);
    assert.match(errorDe(conCambio({ video: url })), /tiene que ser la dirección de un video de YouTube/, url);
  }
  assert.deepEqual(videoDeYoutube(validas[3]), {
    insertar: `https://www.youtube-nocookie.com/embed/${ID}`,
    ver: `https://www.youtube.com/watch?v=${ID}`,
  });
  assert.equal(videoDeYoutube(""), null, "sin video no se muestra nada");
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

test("quitar la convocatoria: vacía cuatrimestre, año, fechas, video y enlaces; conserva nombres y aclaraciones", async () => {
  const { QUITAR_CONVOCATORIA } = await import("../../client/src/confirmaciones.js");
  assert.equal(QUITAR_CONVOCATORIA.accion, "Quitar convocatoria");
  assert.match(QUITAR_CONVOCATORIA.texto, /Fechas a confirmar/);
  assert.match(QUITAR_CONVOCATORIA.texto, /todas las fechas, el video y los enlaces de las etapas/);
  assert.match(QUITAR_CONVOCATORIA.texto, /nombres y las aclaraciones de las etapas se conservan/);
  assert.match(QUITAR_CONVOCATORIA.texto, /revisarlos/);
  const conTodo = normalizarIngreso({
    ...CONVOCATORIA_2026,
    etapas: [{ ...CONVOCATORIA_2026.etapas[0], detalle: "Optativo.", textoEnlace: "Aula", urlEnlace: "https://a.b/" }],
    video: "https://youtu.be/6jLOQx0zqTo",
    correo: "consultas@bue.edu.ar",
  });
  const vacia = vaciarConvocatoria(conTodo);
  assert.equal(vacia.convocatoria, "");
  assert.equal(vacia.video, "");
  assert.deepEqual(vacia.preinscripcion, { desde: "", hasta: "", detalle: "En SIU Guaraní." });
  assert.deepEqual(vacia.etapas, [
    {
      nombre: "Curso de ingreso (optativo)",
      desde: "",
      hasta: "",
      detalle: "Optativo.",
      textoEnlace: "",
      urlEnlace: "",
    },
  ]);
  assert.equal(vacia.correo, "consultas@bue.edu.ar");
  // Lo que queda después de quitarla es válido: el servidor acepta guardarlo y el sitio muestra «Fechas a confirmar».
  assert.equal(errorDe(vacia), undefined);
  assert.equal(estadoDePreinscripcion(vacia).tipo, "sin-convocatoria");
});

test("cambiar el cuatrimestre o el año de una convocatoria guardada pide preparar una nueva", async () => {
  const { prepararConvocatoria } = await import("../../client/src/confirmaciones.js");
  const datos = normalizarIngreso(CONVOCATORIA_2026);
  const guardada = "2.º cuatrimestre 2026";
  const pide = (cambio) => pideConfirmarConvocatoriaNueva({ actual: guardada, guardada, datos, ...cambio });
  // Caso de la revisión: se elige 1.º 2027 con las fechas de 2026 todavía cargadas.
  assert.equal(pide({ nueva: "1.º cuatrimestre 2027" }), true);
  assert.equal(pide({ nueva: "1.º cuatrimestre 2026" }), true, "también si cambia solo el cuatrimestre");
  assert.equal(pide({ nueva: guardada }), false, "la misma convocatoria");
  assert.equal(pide({ nueva: "" }), false, "elección a medias: se pregunta al completarla");
  assert.equal(pide({ actual: "", guardada: "", nueva: "1.º cuatrimestre 2027" }), false, "no hay de dónde venir");
  const sinDatos = vaciarConvocatoria(datos);
  assert.equal(pide({ nueva: "1.º cuatrimestre 2027", datos: sinDatos }), false, "sin fechas, video ni enlaces");
  const soloVideo = { ...sinDatos, video: "https://youtu.be/6jLOQx0zqTo" };
  assert.equal(pide({ nueva: "1.º cuatrimestre 2027", datos: soloVideo }), true, "un video también es de la convocatoria");
  // Recorrido normal: después de confirmar (datos vacíos), cambiar el otro desplegable no vuelve a preguntar.
  assert.equal(pide({ actual: "1.º cuatrimestre 2026", nueva: "1.º cuatrimestre 2027", datos: sinDatos }), false);
  // Recorridos de la revisión de la ronda 2: con fechas nuevas cargadas después de confirmar, se vuelve a preguntar
  // al pasar a otra convocatoria, y también al volver a la que estaba guardada.
  const fechas2027 = {
    ...sinDatos,
    convocatoria: "1.º cuatrimestre 2027",
    preinscripcion: { ...sinDatos.preinscripcion, desde: "2026-11-06", hasta: "2027-03-05" },
  };
  const desde2027 = { actual: "1.º cuatrimestre 2027", datos: fechas2027 };
  assert.equal(pide({ ...desde2027, nueva: "2.º cuatrimestre 2027" }), true, "1.º 2027 con fechas → 2.º 2027");
  assert.equal(pide({ ...desde2027, nueva: guardada }), true, "1.º 2027 con fechas → la guardada (2.º 2026)");
  // Con la elección a medias (un desplegable en «Sin elegir»), se compara con la guardada: no se saltea la pregunta.
  assert.equal(pide({ actual: "", nueva: "1.º cuatrimestre 2027" }), true);
  const texto = prepararConvocatoria(guardada, "1.º cuatrimestre 2027");
  assert.equal(texto.titulo, "¿Preparar la convocatoria del 1.º cuatrimestre 2027?");
  assert.match(texto.texto, /convocatoria del 2\.º cuatrimestre 2026, se borran del formulario sus fechas, el video y los enlaces/);
  assert.match(texto.texto, /Nada se publica hasta guardar/);
  // Cancelar deja los desplegables como estaban: el formulario cambia la convocatoria recién después de confirmar.
  const formulario = leer("components/FormIngreso.jsx");
  assert.match(formulario, /if \(!\(await confirmar\(prepararConvocatoria\(actual, nueva\)\)\)\) return;/);
  assert.doesNotMatch(formulario, /preparada/, "la protección vale durante toda la edición, no solo la primera vez");
  assert.match(formulario, /onChange=\{\(e\) => elegirConvocatoria\(e\.target\.value, anio\)\}/);
  assert.match(formulario, /onChange=\{\(e\) => elegirConvocatoria\(cuatrimestre, e\.target\.value\)\}/);
});

test("panel: desplegables de cuatrimestre y año, y texto armado por el sistema", () => {
  assert.deepEqual(partesDeConvocatoria("2.º cuatrimestre 2026"), { cuatrimestre: "2", anio: "2026" });
  assert.deepEqual(partesDeConvocatoria("Segundo cuatrimestre"), { cuatrimestre: "", anio: "" });
  assert.equal(textoDeConvocatoria("1", "2027"), "1.º cuatrimestre 2027");
  assert.equal(textoDeConvocatoria("1", ""), "");
  assert.equal(textoDeConvocatoria("", "2027"), "");
  // El actual y el siguiente; un año guardado distinto también se ofrece, para no perderlo al guardar otra cosa.
  assert.deepEqual(aniosDeConvocatoria("2026-11-02"), ["2026", "2027"]);
  assert.deepEqual(aniosDeConvocatoria("2027-03-01", "2026"), ["2026", "2027", "2028"]);
  assert.deepEqual(aniosDeConvocatoria("2026-11-02", "2027"), ["2026", "2027"]);
  // Lo guardado antes (sin enlaces ni video) se completa con vacíos, siempre en el mismo orden.
  const viejo = normalizarIngreso({ ...CONVOCATORIA_2026, preguntas: PREGUNTAS });
  assert.equal("preguntas" in viejo, false);
  assert.deepEqual(Object.keys(viejo), ["convocatoria", "preinscripcion", "etapas", "video", "correo"]);
  assert.deepEqual(Object.keys(viejo.etapas[0]), ["nombre", "desde", "hasta", "detalle", "textoEnlace", "urlEnlace"]);
  const formulario = leer("components/FormIngreso.jsx");
  assert.match(formulario, /<select\s+id=\{`\$\{id\}-cuatrimestre`\}/);
  assert.match(formulario, /<select id=\{`\$\{id\}-anio`\}/);
  assert.doesNotMatch(formulario, /-convocatoria`\}/, "la convocatoria ya no se escribe a mano");
  assert.doesNotMatch(formulario, /\b(cargás|elegís|tenés|podés|Elegí|Completá)\b/, "sin voseo");
});

test("panel: el error de una etapa o pregunta plegada se muestra en esa fila, contando solo las filas cargadas", () => {
  const filas = [
    { clave: 7, nombre: "Curso" },
    { clave: 8, nombre: "", desde: "", detalle: "" },
    { clave: 9, nombre: "Examen" },
  ];
  const campos = ["nombre", "desde", "detalle"];
  assert.equal(filaDelError("Etapa 2: completar la fecha de inicio.", "Etapa", filas, campos), 9);
  assert.equal(filaDelError("Etapa 1: completar el nombre.", "Etapa", filas, campos), 7);
  assert.equal(filaDelError("Elegir el cuatrimestre y el año de la convocatoria.", "Etapa", filas, campos), null);
  assert.equal(filaDelError("", "Etapa", filas, campos), null);
});

test("guardar la convocatoria no toca las preguntas, y al revés", async () => {
  const { guardar, guardarPreguntas, sitio, bedelia } = await preparar();
  assert.equal((await guardarPreguntas({ preguntas: PREGUNTAS }, bedelia)).status, 403);
  assert.equal((await guardarPreguntas({ preguntas: PREGUNTAS })).status, 200);
  assert.equal((await guardar(CONVOCATORIA_2026)).status, 200);
  let { ingreso, ingresoPreguntas } = await sitio();
  assert.deepEqual(ingresoPreguntas.datos.preguntas, PREGUNTAS);
  assert.equal(ingreso.datos.convocatoria, "2.º cuatrimestre 2026");
  const otras = [{ pregunta: "¿Es presencial?", respuesta: "Sí." }];
  assert.equal((await guardarPreguntas({ preguntas: otras })).status, 200);
  ({ ingreso, ingresoPreguntas } = await sitio());
  assert.deepEqual(ingresoPreguntas.datos.preguntas, otras);
  assert.equal(ingreso.datos.etapas.length, 4, "la convocatoria sigue igual");
  // Si la convocatoria tiene un error, no se guarda nada y las preguntas siguen igual.
  assert.equal((await guardar({ ...CONVOCATORIA_2026, convocatoria: "Segundo 2026" })).status, 400);
  assert.deepEqual((await sitio()).ingresoPreguntas.datos.preguntas, otras);
});

test("compatibilidad: las preguntas guardadas antes dentro de «ingreso» se conservan y pasan a su sección", async () => {
  const repo = crearRepoContenidoMemoria();
  const PROPIAS = [{ pregunta: "¿Pregunta propia?", respuesta: "Cargada antes de separar las secciones." }];
  // Así quedó guardado en la base con la versión anterior: las preguntas dentro de la convocatoria.
  await repo.guardar("ingreso", { datos: { ...CONVOCATORIA_2026, preguntas: PROPIAS }, actualizadoPor: "Mariana" });
  const { guardar, sitio } = await preparar(repo);

  // Antes de guardar nada: el sitio muestra esas preguntas, no las iniciales, y la convocatoria no las repite.
  let { ingreso, ingresoPreguntas } = await sitio();
  assert.deepEqual(ingresoPreguntas.datos.preguntas, PROPIAS);
  assert.equal(ingresoPreguntas.inicial, false);
  assert.equal("preguntas" in ingreso.datos, false);

  // Al guardar la convocatoria, primero se pasan las preguntas a su sección: no se pierden.
  assert.equal((await guardar(CONVOCATORIA_2026)).status, 200);
  const guardadas = new Map((await repo.listar()).map((r) => [r.clave, r]));
  assert.deepEqual(guardadas.get("ingresoPreguntas").datos.preguntas, PROPIAS);
  assert.equal("preguntas" in guardadas.get("ingreso").datos, false);
  ({ ingresoPreguntas } = await sitio());
  assert.deepEqual(ingresoPreguntas.datos.preguntas, PROPIAS);
});

test("compatibilidad: si pasar las preguntas falla, la convocatoria no se guarda y nada se reemplaza", async () => {
  const repo = crearRepoContenidoMemoria();
  const PROPIAS = [{ pregunta: "¿Pregunta propia?", respuesta: "Sí." }];
  await repo.guardar("ingreso", { datos: { ...CONVOCATORIA_2026, preguntas: PROPIAS }, actualizadoPor: "Mariana" });
  const guardarOriginal = repo.guardar;
  repo.guardar = async (clave, registro) => {
    if (clave === "ingresoPreguntas") throw new Error("Falla de la base");
    return guardarOriginal(clave, registro);
  };
  const { guardar, sitio } = await preparar(repo);
  const res = await guardar({ ...CONVOCATORIA_2026, correo: "nuevo@bue.edu.ar" });
  assert.equal(res.status, 500);
  const { ingreso, ingresoPreguntas } = await sitio();
  assert.equal(ingreso.datos.correo, "", "la convocatoria quedó como estaba");
  assert.deepEqual(ingresoPreguntas.datos.preguntas, PROPIAS, "las preguntas siguen visibles");
});

test("si falla la consulta, el sitio no recibe los valores iniciales en lugar de lo guardado", async () => {
  const repo = crearRepoContenidoMemoria();
  repo.listar = async () => {
    throw new Error("Falla de la base");
  };
  const { app } = await preparar(repo);
  const res = await request(app).get("/api/content");
  assert.equal(res.status, 500);
  assert.equal(res.body.ingreso, undefined);
  assert.equal(res.body.ingresoPreguntas, undefined);
});

test("convocatoria anterior: cuando pasaron todas sus fechas conocidas, también los inicios sin cierre", () => {
  // La última fecha conocida es el 10/8 (confirmación de vacantes e inicio de clases), no el cierre del examen.
  assert.equal(ultimaFechaConocida(CONVOCATORIA_2026), "2026-08-10");
  const anterior = (hoy) => esConvocatoriaAnterior(CONVOCATORIA_2026, hoy);
  assert.equal(anterior("2026-07-15"), false, "preinscripción abierta");
  assert.equal(anterior("2026-08-05"), false, "curso y examen en curso");
  assert.equal(anterior("2026-08-08"), false, "todavía faltan etapas del 10/8");
  assert.equal(anterior("2026-08-10"), false, "el 10/8 inclusive");
  assert.equal(anterior("2026-08-11"), true);
  assert.equal(anterior("2026-11-02"), true);
  // Una etapa con cierre posterior a todo lo demás también cuenta.
  const conCierreTardio = conCambio({ etapas: [{ nombre: "Curso", desde: "2026-06-08", hasta: "2026-09-30", detalle: "" }] });
  assert.equal(ultimaFechaConocida(conCierreTardio), "2026-09-30");
  assert.equal(ultimaFechaConocida(VALORES_INICIALES.ingreso), "");
  assert.equal(esConvocatoriaAnterior(VALORES_INICIALES.ingreso, "2026-11-02"), false);
  // En la convocatoria anterior ninguna etapa queda en curso.
  assert.ok(cronogramaDe(CONVOCATORIA_2026, "2026-08-11").every((paso) => !paso.enCurso));
});

test("la página: preguntas de su sección, enlaces solo en la convocatoria vigente y video sin cookies", () => {
  const pagina = leer("pages/Ingreso.jsx");
  assert.match(pagina, /contenido\?\.ingresoPreguntas\?\.datos\?\.preguntas/);
  assert.doesNotMatch(pagina, /ingreso\?\.preguntas/);
  assert.match(pagina, /<Cronograma pasos=\{pasosActuales\} conEnlaces \/>/);
  assert.match(pagina, /<Cronograma pasos=\{pasos\} \/>/, "la anterior, sin enlaces");
  assert.match(pagina, /actual && preinscripcion\.tipo === "abierta"\s*\? pasos\.map/, "SIU solo con la preinscripción abierta");
  assert.match(pagina, /videoDeYoutube\(direccion\)/);
  assert.match(pagina, /loading="lazy"/);
  assert.doesNotMatch(pagina, /dangerouslySetInnerHTML/);
  assert.match(leer("ingreso.js"), /youtube-nocookie\.com\/embed/);
});

test("la página: la próxima arriba y la anterior debajo, visible y sin botón de preinscripción", () => {
  const pagina = leer("pages/Ingreso.jsx");
  assert.match(pagina, /esConvocatoriaAnterior\(ingreso\)/);
  assert.match(pagina, /Convocatoria anterior: <span>\{ingreso\.convocatoria\}<\/span>/);
  assert.match(pagina, /\{actual && preinscripcion\.tipo === "abierta" &&/);
  assert.doesNotMatch(pagina, /<details[^>]*convocatoria-anterior/, "la anterior no va plegada");
});
