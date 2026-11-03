import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import request from "supertest";
import { ADMIN, BEDELIA, appDePrueba, tokenDe } from "./ayuda.js";
import { crearRepoEventosMemoria } from "../src/repos/eventos.memoria.js";
import {
  diaEnArgentina,
  eventoArchivado,
  eventoEnElSitio,
  llamadosEnElSitio,
  periodosEnElSitio,
  sumarDias,
  ultimaFechaDelLlamado,
} from "../src/services/archivo.js";
import {
  confirmacionMostrarArchivado,
  confirmacionVolverAlArchivo,
  seccionDelEvento,
  visibleFueraDeFecha,
} from "../../client/src/eventos.js";

// Archivado por fecha (#35): lo viejo sale del sitio público sin borrarse y el panel lo sigue mostrando.

const HOY = "2026-11-03";
const leer = (ruta) => readFileSync(new URL(`../../client/src/${ruta}`, import.meta.url), "utf8");

test("fechas: siempre el día de Argentina, sin depender de la zona horaria del servidor", () => {
  // 1/1/2025 a las 01:00 UTC todavía es 31/12/2024 en Argentina.
  assert.equal(diaEnArgentina(new Date("2025-01-01T01:00:00Z")), "2024-12-31");
  assert.equal(diaEnArgentina(new Date("2025-01-01T03:00:00Z")), "2025-01-01");
  assert.equal(diaEnArgentina("no es una fecha"), null);
  assert.equal(sumarDias("2027-02-20", 30), "2027-03-22");
  assert.equal(sumarDias("2026-12-15", 30), "2027-01-14");
  assert.equal(sumarDias("2028-02-28", 1), "2028-02-29", "año bisiesto");
});

test("eventos: se archivan los de hace dos años o más; el año se mide en Argentina", () => {
  const ev = (fechaEvento, extra = {}) => ({ estado: "visible", fechaEvento, ...extra });
  assert.equal(eventoArchivado(ev("2026-03-10T15:00:00Z"), HOY), false, "año actual");
  assert.equal(eventoArchivado(ev("2025-01-01T03:00:00Z"), HOY), false, "1/1 del año anterior");
  // 1/1/2025 01:00 UTC es 31/12/2024 en Argentina: ya es de hace dos años.
  assert.equal(eventoArchivado(ev("2025-01-01T01:00:00Z"), HOY), true);
  assert.equal(eventoArchivado(ev("2024-06-01T15:00:00Z"), HOY), true);
  // El 1/1/2027, los de 2025 pasan al archivo.
  assert.equal(eventoArchivado(ev("2025-06-01T15:00:00Z"), "2026-12-31"), false);
  assert.equal(eventoArchivado(ev("2025-06-01T15:00:00Z"), "2027-01-01"), true);
  assert.equal(eventoArchivado(ev(null), HOY), false, "sin fecha válida no se archiva");
  assert.equal(eventoArchivado(ev("cualquier cosa"), HOY), false);
});

test("eventos: lo oculto a mano tiene prioridad; visibleSiempre solo muestra un archivado visible", () => {
  const viejo = { fechaEvento: "2023-05-01T15:00:00Z" };
  assert.equal(eventoEnElSitio({ ...viejo, estado: "visible" }, HOY), false, "archivado");
  assert.equal(eventoEnElSitio({ ...viejo, estado: "visible", visibleSiempre: true }, HOY), true);
  assert.equal(eventoEnElSitio({ ...viejo, estado: "oculto", visibleSiempre: true }, HOY), false, "oculto gana");
  assert.equal(eventoEnElSitio({ estado: "oculto", fechaEvento: "2026-05-01T15:00:00Z" }, HOY), false);
  assert.equal(eventoEnElSitio({ estado: "archivado", fechaEvento: "2026-05-01T15:00:00Z" }, HOY), false);
});

