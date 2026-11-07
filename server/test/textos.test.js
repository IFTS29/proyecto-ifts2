// Criterio de los textos del sitio y del panel (7/11):
// - el sitio público usa voseo solo en los textos que presentan la carrera e invitan al visitante;
// - los mensajes del sistema (errores, avisos, validaciones, formularios) y todo el panel son neutros;
// - «IFTS N.º 2» y los ordinales van con «º», no con el signo de grado «°».
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { textoPeriodo } from "../src/services/academica.js";
import { textoFechaHora, textoPeriodo as textoPeriodoDelCliente } from "../../client/src/academica.js";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function archivos(carpeta) {
  return fs.readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = path.join(carpeta, entrada.name);
    if (entrada.isDirectory()) return archivos(ruta);
    return /\.(js|jsx|html)$/.test(entrada.name) ? [ruta] : [];
  });
}

const CODIGO = [
  ...archivos(path.join(raiz, "client/src")),
  ...archivos(path.join(raiz, "server/src")),
  path.join(raiz, "client/index.html"),
];

// Textos de presentación del sitio público que usan voseo a propósito. Un texto nuevo con voseo
// tiene que ser de este tipo y sumarse acá; si es un mensaje del sistema o del panel, va neutro.
const VOSEO_PERMITIDO = [
  "Aprendé a cocinar y a gestionar tu propio emprendimiento",
  "Conocé la carrera",
  "¿Qué estás buscando?",
  "Qué vas a aprender",
  "Cómo inscribirte",
  "combinás talleres de producción",
  "tu propio emprendimiento gastronómico",
  "Tu propio emprendimiento",
  "diseñás tu emprendimiento",
  "¿Querés estudiar con nosotros?",
  "Escribinos tu consulta y te respondemos por correo.",
  "Escribinos y te respondemos por correo.",
  "¿Qué vas a aprender?",
];

const VOSEO =
  /(?<![\p{L}])(Probá|Completá|Elegí|Agregá|Quitá|Seleccioná|Escribí|Ingresá|Revisá|Indicá|Corregí|Guardá|Cargá|Usá|Iniciá|Deslizá|Podés|Querés|Tenés|Dejás|Estás|Enviaste|Llegaste|Quitaste|Escribinos|Conocé|Aprendé)(?![\p{L}])/iu;

test("los mensajes del sistema y del panel no usan voseo", () => {
  const encontrados = [];
  for (const archivo of CODIGO) {
    let texto = fs.readFileSync(archivo, "utf8");
    for (const permitido of VOSEO_PERMITIDO) texto = texto.split(permitido).join("");
    texto.split("\n").forEach((linea, i) => {
      const voseo = linea.match(VOSEO);
      if (voseo) encontrados.push(`${path.relative(raiz, archivo)}:${i + 1} «${voseo[0]}»`);
    });
  }
  assert.deepEqual(encontrados, []);
});

test("«N.º» y los ordinales van con «º», no con el signo de grado", () => {
  const encontrados = [];
  for (const archivo of CODIGO) {
    fs.readFileSync(archivo, "utf8")
      .split("\n")
      .forEach((linea, i) => {
        // Se permite nombrar el signo de grado en un comentario que explica la regla.
        if (/signo de grado \(°\)/.test(linea)) return;
        if (/(N|\d|\})\.°/.test(linea)) encontrados.push(`${path.relative(raiz, archivo)}:${i + 1}`);
      });
  }
  assert.deepEqual(encontrados, []);
});

test("el período se escribe «1.º cuatrimestre» en el cliente y en el servidor", () => {
  const periodo = { cicloLectivo: 2027, cuatrimestre: 1 };
  assert.equal(textoPeriodo(periodo), "1.º cuatrimestre 2027");
  assert.equal(textoPeriodoDelCliente(periodo), "1.º cuatrimestre 2027");
});

test("la fecha y hora de publicación va en 24 h, sin «a. m.» ni «p. m.»", () => {
  const texto = textoFechaHora("2026-11-07T15:42:00Z"); // 12:42 en Argentina
  assert.match(texto, /12:42/);
  assert.doesNotMatch(texto, /[ap]\.\s?m\./i);
  assert.match(textoFechaHora("2026-11-07T23:05:00Z"), /20:05/);
});
