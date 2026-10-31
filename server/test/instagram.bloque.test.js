import test from "node:test";
import assert from "node:assert/strict";
// Bloque de Instagram del panel de eventos (client/src/eventos.js): textos según el estado y fecha.
import { textoDeFechaDeSincronizacion, textosDelBloqueDeInstagram } from "../../client/src/eventos.js";

// 30/10/2026 a las 23:30 en Argentina.
const AHORA = new Date("2026-10-31T02:30:00Z");

test("la fecha de sincronización se muestra con hora de 24 horas y en hora de Argentina", () => {
  assert.equal(textoDeFechaDeSincronizacion("2026-10-31T02:19:00Z", AHORA), "hoy a las 23:19");
  assert.equal(textoDeFechaDeSincronizacion("2026-10-30T12:05:00Z", AHORA), "hoy a las 09:05");
  assert.equal(textoDeFechaDeSincronizacion("2026-10-29T12:05:00Z", AHORA), "el 29/10/2026 a las 09:05");
  assert.equal(textoDeFechaDeSincronizacion(null, AHORA), null);
  assert.equal(textoDeFechaDeSincronizacion("no es una fecha", AHORA), null);
});

test("conectado y con una sincronización correcta: Funcionando, con la fecha", () => {
  const bloque = textosDelBloqueDeInstagram(
    { conectado: true, cuenta: "@ifts2", estado: "activo", ultimaSincronizacion: "2026-10-31T02:19:00Z" },
    AHORA,
  );
  assert.deepEqual(bloque, {
    titulo: "Instagram conectado: @ifts2",
    texto: "Al sincronizar, se incorporan las publicaciones con #eventosIFTS2. Última sincronización: hoy a las 23:19.",
    etiqueta: "Funcionando",
    tipo: "funcionando",
  });
});

test("conectado sin nombre de cuenta: solo «Instagram conectado»", () => {
  const bloque = textosDelBloqueDeInstagram({ conectado: true, estado: "activo", ultimaSincronizacion: "2026-10-31T02:19:00Z" }, AHORA);
  assert.equal(bloque.titulo, "Instagram conectado");
});

test("con credenciales y sin sincronizaciones previas: «Instagram configurado» y Sin sincronizar", () => {
  const bloque = textosDelBloqueDeInstagram({ conectado: true, cuenta: null, estado: "activo", ultimaSincronizacion: null }, AHORA);
  assert.equal(bloque.titulo, "Instagram configurado");
  assert.equal(bloque.texto, "Al sincronizar, se incorporan las publicaciones con #eventosIFTS2. Todavía no se realizó ninguna sincronización.");
  assert.equal(bloque.etiqueta, "Sin sincronizar");
});

test("error de sincronización: muestra la última sincronización correcta si la hubo", () => {
  const conFecha = textosDelBloqueDeInstagram(
    { conectado: false, estado: "error", ultimaSincronizacion: "2026-10-29T12:05:00Z" },
    AHORA,
  );
  assert.equal(conFecha.titulo, "Instagram: error de sincronización");
  assert.equal(conFecha.etiqueta, "Error de sincronización");
  assert.equal(conFecha.texto, "No se pudo completar la última sincronización con Instagram. Última sincronización correcta: el 29/10/2026 a las 09:05.");
  assert.equal(conFecha.tipo, "error");
  assert.equal(textosDelBloqueDeInstagram({ conectado: false, estado: "error" }, AHORA).texto, "No se pudo completar la última sincronización con Instagram.");
});

test("sin conexión configurada: no muestra la fecha, aunque el botón haya leído lo guardado", () => {
  const bloque = textosDelBloqueDeInstagram(
    { conectado: false, estado: "sin_sincronizar", ultimaSincronizacion: "2026-10-31T02:19:00Z" },
    AHORA,
  );
  assert.deepEqual(bloque, {
    titulo: "Instagram sin conectar",
    texto: "No hay una conexión configurada con Instagram. Los eventos pueden cargarse manualmente desde el panel.",
    etiqueta: "Sin conexión",
    tipo: "sin-conexion",
  });
});