test("horarios: los publicados del año actual y el más reciente de todos, si sigue publicado", () => {
  const p = (cicloLectivo, cuatrimestre, publicado = true) => ({ cicloLectivo, cuatrimestre, publicado });
  const codigos = (lista, hoy = HOY) => periodosEnElSitio(lista, hoy).map((x) => `${x.cicloLectivo}-${x.cuatrimestre}`);
  assert.deepEqual(codigos([p(2026, 1), p(2026, 2), p(2025, 2)]), ["2026-1", "2026-2"]);
  // En marzo de 2027, antes de publicar el 1.º cuatrimestre, sigue el último de 2026: Alumnos nunca queda vacía.
  assert.deepEqual(codigos([p(2026, 1), p(2026, 2)], "2027-03-01"), ["2026-2"]);
  // Si se retira el más reciente, no reaparece uno anterior ya archivado: Alumnos queda sin horarios hasta que
  // Bedelía publique (corrección de la revisión).
  assert.deepEqual(codigos([p(2026, 1), p(2026, 2, false)], "2027-03-01"), []);
  // En cambio, los del año actual siguen aunque se retire otro.
  assert.deepEqual(codigos([p(2026, 1), p(2026, 2, false)], HOY), ["2026-1"]);
  // Volver a publicar un período viejo no lo muestra si hay uno más reciente.
  assert.deepEqual(codigos([p(2024, 1), p(2026, 2)]), ["2026-2"]);
  assert.deepEqual(codigos([]), []);
});

test("mesas: un llamado sale del sitio a los 31 días de su última fecha; el más reciente queda si sigue publicado", () => {
  assert.equal(ultimaFechaDelLlamado({ desde: "2026-07-20", hasta: "2026-07-31", mesas: [{ fecha: "2026-08-04" }, { fecha: "" }] }), "2026-08-04");
  assert.equal(ultimaFechaDelLlamado({ desde: "", hasta: "", mesas: [{ fecha: "" }] }), "");
  // Sin «hasta» ni fechas de mesas, cuenta el «desde» (corrección de la revisión).
  assert.equal(ultimaFechaDelLlamado({ desde: "2025-06-10", hasta: "", mesas: [] }), "2025-06-10");

  // Registros como los guarda el repositorio: datos de trabajo y copia publicada.
  const ll = (id, desde, hasta, mesas = [], publicado = true) => ({
    id,
    publicacion: {
      publicado,
      publicadoEn: new Date("2026-06-01T15:00:00Z"),
      nombre: id,
      desde,
      hasta,
      aviso: "",
      mesas: mesas.map((fecha, i) => ({ mesaId: `${id}${i}`, fecha, hora: "18:00", anioCarrera: 1, materia: "M" })),
    },
  });
  const ids = (lista, hoy) => llamadosEnElSitio(lista, hoy).map((l) => l.id);
  const lista = [
    ll("diciembre", "2026-12-01", "2026-12-12"),
    ll("julio", "2026-07-20", "2026-07-31", ["2026-08-04"]), // última fecha + 30 días = 3/9
    ll("anuncio-sin-fechas", "", ""),
    ll("junio-2025-solo-desde", "2025-06-10", ""),
  ];
  assert.deepEqual(ids(lista, "2026-09-03"), ["diciembre", "julio", "anuncio-sin-fechas"], "día 30: julio todavía se ve");
  assert.deepEqual(ids(lista, "2026-09-04"), ["diciembre", "anuncio-sin-fechas"], "día 31: archivado; sin fechas no se archiva");
  // El más reciente se ve aunque hayan pasado los 30 días (no hay uno posterior).
  assert.deepEqual(ids([ll("viejo", "2025-03-01", "2025-03-10")], HOY), ["viejo"]);
  // Si se retira el más reciente, no reaparece el anterior ya archivado (corrección de la revisión).
  const conDiciembreRetirado = [ll("diciembre", "2026-12-01", "2026-12-12", [], false), ...lista.slice(1)];
  assert.deepEqual(ids(conDiciembreRetirado, HOY), ["anuncio-sin-fechas"]);
});

// ---------- Rutas ----------

