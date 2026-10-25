import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { ADMIN, BEDELIA, appDePrueba, tokenDe } from "./ayuda.js";
import { compararConPublicado, validarHorario } from "../src/services/academica.js";
import { columnasHorarios } from "../src/services/academica.pdf.js";

const con = (req, token) => req.set("Authorization", `Bearer ${token}`);

// Datos de ejemplo tomados de la planilla del instituto (1.° cuatrimestre 2026).
const HORARIO = {
  cicloLectivo: 2026,
  cuatrimestre: 1,
  anioCarrera: 1,
  turno: "noche",
  materia: "Seguridad e higiene en la Gastronomía",
  profesor: "Miguel Colloca",
  aula: "",
  dias: [{ dia: "lunes", desde: "18:00", hasta: "20:00" }],
};
const OTRA = { ...HORARIO, anioCarrera: 2, materia: "Taller de Informática", profesor: "" };

// App de prueba con la sesión del perfil indicado y un atajo para llamar a la API con ese token.
async function panel(perfil = ADMIN, dependencias = {}) {
  const { app } = await appDePrueba(dependencias);
  const token = await tokenDe(app, perfil);
  const llamar = (metodo, ruta, cuerpo) => {
    const req = con(request(app)[metodo](`/api/academic${ruta}`), token);
    return cuerpo === undefined ? req : req.send(cuerpo);
  };
  const publico = (ruta) => request(app).get(`/api/academic${ruta}`);
  return { app, llamar, publico };
}

// Lo que ven los alumnos de un período: la lista de materias publicadas, o null si no está publicado.
async function loPublicado(publico, periodo = "2026-1") {
  const res = await publico("/vigente");
  return res.body.periodos.find((p) => p.periodo === periodo)?.horarios ?? null;
}

// ---------- Reglas básicas ----------

test("validarHorario: controles básicos con mensajes claros", () => {
  const casos = [
    [{ ...HORARIO, materia: " " }, /Completá la materia/],
    [{ ...HORARIO, anioCarrera: 4 }, /año de la carrera/],
    [{ ...HORARIO, cuatrimestre: 3 }, /cuatrimestre/],
    [{ ...HORARIO, turno: "madrugada" }, /turno/],
    [{ ...HORARIO, dias: [] }, /al menos un día/],
    [{ ...HORARIO, dias: [{ dia: "feriado", desde: "18:00", hasta: "20:00" }] }, /día de cursada que no es válido/],
    [{ ...HORARIO, dias: [{ dia: "lunes", desde: "18", hasta: "20:00" }] }, /formato 18:00/],
    [{ ...HORARIO, dias: [{ dia: "lunes", desde: "20:00", hasta: "18:00" }] }, /terminar después de empezar/],
  ];
  for (const [cuerpo, esperado] of casos) assert.match(validarHorario(cuerpo).error, esperado);

  const repetido = [
    { dia: "lunes", desde: "18:00", hasta: "20:00" },
    { dia: "lunes", desde: "18:00", hasta: "20:00" },
  ];
  assert.match(validarHorario({ ...HORARIO, dias: repetido }).error, /repetido con el mismo horario/);
});

test("validarHorario: acepta varias franjas el mismo día y cualquier día de la semana", () => {
  const dias = [
    { dia: "domingo", desde: "10:00", hasta: "12:00" },
    { dia: "lunes", desde: "20:00", hasta: "21:00" },
    { dia: "lunes", desde: "18:00", hasta: "19:00" },
  ];
  const { datos, error } = validarHorario({ ...HORARIO, dias });
  assert.equal(error, undefined);
  assert.deepEqual(
    datos.dias.map((f) => `${f.dia} ${f.desde}`),
    ["lunes 18:00", "lunes 20:00", "domingo 10:00"],
  );
});

test("validarHorario: docente y aula son opcionales, y los días quedan ordenados", () => {
  const dias = [
    { dia: "jueves", desde: "18:00", hasta: "20:00" },
    { dia: "lunes", desde: "20:00", hasta: "22:00" },
  ];
  const { datos, error } = validarHorario({ ...HORARIO, profesor: "", aula: "", cicloLectivo: "2026", dias });
  assert.equal(error, undefined);
  assert.equal(datos.cicloLectivo, 2026);
  assert.deepEqual(
    datos.dias.map((f) => f.dia),
    ["lunes", "jueves"],
  );
});

