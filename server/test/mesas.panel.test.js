import test from "node:test";
import assert from "node:assert/strict";
// Textos de las mesas de examen en el panel y en Alumnos: tienen que decir lo mismo que el PDF del servidor.
import * as cliente from "../../client/src/mesas.js";
import * as servidor from "../src/services/mesas.js";

test("los textos del navegador coinciden con los del PDF", () => {
  const llamados = [
    { desde: "2027-02-09", hasta: "2027-02-20" },
    { desde: "2027-02-25", hasta: "2027-03-05" },
    { desde: "2026-12-14", hasta: "2027-02-20" },
    { desde: "2027-02-09", hasta: "" },
    { desde: "", hasta: "2027-02-20" },
    { desde: "", hasta: "" },
  ];
  for (const l of llamados) assert.equal(cliente.textoFechasDelLlamado(l), servidor.textoFechasDelLlamado(l));
  for (const fecha of ["2027-02-10", "2026-12-14", ""]) {
    assert.equal(cliente.textoFechaDeMesa(fecha), servidor.textoFechaDeMesa(fecha));
  }
  for (const hora of ["18:00", "18:30", ""]) assert.equal(cliente.textoHoraDeMesa(hora), servidor.textoHoraDeMesa(hora));
  assert.equal(cliente.textoAnio(2), servidor.textoAnio(2));
  assert.equal(cliente.AVISO_POR_DEFECTO, servidor.AVISO_POR_DEFECTO);
});

test("aviso del llamado: el escrito; si no hay mesas ni aviso, el de por defecto", () => {
  assert.equal(cliente.avisoDelLlamado({ aviso: "Inscripción en SIU Guaraní.", mesas: [] }), "Inscripción en SIU Guaraní.");
  assert.equal(cliente.avisoDelLlamado({ aviso: "", mesas: [] }), "El cronograma por materia se publicará próximamente.");
  assert.equal(cliente.avisoDelLlamado({ aviso: "", mesas: [{ id: "1" }] }), "");
});

test("textos sueltos: cantidad de mesas y nombre de archivo", () => {
  assert.equal(cliente.textoMesas(1), "1 mesa");
  assert.equal(cliente.textoMesas(0), "0 mesas");
  assert.equal(cliente.paraArchivo("Julio-agosto 2027"), "julio-agosto-2027");
  assert.equal(cliente.paraArchivo("Diciembre (Extraordinario)"), "diciembre-extraordinario");
  assert.equal(cliente.paraArchivo("Recuperatorio Única"), "recuperatorio-unica");
});
