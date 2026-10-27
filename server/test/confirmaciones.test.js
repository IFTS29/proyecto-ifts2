import test from "node:test";
import assert from "node:assert/strict";
// Lógica de las ventanas de confirmación del panel (client/src/confirmaciones.js): no usa React.
import { crearConfirmador, crearPaseUnico, enlaceQueSaleDelFormulario } from "../../client/src/confirmaciones.js";

function confirmadorDePrueba() {
  const mostradas = [];
  return { mostradas, confirmador: crearConfirmador((pedido) => mostradas.push(pedido)) };
}

test("confirmar devuelve true; cancelar, la X o Escape devuelven false", async () => {
  const { mostradas, confirmador } = confirmadorDePrueba();

  const primera = confirmador.pedir({ titulo: "¿Ocultar este evento?" });
  assert.equal(mostradas.at(-1).titulo, "¿Ocultar este evento?");
  confirmador.responder(true);
  assert.equal(await primera, true);
  assert.equal(mostradas.at(-1), null, "la ventana se cierra");

  const segunda = confirmador.pedir({ titulo: "¿Eliminar este usuario?" });
  confirmador.responder(false);
  assert.equal(await segunda, false);
});

test("solo hay una confirmación por vez: la segunda responde false sin mostrarse", async () => {
  const { mostradas, confirmador } = confirmadorDePrueba();

  const primera = confirmador.pedir({ titulo: "Primera" });
  const segunda = confirmador.pedir({ titulo: "Segunda" });

  assert.equal(await segunda, false);
  assert.equal(mostradas.length, 1);
  confirmador.responder(true);
  assert.equal(await primera, true);
});

test("responder dos veces (doble clic) no ejecuta nada de más", async () => {
  const { confirmador } = confirmadorDePrueba();
  let veces = 0;
  const pedido = confirmador.pedir({ titulo: "¿Publicar?" }).then((ok) => ok && veces++);

  confirmador.responder(true);
  confirmador.responder(true);
  await pedido;

  assert.equal(veces, 1);
  assert.equal(confirmador.hayUnaAbierta(), false);
});

// ----- Enlaces que sacan del formulario -----

const enlace = (atributos = {}) => ({
  target: atributos.target ?? "",
  hasAttribute: (nombre) => nombre in atributos,
});
const clicEn = (a, teclas = {}) => ({ button: 0, target: { closest: () => a }, ...teclas });

test("un clic común en un enlace del sitio pide confirmación", () => {
  const a = enlace();
  assert.equal(enlaceQueSaleDelFormulario(clicEn(a)), a);
});

test("no se pregunta si el enlace abre otra pestaña, es una descarga o no es un enlace", () => {
  assert.equal(enlaceQueSaleDelFormulario(clicEn(enlace({ target: "_blank" }))), null);
  assert.equal(enlaceQueSaleDelFormulario(clicEn(enlace({ download: "" }))), null);
  assert.equal(enlaceQueSaleDelFormulario(clicEn(enlace(), { ctrlKey: true })), null);
  assert.equal(enlaceQueSaleDelFormulario(clicEn(enlace(), { metaKey: true })), null);
  assert.equal(enlaceQueSaleDelFormulario(clicEn(enlace(), { shiftKey: true })), null);
  assert.equal(enlaceQueSaleDelFormulario(clicEn(enlace(), { button: 1 })), null);
  assert.equal(enlaceQueSaleDelFormulario(clicEn(null)), null);
});

// ----- Clic repetido después de confirmar -----

test("el clic repetido pasa una sola vez y solo para el enlace confirmado", () => {
  const pase = crearPaseUnico();
  const otro = { click() {} };
  const pasaron = [];
  const confirmado = {
    click() {
      // Mientras se repite el clic, el escuchador ve el enlace confirmado y lo deja pasar.
      pasaron.push(pase.pasa(otro), pase.pasa(confirmado), pase.pasa(confirmado));
    },
  };

  pase.repetirClic(confirmado);

  assert.deepEqual(pasaron, [false, true, false]);
  assert.equal(pase.pasa(confirmado), false, "después del clic repetido vuelve a preguntar");
});

test("si el clic repetido no llega al escuchador, el permiso no queda abierto", () => {
  const pase = crearPaseUnico();
  const sinEfecto = { click() {} }; // por ejemplo, un enlace que ya no está en la página
  pase.repetirClic(sinEfecto);
  assert.equal(pase.pasa(sinEfecto), false);

  const conError = {
    click() {
      throw new Error("falló el clic");
    },
  };
  assert.throws(() => pase.repetirClic(conError));
  assert.equal(pase.pasa(conError), false);
});