test("compararConPublicado: detecta lo que se agrega, lo que se quita y cada campo que cambió", () => {
  const publicados = [
    { id: "1", ...HORARIO },
    { id: "2", ...OTRA },
  ];
  const trabajo = [
    { id: "1", ...HORARIO, profesor: "Ana Gómez", aula: "Aula 3" },
    { id: "3", ...HORARIO, materia: "Nutrición" },
  ];
  const cambios = compararConPublicado(trabajo, publicados);
  assert.deepEqual(
    cambios.map((c) => [c.materia, c.cambio, c.publicado, c.guardado]),
    [
      ["Nutrición", "Se agrega", undefined, undefined],
      ["Seguridad e higiene en la Gastronomía", "Docente", "Miguel Colloca", "Ana Gómez"],
      ["Seguridad e higiene en la Gastronomía", "Aula", "—", "Aula 3"],
      ["Taller de Informática", "Se quita del sitio", undefined, undefined],
    ],
  );
  assert.deepEqual(compararConPublicado(publicados, publicados), []);
});

// ---------- Permisos ----------

test("las rutas del panel exigen sesión (401) y las usan Administrador y Bedelía", async () => {
  const { app } = await appDePrueba();
  const rutas = [
    ["get", "/periodos"],
    ["get", "/periodos/2026-1"],
    ["post", "/horarios"],
    ["put", "/horarios/1"],
    ["delete", "/horarios/1"],
    ["post", "/periodos/2026-1/reutilizar"],
    ["post", "/periodos/2026-1/publicar"],
    ["post", "/periodos/2026-1/retirar"],
    ["get", "/periodos/2026-1/vista-previa.pdf"],
  ];
  for (const [metodo, ruta] of rutas) {
    assert.equal((await request(app)[metodo](`/api/academic${ruta}`)).status, 401, `${metodo} ${ruta}`);
  }

  for (const perfil of [ADMIN, BEDELIA]) {
    const { llamar } = await panel(perfil);
    assert.equal((await llamar("post", "/horarios", HORARIO)).status, 201);
    assert.equal((await llamar("post", "/periodos/2026-1/publicar")).status, 200);
  }
});

// ---------- Datos de trabajo ----------

test("agregar, corregir y eliminar una materia; corregir no cambia el período", async () => {
  const { llamar } = await panel();
  const alta = await llamar("post", "/horarios", HORARIO);
  assert.equal(alta.status, 201);
  const { id } = alta.body.horario;

  const edicion = await llamar("put", `/horarios/${id}`, { ...HORARIO, cicloLectivo: 2030, profesor: "Ana Gómez" });
  assert.equal(edicion.status, 200);
  assert.equal(edicion.body.horario.profesor, "Ana Gómez");
  assert.equal(edicion.body.horario.cicloLectivo, 2026);

  assert.equal((await llamar("put", `/horarios/${id}`, { ...HORARIO, materia: "" })).status, 400);
  assert.equal((await llamar("put", "/horarios/999", HORARIO)).status, 404);
  assert.equal((await llamar("post", "/horarios", { ...HORARIO, turno: "x" })).status, 400);

  assert.equal((await llamar("delete", `/horarios/${id}`)).status, 204);
  assert.equal((await llamar("delete", `/horarios/${id}`)).status, 404);
});

// ---------- Publicar, actualizar y retirar ----------

test("guardar no cambia lo publicado: los alumnos ven la versión anterior hasta actualizar", async () => {
  const { llamar, publico } = await panel();
  const { id } = (await llamar("post", "/horarios", HORARIO)).body.horario;
  assert.equal(await loPublicado(publico), null);

  const publicacion = await llamar("post", "/periodos/2026-1/publicar");
  assert.equal(publicacion.status, 200);
  assert.equal(publicacion.body.publicado, true);
  assert.ok(publicacion.body.publicadoEn);

  await llamar("put", `/horarios/${id}`, { ...HORARIO, profesor: "Ana Gómez" });
  assert.equal((await loPublicado(publico))[0].profesor, "Miguel Colloca");

  const resumen = await llamar("get", "/periodos/2026-1");
  assert.deepEqual(
    resumen.body.cambios.map((c) => [c.cambio, c.publicado, c.guardado]),
    [["Docente", "Miguel Colloca", "Ana Gómez"]],
  );

  const actualizacion = await llamar("post", "/periodos/2026-1/publicar");
  assert.deepEqual(actualizacion.body.cambios, []);
  assert.equal((await loPublicado(publico))[0].profesor, "Ana Gómez");
});

