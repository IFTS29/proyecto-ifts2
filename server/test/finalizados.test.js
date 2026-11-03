import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import request from "supertest";
import { BEDELIA, appDePrueba, tokenDe } from "./ayuda.js";
import { llamadoFinalizado, periodoAnterior } from "../src/services/archivo.js";
import { eventosPorAnio } from "../../client/src/eventos.js";

// Avisos de «ya terminó» (#35): el último turno de mesas y el último período de horarios siguen a la vista para
// que Alumnos no quede vacía, pero con un aviso. Eventos muestra siempre el bloque del año en curso.

const leer = (ruta) => readFileSync(new URL(`../../client/src/${ruta}`, import.meta.url), "utf8");

test("horarios: un período es anterior cuando su cuatrimestre ya terminó (desde agosto, 2.º cuatrimestre)", () => {
  const primero2026 = { cicloLectivo: 2026, cuatrimestre: 1 };
  const segundo2026 = { cicloLectivo: 2026, cuatrimestre: 2 };
  assert.equal(periodoAnterior(primero2026, "2026-07-31"), false, "31/7: sigue el 1.º cuatrimestre");
  assert.equal(periodoAnterior(primero2026, "2026-08-01"), true, "1/8: ya es el 2.º");
  assert.equal(periodoAnterior(segundo2026, "2026-08-01"), false);
  assert.equal(periodoAnterior(segundo2026, "2026-12-31"), false);
  assert.equal(periodoAnterior(segundo2026, "2027-01-01"), true, "cambio de año");
  assert.equal(periodoAnterior({ cicloLectivo: 2027, cuatrimestre: 1 }, "2026-11-03"), false, "uno futuro no");
});

test("mesas: turno finalizado solo si todas las mesas tienen fecha y ya pasaron; un anuncio usa su «hasta»", () => {
  const conMesas = (...fechas) => ({ desde: "2026-07-20", hasta: "2026-07-31", mesas: fechas.map((fecha) => ({ fecha })) });
  const julio = conMesas("2026-07-22", "2026-08-04");
  assert.equal(llamadoFinalizado(julio, "2026-08-04"), false, "el día de la última mesa todavía no");
  assert.equal(llamadoFinalizado(julio, "2026-08-05"), true, "el día siguiente sí");
  assert.equal(llamadoFinalizado(conMesas("2026-07-22", ""), "2026-12-01"), false, "una mesa «A confirmar»");
  const anuncio = (desde, hasta) => ({ desde, hasta, mesas: [] });
  assert.equal(llamadoFinalizado(anuncio("2026-12-01", "2026-12-12"), "2026-12-12"), false);
  assert.equal(llamadoFinalizado(anuncio("2026-12-01", "2026-12-12"), "2026-12-13"), true);
  assert.equal(llamadoFinalizado(anuncio("2026-06-10", ""), "2026-11-03"), false, "sin «hasta» no se sabe");
  assert.equal(llamadoFinalizado(anuncio("", ""), "2026-11-03"), false, "sin fechas");
});

async function panelAcademico(dia) {
  const { app } = await appDePrueba({ hoy: () => dia });
  const token = await tokenDe(app, BEDELIA);
  const llamar = (metodo, ruta, cuerpo) => {
    const req = request(app)[metodo](`/api/academic${ruta}`).set("Authorization", `Bearer ${token}`);
    return cuerpo === undefined ? req : req.send(cuerpo);
  };
  return { llamar, publico: (ruta) => request(app).get(`/api/academic${ruta}`) };
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

test("Alumnos recibe «anterior» en cada período y «finalizado» en cada turno, calculados con la fecha del día", async () => {
  // 20/8/2026: el 1.º cuatrimestre ya terminó; julio sigue a la vista (no pasaron 30 días desde el 4/8).
  const { llamar, publico } = await panelAcademico("2026-08-20");
  for (const [c, q] of [[2026, 1], [2026, 2]]) {
    await llamar("post", "/horarios", materia(c, q));
    assert.equal((await llamar("post", `/periodos/${c}-${q}/publicar`)).status, 200);
  }
  const publicar = async (datos, fechaMesa) => {
    const id = (await llamar("post", "/llamados", datos)).body.llamado.id;
    if (fechaMesa !== undefined) {
      const mesa = { materia: "Nutrición", anioCarrera: 1, fecha: fechaMesa, hora: "18:00", aula: "", tribunal: "" };
      await llamar("post", `/llamados/${id}/mesas`, mesa);
    }
    assert.equal((await llamar("post", `/llamados/${id}/publicar`)).status, 200);
  };
  await publicar({ nombre: "Julio 2026", desde: "2026-07-20", hasta: "2026-07-31", aviso: "" }, "2026-08-04");
  await publicar({ nombre: "Diciembre 2026", desde: "2026-12-01", hasta: "2026-12-12", aviso: "" });

  const { body } = await publico("/vigente");
  assert.deepEqual(body.periodos.map((p) => [p.periodo, p.anterior]), [["2026-2", false], ["2026-1", true]]);
  assert.deepEqual(body.llamados.map((l) => [l.nombre, l.finalizado]), [["Diciembre 2026", false], ["Julio 2026", true]]);
});

test("Alumnos: etiqueta y frase en el turno y el período que ya terminaron; textos neutros", () => {
  const llamado = leer("components/LlamadoPublico.jsx");
  assert.match(llamado, /\{llamado\.finalizado && \(/);
  assert.match(llamado, /Turno finalizado/);
  assert.doesNotMatch(llamado, /próximo turno/, "solo la etiqueta (revisión)");
  const horarios = leer("components/HorariosDeCursada.jsx");
  assert.match(horarios, /actual\.anterior \? \(\s*<span className="etiqueta et-gris">Período anterior<\/span>/);
  assert.match(horarios, /Estos horarios se mantienen disponibles como referencia\./);
  for (const [archivo, tema] of [[horarios, "los horarios"], [leer("components/MesasDeExamen.jsx"), "las mesas"]]) {
    assert.match(archivo, new RegExp(`Para consultar por ${tema}, utilizar el\\{" "\\}\\s*<Link to="/contacto">formulario de contacto</Link>\\.`));
  }
  assert.doesNotMatch(horarios, /consultá|style=\{\{/, "sin voseo ni estilos en línea");
});

test("eventos: el bloque del año en curso está siempre y abierto; si está vacío, también se abre el anterior", () => {
  const ev = (id, fechaEvento) => ({ id, fechaEvento });
  const de2026 = [ev("a", "2026-06-01T15:00:00Z"), ev("b", "2025-09-01T15:00:00Z")];
  // 1/1/2027: todavía no hay eventos de 2027.
  assert.deepEqual(
    eventosPorAnio(de2026, 2027).map((g) => [g.titulo, g.eventos.length]),
    [["2027", 0], ["2026", 1], ["2025", 1]],
  );
  assert.deepEqual(eventosPorAnio(de2026, 2026).map((g) => g.titulo), ["2026", "2025"], "no se repite el año");
  assert.deepEqual(eventosPorAnio([], 2027), [{ clave: "2027", titulo: "2027", eventos: [] }]);
  assert.deepEqual(eventosPorAnio([]), [], "sin año en curso, como antes");
  const pagina = leer("pages/Eventos.jsx");
  assert.match(pagina, /eventosPorAnio\(eventos, anioActual\)/);
  assert.match(pagina, /open=\{grupo\.clave === String\(anioActual\) \|\| grupo\.clave === masRecienteConEventos\}/);
  assert.match(pagina, /Todavía no hay eventos publicados de \{grupo\.titulo\}\./);
});