const EVENTOS = [
  { id: "1", titulo: "Muestra 2026", descripcion: "x", estado: "visible", fechaEvento: "2026-06-01T15:00:00Z" },
  { id: "2", titulo: "Feria 2025", descripcion: "x", estado: "visible", fechaEvento: "2025-09-01T15:00:00Z" },
  { id: "3", titulo: "Jornada 2024", descripcion: "x", estado: "visible", fechaEvento: "2024-09-01T15:00:00Z" },
  { id: "4", titulo: "Error 2023", descripcion: "x", estado: "oculto", fechaEvento: "2023-09-01T15:00:00Z" },
];

async function preparar(dia = HOY) {
  const { app } = await appDePrueba({ eventos: crearRepoEventosMemoria(EVENTOS), hoy: () => dia });
  const admin = await tokenDe(app, ADMIN);
  const bedelia = await tokenDe(app, BEDELIA);
  const con = (req, token = admin) => req.set("Authorization", `Bearer ${token}`);
  return { app, admin, bedelia, con };
}

test("eventos: el sitio no muestra lo archivado, ni en la lista ni por enlace directo; el panel sí", async () => {
  const { app, con } = await preparar();
  const sitio = (await request(app).get("/api/events")).body.eventos.map((e) => e.titulo);
  assert.deepEqual(sitio.sort(), ["Feria 2025", "Muestra 2026"]);
  assert.equal((await request(app).get("/api/events/3")).status, 404, "enlace guardado a un evento archivado");
  const panel = (await con(request(app).get("/api/events/admin"))).body;
  assert.deepEqual(
    panel.eventos.map((e) => [e.titulo, e.archivado]).sort(),
    [["Error 2023", true], ["Feria 2025", false], ["Jornada 2024", true], ["Muestra 2026", false]],
  );
  assert.equal(panel.conteos.enElSitio, 2);
  assert.equal("visibleSiempre" in (await request(app).get("/api/events/1")).body.evento, false);
});

test("eventos: «Mostrar en el sitio» con visibleSiempre; un oculto no aparece por esa vía", async () => {
  const { app, con, bedelia } = await preparar();
  const patch = (id, cuerpo, token) => con(request(app).patch(`/api/events/${id}/visible-siempre`), token).send(cuerpo);
  assert.equal((await patch("3", { visibleSiempre: true }, bedelia)).status, 403);
  assert.equal((await patch("3", { visibleSiempre: "si" })).status, 400);
  assert.equal((await patch("99", { visibleSiempre: true })).status, 404);
  const res = await patch("3", { visibleSiempre: true });
  assert.equal(res.status, 200);
  assert.equal(res.body.evento.archivado, true, "sigue siendo de hace dos años");
  assert.equal((await request(app).get("/api/events/3")).status, 200, "ahora se ve en el sitio");
  // El oculto con visibleSiempre sigue sin verse: ocultar a mano tiene prioridad.
  await patch("4", { visibleSiempre: true });
  assert.equal((await request(app).get("/api/events/4")).status, 404);
  // Mostrarlo es una decisión expresa: estado y visibleSiempre se guardan juntos, en una sola actualización.
  assert.equal((await patch("4", { visibleSiempre: false, mostrar: true })).status, 400);
  const mostrado = await patch("4", { visibleSiempre: true, mostrar: true });
  assert.equal(mostrado.status, 200);
  assert.deepEqual([mostrado.body.evento.estado, mostrado.body.evento.visibleSiempre], ["visible", true]);
  assert.equal((await request(app).get("/api/events/4")).status, 200);
  // Volver al archivo.
  await patch("3", { visibleSiempre: false });
  assert.equal((await request(app).get("/api/events/3")).status, 404);
});

test("eventos: el 1/1 los del año anterior al pasado salen solos del sitio, sin tocar la base", async () => {
  const { app } = await preparar("2027-01-01");
  const sitio = (await request(app).get("/api/events")).body.eventos.map((e) => e.titulo);
  assert.deepEqual(sitio, ["Muestra 2026"]);
});

