import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import request from "supertest";
import { ADMIN, BEDELIA, appDePrueba, tokenDe } from "./ayuda.js";
import { crearRepoContenidoMemoria } from "../src/repos/contenido.memoria.js";
import { crearRepoConvocatoriasMemoria } from "../src/repos/convocatorias.memoria.js";
import { VALORES_INICIALES, pasaAlHistorial } from "../src/services/contenido.js";
import { pasosDelHistorial, textoGuardadaEl, vaciarConvocatoria } from "../../client/src/ingreso.js";

// Historial de convocatorias de ingreso (#35, PR B): cada convocatoria reemplazada se guarda completa y solo
// se consulta desde el panel.

const CONV_2026 = {
  convocatoria: "2.º cuatrimestre 2026",
  preinscripcion: { desde: "2026-06-08", hasta: "2026-07-28", detalle: "En SIU Guaraní." },
  etapas: [
    {
      nombre: "Curso de ingreso (optativo)",
      desde: "2026-06-08",
      hasta: "2026-08-07",
      detalle: "Virtual.",
      textoEnlace: "Aula virtual",
      urlEnlace: "https://aulasvirtuales.bue.edu.ar/",
    },
    { nombre: "Inicio de clases", desde: "2026-08-10", hasta: "", detalle: "", textoEnlace: "", urlEnlace: "" },
  ],
  video: "https://youtu.be/6jLOQx0zqTo",
  correo: "consultas@ejemplo.test",
};
const CONV_2027 = {
  ...CONV_2026,
  convocatoria: "1.º cuatrimestre 2027",
  preinscripcion: { desde: "2026-11-09", hasta: "2027-03-05", detalle: "En SIU Guaraní." },
  etapas: [{ ...CONV_2026.etapas[1], desde: "2027-03-16" }],
  video: "",
};

async function preparar(historial = crearRepoConvocatoriasMemoria(), contenido = crearRepoContenidoMemoria()) {
  const { app } = await appDePrueba({ contenido, convocatoriasAnteriores: historial });
  const admin = await tokenDe(app, ADMIN);
  const guardar = (datos) =>
    request(app).put("/api/content/ingreso").set("Authorization", `Bearer ${admin}`).send({ datos });
  const historialDe = (token = admin) =>
    request(app).get("/api/content/ingreso/historial").set("Authorization", `Bearer ${token}`);
  return { app, guardar, historialDe, historial };
}

test("historial: al cargar otra convocatoria, la anterior se guarda completa (sin preguntas)", async () => {
  const { guardar, historialDe } = await preparar();
  assert.equal((await guardar(CONV_2026)).status, 200);
  assert.deepEqual((await historialDe()).body.convocatorias, [], "la primera no tiene anterior");
  assert.equal((await guardar(CONV_2027)).status, 200);
  const [copia] = (await historialDe()).body.convocatorias;
  assert.equal(copia.convocatoria, "2.º cuatrimestre 2026");
  assert.deepEqual(copia.datos, CONV_2026, "fechas, etapas, aclaraciones, enlaces, video y correo");
  assert.equal("preguntas" in copia.datos, false);
  assert.match(copia.guardadaEn, /^\d{4}-\d{2}-\d{2}T/);
});

test("historial: corregir la misma convocatoria no la manda al historial; quitarla, sí", async () => {
  const { guardar, historialDe } = await preparar();
  await guardar(CONV_2026);
  await guardar({ ...CONV_2026, correo: "otro@ejemplo.test" }); // corrección
  assert.deepEqual((await historialDe()).body.convocatorias, []);
  // «Quitar convocatoria» deja nombres y aclaraciones, sin fechas: la que estaba pasa al historial.
  await guardar(vaciarConvocatoria(CONV_2026));
  const lista = (await historialDe()).body.convocatorias;
  assert.equal(lista.length, 1);
  assert.equal(lista[0].datos.correo, "otro@ejemplo.test", "se guarda la última versión de esa convocatoria");
  // El modelo sin fechas no va al historial al cargar la siguiente.
  await guardar(CONV_2027);
  assert.deepEqual(
    (await historialDe()).body.convocatorias.map((c) => c.convocatoria),
    ["2.º cuatrimestre 2026"],
  );
});