test("publicar un período sin materias no se puede; un período mal escrito da 400", async () => {
  const { llamar } = await panel();
  const vacio = await llamar("post", "/periodos/2026-1/publicar");
  assert.equal(vacio.status, 400);
  assert.match(vacio.body.error, /no tiene horarios cargados/);
  assert.equal((await llamar("post", "/periodos/2026-3/publicar")).status, 400);
  assert.equal((await llamar("get", "/periodos/26-1")).status, 400);
});

test("eliminar una materia publicada: sigue en el sitio hasta actualizar la publicación", async () => {
  const { llamar, publico } = await panel();
  const { id } = (await llamar("post", "/horarios", HORARIO)).body.horario;
  await llamar("post", "/horarios", OTRA);
  await llamar("post", "/periodos/2026-1/publicar");

  await llamar("delete", `/horarios/${id}`);
  assert.equal((await loPublicado(publico)).length, 2);
  const resumen = await llamar("get", "/periodos/2026-1");
  assert.deepEqual(
    resumen.body.cambios.map((c) => [c.materia, c.cambio]),
    [[HORARIO.materia, "Se quita del sitio"]],
  );

  await llamar("post", "/periodos/2026-1/publicar");
  assert.deepEqual(
    (await loPublicado(publico)).map((h) => h.materia),
    [OTRA.materia],
  );
});

test("retirar: los alumnos dejan de verlo, no se borra nada y volver a publicar toma lo último guardado", async () => {
  const { llamar, publico } = await panel();
  const { id } = (await llamar("post", "/horarios", HORARIO)).body.horario;
  assert.equal((await llamar("post", "/periodos/2026-1/retirar")).status, 409);
  await llamar("post", "/periodos/2026-1/publicar");

  const retiro = await llamar("post", "/periodos/2026-1/retirar");
  assert.equal(retiro.status, 200);
  assert.equal(retiro.body.publicado, false);
  assert.equal(retiro.body.horarios.length, 1);
  assert.equal(await loPublicado(publico), null);
  assert.equal((await llamar("post", "/periodos/2026-1/retirar")).status, 409);

  await llamar("put", `/horarios/${id}`, { ...HORARIO, profesor: "Ana Gómez" });
  await llamar("post", "/periodos/2026-1/publicar");
  assert.equal((await loPublicado(publico))[0].profesor, "Ana Gómez");
});

test("selector de períodos: del más reciente al más antiguo, con cantidad, estado y cambios", async () => {
  const { llamar } = await panel();
  await llamar("post", "/horarios", HORARIO);
  await llamar("post", "/horarios", { ...HORARIO, cuatrimestre: 2 });
  await llamar("post", "/periodos/2026-1/publicar");
  await llamar("post", "/horarios", OTRA);

  const res = await llamar("get", "/periodos");
  assert.deepEqual(
    res.body.periodos.map((p) => [p.periodo, p.materias, p.publicado, p.hayCambios]),
    [
      ["2026-2", 1, false, false],
      ["2026-1", 2, true, true],
    ],
  );
});

// ---------- Reutilizar ----------

test("reutilizar: trae todas las materias como datos de trabajo y no publica nada", async () => {
  const { llamar, publico } = await panel();
  await llamar("post", "/horarios", HORARIO);
  await llamar("post", "/horarios", OTRA);

  const res = await llamar("post", "/periodos/2027-1/reutilizar", { origen: "2026-1" });
  assert.equal(res.status, 201);
  assert.deepEqual(res.body, { agregadas: 2, yaEstaban: 0 });

  const destino = (await llamar("get", "/periodos/2027-1")).body;
  assert.equal(destino.horarios.length, 2);
  assert.ok(destino.horarios.every((h) => h.cicloLectivo === 2027 && h.origenId));
  assert.equal(destino.publicado, false);
  assert.equal(await loPublicado(publico, "2027-1"), null);
});