async function panelAcademico(dia) {
  const { app } = await appDePrueba({ hoy: () => dia });
  const token = await tokenDe(app, BEDELIA);
  const llamar = (metodo, ruta, cuerpo) => {
    const req = request(app)[metodo](`/api/academic${ruta}`).set("Authorization", `Bearer ${token}`);
    return cuerpo === undefined ? req : req.send(cuerpo);
  };
  return { app, llamar, publico: (ruta) => request(app).get(`/api/academic${ruta}`) };
}

const materia = (cicloLectivo, cuatrimestre) => ({
  cicloLectivo,
  cuatrimestre,
  anioCarrera: 1,
  turno: "noche",
  materia: "Nutrición",
  profesor: "",
  aula: "",
  dias: [{ dia: "lunes", desde: "18:00", hasta: "19:20" }],
});

test("horarios: Alumnos y su PDF no muestran períodos archivados; Bedelía los ve marcados en el panel", async () => {
  const { llamar, publico } = await panelAcademico(HOY);
  for (const [c, q] of [[2025, 2], [2026, 1], [2026, 2]]) {
    await llamar("post", "/horarios", materia(c, q));
    assert.equal((await llamar("post", `/periodos/${c}-${q}/publicar`)).status, 200);
  }
  const vigentes = (await publico("/vigente")).body.periodos.map((p) => p.periodo);
  assert.deepEqual(vigentes, ["2026-2", "2026-1"]);
  assert.equal((await publico("/vigente/horarios.pdf?periodo=2025-2")).status, 404, "sin PDF público");
  assert.equal((await publico("/vigente/horarios.pdf?periodo=2026-2")).status, 200);
  const enPanel = (await llamar("get", "/periodos")).body.periodos.map((p) => [p.periodo, p.archivado]);
  assert.deepEqual(enPanel, [["2026-2", false], ["2026-1", false], ["2025-2", true]]);
  assert.equal((await llamar("get", "/periodos/2025-2")).body.archivado, true);
  assert.equal((await llamar("get", "/periodos/2025-2/vista-previa.pdf")).status, 200, "la vista previa sigue");
  // Si se retira el último, sigue el otro del año actual.
  await llamar("post", "/periodos/2026-2/retirar");
  assert.deepEqual((await publico("/vigente")).body.periodos.map((p) => p.periodo), ["2026-1"]);
});

test("horarios: retirar el más reciente no hace reaparecer un período archivado", async () => {
  // En marzo de 2027, antes de publicar el 1.º cuatrimestre: solo se ve el último de 2026.
  const { llamar, publico } = await panelAcademico("2027-03-01");
  for (const [c, q] of [[2026, 1], [2026, 2]]) {
    await llamar("post", "/horarios", materia(c, q));
    await llamar("post", `/periodos/${c}-${q}/publicar`);
  }
  assert.deepEqual((await publico("/vigente")).body.periodos.map((p) => p.periodo), ["2026-2"]);
  await llamar("post", "/periodos/2026-2/retirar");
  assert.deepEqual((await publico("/vigente")).body.periodos, [], "no vuelve el 1.º cuatrimestre 2026");
  assert.equal((await llamar("get", "/periodos")).body.periodos.find((p) => p.periodo === "2026-1").archivado, true);
  // Al volver a publicarlo, se ve otra vez.
  await llamar("post", "/periodos/2026-2/publicar");
  assert.deepEqual((await publico("/vigente")).body.periodos.map((p) => p.periodo), ["2026-2"]);
});

