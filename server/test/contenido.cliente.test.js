import test from "node:test";
import assert from "node:assert/strict";
// Contenido institucional en el navegador (client/src/contenido.js): avatar, grupos, fechas y el estado
// compartido entre Carrera, Contacto, el pie y el panel.
import { agruparPersonas, crearAlmacenContenido, iniciales, textoActualizado } from "../../client/src/contenido.js";

test("iniciales del avatar: primera y última palabra, sin títulos", () => {
  assert.equal(iniciales("Cecilia C. Dipiazza"), "CD");
  assert.equal(iniciales("Prof. Julia Sboro"), "JS");
  assert.equal(iniciales("Lic. Ana"), "A");
  assert.equal(iniciales("  maría   del carmen canovi "), "MC");
  assert.equal(iniciales(""), "");
});

test("autoridades primero y tutoría después, en el orden cargado; un grupo vacío no aparece", () => {
  const personas = [
    { nombre: "Tutora", grupo: "tutoria" },
    { nombre: "Rectora", grupo: "autoridades" },
    { nombre: "Secretario", grupo: "autoridades" },
  ];
  assert.deepEqual(
    agruparPersonas(personas).map((g) => [g.titulo, g.personas.map((p) => p.nombre)]),
    [
      ["Autoridades", ["Rectora", "Secretario"]],
      ["Tutoría", ["Tutora"]],
    ],
  );
  assert.deepEqual(
    agruparPersonas(personas.slice(1)).map((g) => g.titulo),
    ["Autoridades"],
  );
});

test("fecha de actualización en hora de Argentina; sin fecha, la carga inicial", () => {
  assert.equal(textoActualizado({ actualizadoEn: "2026-11-02T02:30:00Z" }), "Actualizado el 01/11/2026");
  assert.equal(textoActualizado({ actualizadoEn: null }), "Sin cambios desde la carga inicial");
});

// Promesa que se resuelve o se rechaza cuando la prueba lo indica.
function pedidoControlado() {
  const pedidos = [];
  const pedir = () =>
    new Promise((resolver, rechazar) => {
      pedidos.push({ resolver, rechazar });
    });
  return { pedir, pedidos };
}

test("dos páginas que piden a la vez generan una sola consulta", async () => {
  const { pedir, pedidos } = pedidoControlado();
  const almacen = crearAlmacenContenido(pedir);
  const a = almacen.cargar();
  const b = almacen.cargar();
  assert.equal(pedidos.length, 1);
  pedidos[0].resolver({ perfil: 1 });
  await Promise.all([a, b]);
  assert.deepEqual(almacen.leer(), { estado: "listo", contenido: { perfil: 1 } });
});

test("cada vez que se abre una página se vuelve a consultar: no quedan datos de antes", async () => {
  const { pedir, pedidos } = pedidoControlado();
  const almacen = crearAlmacenContenido(pedir);
  const primera = almacen.cargar();
  pedidos[0].resolver({ contacto: "viejo" });
  await primera;
  const segunda = almacen.cargar();
  assert.equal(pedidos.length, 2);
  // Mientras llega la respuesta, se sigue viendo lo anterior.
  assert.equal(almacen.leer().estado, "listo");
  pedidos[1].resolver({ contacto: "nuevo" });
  await segunda;
  assert.deepEqual(almacen.leer().contenido, { contacto: "nuevo" });
});

test("un error no se guarda: se informa y la próxima consulta vuelve a intentar", async () => {
  const { pedir, pedidos } = pedidoControlado();
  const almacen = crearAlmacenContenido(pedir);
  const vistos = [];
  almacen.suscribir((e) => vistos.push(e.estado));
  const primera = almacen.cargar();
  pedidos[0].rechazar(new Error("sin conexión"));
  await primera;
  assert.deepEqual(almacen.leer(), { estado: "error", contenido: null });
  const segunda = almacen.cargar();
  assert.equal(pedidos.length, 2);
  pedidos[1].resolver({ perfil: "ok" });
  await segunda;
  assert.deepEqual(vistos, ["error", "cargando", "listo"]);
});

test("al guardar, la sección nueva reemplaza a la anterior y se descarta una consulta vieja en camino", async () => {
  const { pedir, pedidos } = pedidoControlado();
  const almacen = crearAlmacenContenido(pedir);
  const primera = almacen.cargar();
  pedidos[0].resolver({ perfil: "viejo", contacto: "igual" });
  await primera;
  const enCamino = almacen.cargar();
  almacen.reemplazarSeccion("perfil", "guardado");
  pedidos[1].resolver({ perfil: "viejo", contacto: "igual" });
  await enCamino;
  assert.deepEqual(almacen.leer().contenido, { perfil: "guardado", contacto: "igual" });
  // Después del guardado, una página que se abre consulta de nuevo.
  almacen.cargar();
  assert.equal(pedidos.length, 3);
});
