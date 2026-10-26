import test from "node:test";
import assert from "node:assert/strict";
// Ayudas del panel (client/src/eventos.js): no usan React, así que se prueban acá con el resto.
import {
  datosBasicosParaEnviar,
  diaEnArgentina,
  faltaUnDato,
  fechaDelDia,
  valoresDeEvento,
} from "../../client/src/eventos.js";

test("un día elegido se guarda a mediodía de Argentina y se sigue viendo como ese día", () => {
  assert.equal(fechaDelDia("2026-10-05"), "2026-10-05T15:00:00.000Z");
  assert.equal(diaEnArgentina(fechaDelDia("2026-10-05")), "2026-10-05");
});

test("el formulario muestra el día como se ve en Argentina", () => {
  assert.equal(valoresDeEvento({ fechaEvento: "2026-10-05T18:00:00.000Z" }).fecha, "2026-10-05");
  // Las 01:00 UTC del 5 son las 22:00 del 4 en Argentina.
  assert.equal(valoresDeEvento({ fechaEvento: "2026-10-05T01:00:00.000Z" }).fecha, "2026-10-04");
});

test("al editar, si no se cambió el día, no se manda la fecha y se conserva la original con su hora", () => {
  const inicial = valoresDeEvento({ titulo: "Muestra", descripcion: "x", fechaEvento: "2026-10-05T18:00:00.000Z" });

  const soloTitulo = datosBasicosParaEnviar({ ...inicial, titulo: "Muestra de panadería" }, inicial);
  assert.equal("fechaEvento" in soloTitulo, false);

  const otroDia = datosBasicosParaEnviar({ ...inicial, fecha: "2026-10-07" }, inicial);
  assert.equal(otroDia.fechaEvento, "2026-10-07T15:00:00.000Z");
});

test("en el alta siempre se manda la fecha elegida", () => {
  const valores = { titulo: " Muestra ", resumen: "", descripcion: " x ", fecha: "2026-10-05" };
  assert.deepEqual(datosBasicosParaEnviar(valores), {
    titulo: "Muestra",
    resumen: "",
    descripcion: "x",
    fechaEvento: "2026-10-05T15:00:00.000Z",
  });
});

test("título, fecha y descripción son obligatorios, también al editar", () => {
  const completo = { titulo: "Muestra", resumen: "", descripcion: "x", fecha: "2026-10-05" };
  assert.equal(faltaUnDato(completo), "");
  assert.match(faltaUnDato({ ...completo, titulo: "  " }), /título/);
  assert.match(faltaUnDato({ ...completo, fecha: "" }), /fecha/);
  assert.match(faltaUnDato({ ...completo, descripcion: "" }), /descripción/);
});
