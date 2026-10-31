import test from "node:test";
import assert from "node:assert/strict";
// Inicio del panel: datos reales en lugar de los fijos del prototipo.
import {
  actividadReciente,
  datosDelInicio,
  textoDeHorariosPublicados,
  textoDeLlamadosPublicados,
} from "../../client/src/adminInicio.js";

const SEGUNDO_2026 = { cicloLectivo: 2026, cuatrimestre: 2, publicadoEn: "2026-08-10T13:00:00Z" };
const PRIMERO_2027 = { cicloLectivo: 2027, cuatrimestre: 1, publicadoEn: "2027-02-20T13:00:00Z" };

const evento = (id, titulo, origen, createdAt) => ({ id, titulo, origen, createdAt, estado: "visible" });

test("horarios publicados: ninguno, uno y dos períodos a la vez", () => {
  assert.deepEqual(textoDeHorariosPublicados([]), ["Sin horarios publicados"]);
  assert.deepEqual(textoDeHorariosPublicados(), ["Sin horarios publicados"]);
  assert.deepEqual(textoDeHorariosPublicados([SEGUNDO_2026]), ["2.° cuatrimestre 2026"]);
  assert.deepEqual(textoDeHorariosPublicados([PRIMERO_2027, SEGUNDO_2026]), ["1.° cuatrimestre 2027", "2.° cuatrimestre 2026"]);
});

test("actividad reciente: textos según el origen, orden por fecha y fecha en Argentina", () => {
  const items = actividadReciente({
    eventos: [
      evento("a", "Mateada", "manual", "2026-10-20T15:00:00Z"),
      evento("b", "Clase abierta", "instagram", "2026-10-31T02:30:00Z"),
    ],
    periodos: [SEGUNDO_2026],
  });
  assert.deepEqual(
    items.map((i) => `${i.accion} ${i.detalle} (${i.fecha})`),
    [
      // 02:30 UTC del 31/10 es el 30/10 en Argentina.
      "Se incorporó desde Instagram el evento Clase abierta (30/10/2026)",
      "Se cargó el evento Mateada (20/10/2026)",
      "Se publicaron los horarios del 2.° cuatrimestre 2026 (10/08/2026)",
    ],
  );
  // Nunca dice "publicó" para un evento: puede estar oculto.
  assert.ok(items.every((i) => !/publicó el evento/.test(i.accion)));
});

test("actividad reciente: como máximo cinco, sin fechas inválidas y sin título", () => {
  const muchos = Array.from({ length: 7 }, (_, n) => evento(String(n), `Evento ${n}`, "manual", `2026-10-0${n + 1}T12:00:00Z`));
  const items = actividadReciente({ eventos: [...muchos, evento("x", "", "manual", "fecha mala"), evento("y", "Sin fecha", "manual")] });
  assert.equal(items.length, 5);
  assert.deepEqual(items.map((i) => i.detalle), ["Evento 6", "Evento 5", "Evento 4", "Evento 3", "Evento 2"]);
  assert.equal(actividadReciente({ eventos: [evento("z", "", "manual", "2026-10-01T12:00:00Z")] })[0].detalle, "sin título");
  assert.deepEqual(actividadReciente(), []);
});

test("inicio del administrador: mientras carga, con datos y con errores", () => {
  const cargando = datosDelInicio({ esAdmin: true, eventos: null, vigente: null });
  assert.equal(cargando.eventosVisibles, "…");
  assert.equal(cargando.actividad.estado, "cargando");

  const conDatos = datosDelInicio({
    esAdmin: true,
    eventos: { ok: true, datos: { eventos: [evento("a", "Mateada", "manual", "2026-10-20T15:00:00Z")], conteos: { visible: 4, oculto: 2 } } },
    vigente: { ok: true, datos: { periodos: [SEGUNDO_2026] } },
  });
  assert.equal(conDatos.eventosVisibles, 4);
  assert.deepEqual(conDatos.horariosPublicados, ["2.° cuatrimestre 2026"]);
  assert.equal(conDatos.actividad.estado, "lista");
  assert.equal(conDatos.actividad.items.length, 2);

  const sinEventos = datosDelInicio({
    esAdmin: true,
    eventos: { ok: true, datos: { eventos: [], conteos: { visible: 0 } } },
    vigente: { ok: true, datos: { periodos: [] } },
  });
  assert.equal(sinEventos.eventosVisibles, 0);
  assert.deepEqual(sinEventos.horariosPublicados, ["Sin horarios publicados"]);
  assert.equal(sinEventos.actividad.estado, "vacia");

  // Un error no se muestra como cero ni como lista vacía.
  const conError = datosDelInicio({ esAdmin: true, eventos: { ok: false }, vigente: { ok: true, datos: { periodos: [SEGUNDO_2026] } } });
  assert.equal(conError.eventosVisibles, "No disponible");
  assert.deepEqual(conError.horariosPublicados, ["2.° cuatrimestre 2026"]);
  assert.equal(conError.actividad.estado, "error");
});

test("inicio de Bedelía: solo horarios, sin esperar ni usar los eventos", () => {
  const datos = datosDelInicio({ esAdmin: false, eventos: null, vigente: { ok: true, datos: { periodos: [SEGUNDO_2026] } } });
  assert.equal(datos.actividad.estado, "lista");
  assert.deepEqual(datos.actividad.items.map((i) => i.detalle), ["2.° cuatrimestre 2026"]);
  assert.equal(datosDelInicio({ esAdmin: false, eventos: null, vigente: { ok: false } }).horariosPublicados[0], "No disponible");
});

// ---------- Mesas de examen (#33) ----------

const FEBRERO = { id: "l1", nombre: "Febrero 2027", publicadoEn: "2026-11-02T13:00:00Z", mesas: [] };

test("llamados publicados: ninguno o los nombres (también los anuncios sin mesas)", () => {
  assert.deepEqual(textoDeLlamadosPublicados([]), ["Sin llamados publicados"]);
  assert.deepEqual(textoDeLlamadosPublicados(), ["Sin llamados publicados"]);
  assert.deepEqual(textoDeLlamadosPublicados([FEBRERO, { ...FEBRERO, id: "l2", nombre: "Julio 2026" }]), [
    "Febrero 2027",
    "Julio 2026",
  ]);
});

test("actividad reciente: 'Se publicó el llamado', en orden con eventos y horarios", () => {
  const items = actividadReciente({
    eventos: [evento("a", "Mateada", "manual", "2026-10-20T15:00:00Z")],
    periodos: [SEGUNDO_2026],
    llamados: [FEBRERO],
  });
  assert.deepEqual(
    items.map((i) => `${i.accion} ${i.detalle}`),
    ["Se publicó el llamado Febrero 2027", "Se cargó el evento Mateada", "Se publicaron los horarios del 2.° cuatrimestre 2026"],
  );
});

test("inicio: los llamados salen de la misma consulta que los horarios, también para Bedelía", () => {
  const vigente = { ok: true, datos: { periodos: [], llamados: [FEBRERO] } };
  const bedelia = datosDelInicio({ esAdmin: false, eventos: null, vigente });
  assert.deepEqual(bedelia.llamadosPublicados, ["Febrero 2027"]);
  assert.deepEqual(bedelia.actividad.items.map((i) => i.detalle), ["Febrero 2027"]);
  assert.deepEqual(datosDelInicio({ esAdmin: false, eventos: null, vigente: null }).llamadosPublicados, ["…"]);
  assert.deepEqual(datosDelInicio({ esAdmin: false, eventos: null, vigente: { ok: false } }).llamadosPublicados, [
    "No disponible",
  ]);
});