test("historial: cada convocatoria por separado, la más reciente primero, y sin cambios posteriores", async () => {
  const { guardar, historialDe } = await preparar();
  await guardar(CONV_2026);
  await guardar(CONV_2027);
  await guardar({ ...CONV_2027, convocatoria: "2.º cuatrimestre 2027", preinscripcion: { ...CONV_2027.preinscripcion, desde: "2027-06-07", hasta: "2027-07-27" } });
  const lista = (await historialDe()).body.convocatorias;
  assert.deepEqual(lista.map((c) => c.convocatoria), ["1.º cuatrimestre 2027", "2.º cuatrimestre 2026"]);
  // Lo guardado de 2026 no cambió al cargar las siguientes.
  assert.deepEqual(lista[1].datos, CONV_2026);
});

test("historial: si guardar la copia falla, la convocatoria nueva no se guarda", async () => {
  const historial = crearRepoConvocatoriasMemoria();
  const { app, guardar } = await preparar(historial);
  await guardar(CONV_2026);
  historial.guardar = async () => {
    throw new Error("Falla de la base");
  };
  assert.equal((await guardar(CONV_2027)).status, 500);
  const ingreso = (await request(app).get("/api/content")).body.ingreso.datos;
  assert.equal(ingreso.convocatoria, "2.º cuatrimestre 2026", "quedó como estaba");
});

test("historial: si la copia se guarda pero falla guardar la nueva, la vigente no aparece como anterior", async () => {
  const contenido = crearRepoContenidoMemoria();
  const { app, guardar, historialDe, historial } = await preparar(undefined, contenido);
  await guardar(CONV_2026);
  // Falla el segundo paso: guardar la convocatoria nueva (la copia de 2026 ya se guardó).
  const guardarOriginal = contenido.guardar;
  contenido.guardar = async (clave, registro) => {
    if (clave === "ingreso") throw new Error("Falla de la base");
    return guardarOriginal(clave, registro);
  };
  assert.equal((await guardar(CONV_2027)).status, 500);
  assert.equal((await request(app).get("/api/content")).body.ingreso.datos.convocatoria, "2.º cuatrimestre 2026");
  assert.equal((await historial.listar()).length, 1, "la copia quedó guardada");
  assert.deepEqual((await historialDe()).body.convocatorias, [], "pero no se muestra: sigue vigente");
  // Se corrige la vigente y después se reemplaza de verdad: el historial muestra la última versión.
  contenido.guardar = guardarOriginal;
  await guardar({ ...CONV_2026, correo: "corregido@ejemplo.test" });
  await guardar(CONV_2027);
  const lista = (await historialDe()).body.convocatorias;
  assert.deepEqual(lista.map((c) => c.convocatoria), ["2.º cuatrimestre 2026"]);
  assert.equal(lista[0].datos.correo, "corregido@ejemplo.test");
});

test("historial: solo Administración lo consulta", async () => {
  const { app, historialDe } = await preparar();
  assert.equal((await request(app).get("/api/content/ingreso/historial")).status, 401);
  assert.equal((await historialDe(await tokenDe(app, BEDELIA))).status, 403);
  assert.equal((await historialDe()).status, 200);
});

test("historial: reglas y textos del panel", () => {
  assert.equal(pasaAlHistorial(CONV_2026, CONV_2027), true);
  assert.equal(pasaAlHistorial(CONV_2026, { ...CONV_2026, correo: "" }), false, "misma convocatoria");
  assert.equal(pasaAlHistorial(VALORES_INICIALES.ingreso, CONV_2026), false, "sin convocatoria");
  assert.equal(pasaAlHistorial({ ...CONV_2026, ...vaciarConvocatoria(CONV_2026), convocatoria: "2.º cuatrimestre 2026" }, CONV_2027), false, "sin fechas");
  assert.equal(pasaAlHistorial(undefined, CONV_2026), false);
  assert.deepEqual(
    pasosDelHistorial(CONV_2026).map((p) => [p.nombre, p.fechas]),
    [
      ["Preinscripción", "Del 8 de junio al 28 de julio de 2026"],
      ["Curso de ingreso (optativo)", "Del 8 de junio al 7 de agosto de 2026"],
      ["Inicio de clases", "A partir del 10 de agosto de 2026"],
    ],
  );
  assert.equal(pasosDelHistorial({ preinscripcion: { desde: "" } })[0].fechas, "Sin fechas");
  // 3/11/2026 a las 01:00 UTC todavía es 2/11 en Argentina.
  assert.equal(textoGuardadaEl("2026-11-03T01:00:00Z"), "Guardada el 2/11/2026");
  const componente = readFileSync(new URL("../../client/src/components/HistorialConvocatorias.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(componente, /<input|<textarea|metodo: "(PUT|DELETE|PATCH)"/, "solo de consulta");
  assert.match(componente, /Al guardar una nueva convocatoria o quitar la actual, la anterior se conserva aquí para su consulta\./);
});