test("reutilizar dos veces no duplica, aunque se haya cambiado el nombre de una materia", async () => {
  const { llamar } = await panel();
  await llamar("post", "/horarios", HORARIO);
  await llamar("post", "/horarios", OTRA);
  await llamar("post", "/periodos/2027-1/reutilizar", { origen: "2026-1" });

  const traida = (await llamar("get", "/periodos/2027-1")).body.horarios.find((h) => h.materia === OTRA.materia);
  await llamar("put", `/horarios/${traida.id}`, { ...OTRA, materia: "Informática aplicada" });

  const otraVez = await llamar("post", "/periodos/2027-1/reutilizar", { origen: "2026-1" });
  assert.equal(otraVez.status, 200);
  assert.deepEqual(otraVez.body, { agregadas: 0, yaEstaban: 2 });
  assert.equal((await llamar("get", "/periodos/2027-1")).body.horarios.length, 2);
});

test("reutilizar reconoce una materia cargada a mano con los mismos datos", async () => {
  const { llamar } = await panel();
  await llamar("post", "/horarios", HORARIO);
  await llamar("post", "/horarios", OTRA);
  const aMano = { ...HORARIO, cicloLectivo: 2027, materia: "  seguridad e HIGIENE en la gastronomía" };
  await llamar("post", "/horarios", aMano);

  const res = await llamar("post", "/periodos/2027-1/reutilizar", { origen: "2026-1" });
  assert.deepEqual(res.body, { agregadas: 1, yaEstaban: 1 });
});

test("reutilizar trae las dos comisiones de una materia que se dicta dos veces en el mismo turno", async () => {
  const { llamar } = await panel();
  await llamar("post", "/horarios", HORARIO);
  const jueves = [{ dia: "jueves", desde: "18:00", hasta: "20:00" }];
  const otraComision = { ...HORARIO, profesor: "Ana Gómez", dias: jueves };
  await llamar("post", "/horarios", otraComision);

  const res = await llamar("post", "/periodos/2027-1/reutilizar", { origen: "2026-1" });
  assert.deepEqual(res.body, { agregadas: 2, yaEstaban: 0 });
});

test("reutilizar no confunde dos comisiones con el mismo horario y distinto docente", async () => {
  const { llamar } = await panel();
  await llamar("post", "/horarios", HORARIO);
  await llamar("post", "/horarios", { ...HORARIO, profesor: "Ana Gómez" });
  await llamar("post", "/horarios", { ...HORARIO, cicloLectivo: 2027, profesor: "Ana Gómez" });

  const res = await llamar("post", "/periodos/2027-1/reutilizar", { origen: "2026-1" });
  assert.deepEqual(res.body, { agregadas: 1, yaEstaban: 1 });
  const docentes = (await llamar("get", "/periodos/2027-1")).body.horarios.map((h) => h.profesor).sort();
  assert.deepEqual(docentes, ["Ana Gómez", "Miguel Colloca"]);
});

test("reutilizar: el mismo período da 400 y un período sin materias da 404", async () => {
  const { llamar } = await panel();
  assert.equal((await llamar("post", "/periodos/2027-1/reutilizar", { origen: "2027-1" })).status, 400);
  assert.equal((await llamar("post", "/periodos/2027-1/reutilizar", {})).status, 400);
  const vacio = await llamar("post", "/periodos/2027-1/reutilizar", { origen: "2026-1" });
  assert.equal(vacio.status, 404);
  assert.match(vacio.body.error, /1.° cuatrimestre 2026 no tiene horarios cargados/);
});

// ---------- PDF ----------

// Pide un PDF y devuelve la respuesta con el contenido como Buffer.
const comoPdf = (req) => req.responseType("blob");

// Los metadatos del PDF (por ejemplo, el título) se guardan como texto común o en UTF-16 si tienen tildes.
const tieneMetadato = (pdf, texto) =>
  pdf.includes(Buffer.from(texto, "latin1")) || pdf.includes(Buffer.from(texto, "utf16le").swap16());