test("mesas: Alumnos y su PDF no muestran llamados archivados; el último y los retirados se respetan", async () => {
  const { llamar, publico } = await panelAcademico(HOY);
  const crear = async (datos, fechaMesa) => {
    const id = (await llamar("post", "/llamados", datos)).body.llamado.id;
    if (fechaMesa) {
      await llamar("post", `/llamados/${id}/mesas`, {
        materia: "Nutrición",
        anioCarrera: 1,
        fecha: fechaMesa,
        hora: "18:00",
        aula: "",
        tribunal: "",
      });
    }
    assert.equal((await llamar("post", `/llamados/${id}/publicar`)).status, 200);
    return id;
  };
  const julio = await crear({ nombre: "Julio 2026", desde: "2026-07-20", hasta: "2026-07-31", aviso: "" }, "2026-08-04");
  const diciembre = await crear({ nombre: "Diciembre 2026", desde: "2026-12-01", hasta: "2026-12-12", aviso: "" });
  const vigentes = (await publico("/vigente")).body.llamados.map((l) => l.nombre);
  assert.deepEqual(vigentes, ["Diciembre 2026"], "julio: pasaron más de 30 días desde el 4/8");
  assert.equal((await publico(`/vigente/mesas.pdf?llamado=${julio}`)).status, 404);
  assert.equal((await publico(`/vigente/mesas.pdf?llamado=${diciembre}`)).status, 200);
  const enPanel = (await llamar("get", "/llamados")).body.llamados.map((l) => [l.nombre, l.archivado]);
  assert.deepEqual(enPanel, [["Diciembre 2026", false], ["Julio 2026", true]]);
  assert.equal((await llamar("get", `/llamados/${julio}`)).body.llamado.archivado, true);
  // Si se retira diciembre, julio no reaparece: ya estaba archivado (corrección de la revisión).
  await llamar("post", `/llamados/${diciembre}/retirar`);
  assert.deepEqual((await publico("/vigente")).body.llamados, []);
  assert.equal((await publico(`/vigente/mesas.pdf?llamado=${julio}`)).status, 404);
  // Un llamado viejo con solo fecha de inicio también se archiva.
  const junio = await crear({ nombre: "Junio 2025", desde: "2025-06-10", hasta: "", aviso: "" });
  assert.deepEqual((await publico("/vigente")).body.llamados, [], "junio 2025 (solo «desde») no se ve");
  assert.equal((await llamar("get", `/llamados/${junio}`)).body.llamado.archivado, true);
});

// ---------- Panel ----------

test("panel de eventos: cada evento en una sola pestaña, con las confirmaciones de archivo", () => {
  const ev = (estado, archivado, visibleSiempre = false) => ({ titulo: "Feria", estado, archivado, visibleSiempre });
  assert.equal(seccionDelEvento(ev("visible", false)), "sitio");
  assert.equal(seccionDelEvento(ev("oculto", false)), "oculto");
  assert.equal(seccionDelEvento(ev("visible", true)), "archivo");
  assert.equal(seccionDelEvento(ev("oculto", true, true)), "archivo", "oculto y viejo: archivo, aunque tenga visibleSiempre");
  assert.equal(seccionDelEvento(ev("visible", true, true)), "sitio");
  assert.equal(seccionDelEvento(ev("archivado", false)), "archivo", "estado de antes");
  assert.equal(visibleFueraDeFecha(ev("visible", true, true)), true);
  assert.equal(visibleFueraDeFecha(ev("visible", false, true)), false);
  const mostrar = confirmacionMostrarArchivado({ ...ev("oculto", true), fechaEvento: "2024-09-01T15:00:00Z" });
  assert.match(mostrar.texto, /es de 2024 y está en el archivo, y además estaba oculto/);
  assert.match(confirmacionVolverAlArchivo(ev("visible", true, true)).texto, /No se borra nada/);
  const pagina = leer("pages/AdminEventos.jsx");
  assert.match(pagina, /\{ id: "archivo", label: "Archivo" \}/);
  assert.match(pagina, /confirmar\(mostrar \? confirmacionMostrarArchivado\(ev\) : confirmacionVolverAlArchivo\(ev\)\)/);
  // Una sola petición: nunca primero el estado y después visibleSiempre.
  assert.match(pagina, /cuerpo: \{ visibleSiempre: mostrar, mostrar: mostrar && ev\.estado === "oculto" \}/);
  assert.doesNotMatch(pagina.slice(pagina.indexOf("const cambiarArchivo")), /\/estado`, \{ metodo: "PATCH"[\s\S]*?visible-siempre/);
  assert.match(leer("components/ResumenLlamado.jsx"), /llamado\.publicado && !llamado\.archivado &&/, "sin PDF público");
});