test("PDF público: sale de lo publicado, no de los datos de trabajo", async () => {
  const { llamar, publico } = await panel();
  const { id } = (await llamar("post", "/horarios", HORARIO)).body.horario;
  assert.equal((await publico("/vigente/horarios.pdf?periodo=2026-1")).status, 404);

  await llamar("post", "/periodos/2026-1/publicar");
  await llamar("delete", `/horarios/${id}`);

  const res = await comoPdf(publico("/vigente/horarios.pdf?periodo=2026-1"));
  assert.equal(res.status, 200);
  assert.equal(res.headers["content-type"], "application/pdf");
  assert.match(res.headers["content-disposition"], /filename="horarios-1-cuatrimestre-2026.pdf"/);
  assert.equal(res.body.subarray(0, 4).toString(), "%PDF");
  assert.ok(!tieneMetadato(res.body, "Vista previa"));

  await llamar("post", "/periodos/2026-1/retirar");
  assert.equal((await publico("/vigente/horarios.pdf?periodo=2026-1")).status, 404);
});

test("PDF público: con turno incluye solo ese turno; período o turno inválidos dan 400", async () => {
  const { llamar, publico } = await panel();
  await llamar("post", "/horarios", HORARIO);
  await llamar("post", "/periodos/2026-1/publicar");

  const noche = await comoPdf(publico("/vigente/horarios.pdf?periodo=2026-1&turno=noche"));
  assert.equal(noche.status, 200);
  assert.match(noche.headers["content-disposition"], /filename="horarios-1-cuatrimestre-2026-turno-noche.pdf"/);
  assert.equal((await publico("/vigente/horarios.pdf?periodo=2026-1&turno=manana")).status, 404);
  assert.equal((await publico("/vigente/horarios.pdf?periodo=2026-1&turno=x")).status, 400);
  assert.equal((await publico("/vigente/horarios.pdf")).status, 400);
});

test("PDF con varios turnos: cada fila indica su turno; con uno solo, el turno va en el subtítulo", async () => {
  const titulos = (lista) => columnasHorarios(lista).map((c) => c.titulo);
  const manana = { ...OTRA, turno: "manana" };
  assert.deepEqual(titulos([HORARIO, OTRA]), ["Día", "Horario", "Materia", "Docente"]);
  assert.deepEqual(titulos([HORARIO, manana]), ["Día", "Horario", "Turno", "Materia", "Docente"]);
  assert.deepEqual(titulos([{ ...HORARIO, aula: "Aula 3" }, manana]), [
    "Día",
    "Horario",
    "Turno",
    "Materia",
    "Docente",
    "Aula",
  ]);
  const anchos = columnasHorarios([HORARIO, manana]).reduce((suma, c) => suma + c.ancho, 0);
  assert.ok(Math.abs(anchos - 1) < 1e-9);

  const { llamar, publico } = await panel();
  await llamar("post", "/horarios", HORARIO);
  await llamar("post", "/horarios", manana);
  await llamar("post", "/periodos/2026-1/publicar");
  const res = await comoPdf(publico("/vigente/horarios.pdf?periodo=2026-1"));
  assert.equal(res.status, 200);
  assert.equal(res.body.subarray(0, 4).toString(), "%PDF");
});

test("PDF de vista previa: sale de los datos de trabajo, lleva la marca y exige sesión", async () => {
  const { app, llamar } = await panel(BEDELIA);
  assert.equal((await llamar("get", "/periodos/2026-1/vista-previa.pdf")).status, 404);
  await llamar("post", "/horarios", HORARIO);

  const res = await comoPdf(llamar("get", "/periodos/2026-1/vista-previa.pdf"));
  assert.equal(res.status, 200);
  assert.match(res.headers["content-disposition"], /filename="vista-previa-horarios-1-cuatrimestre-2026.pdf"/);
  assert.ok(tieneMetadato(res.body, "Vista previa — Versión de trabajo"));

  assert.equal((await request(app).get("/api/academic/periodos/2026-1/vista-previa.pdf")).status, 401);
});

test("PDF: el enlace a Contacto sale de la configuración, no del encabezado Host de la petición", async () => {
  const { llamar, publico } = await panel();
  await llamar("post", "/horarios", HORARIO);
  await llamar("post", "/periodos/2026-1/publicar");

  const res = await comoPdf(publico("/vigente/horarios.pdf?periodo=2026-1").set("Host", "sitio-falso.com"));
  const contenido = res.body.toString("latin1");
  assert.ok(contenido.includes("/URI (http://localhost:3000/contacto)"));
  assert.ok(!contenido.includes("sitio-falso.com"));
});