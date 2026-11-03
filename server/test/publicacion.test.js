import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DOCUMENTOS } from "../../client/src/documentos.js";

// Lo que se publica en Vercel (H-93). En local todo funciona porque el servidor lee las carpetas del disco;
// en Vercel, lo que excluye .vercelignore no se sube y el sitio publicado no lo tiene. Esta prueba controla que
// ninguna regla excluya archivos de client/public (documentos, imágenes). La comprobación decisiva sigue siendo
// abrir y descargar los documentos en la Preview.

const raiz = new URL("../../", import.meta.url);
const reglas = readFileSync(new URL(".vercelignore", raiz), "utf8")
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#") && !l.startsWith("!"));

// Todas las rutas de client/public, con sus carpetas («client», «client/public», «client/public/docs», …).
function rutasDe(carpeta) {
  return readdirSync(new URL(carpeta, raiz), { withFileTypes: true }).flatMap((e) => {
    const ruta = `${carpeta}${e.name}`;
    return e.isDirectory() ? [ruta, ...rutasDe(`${ruta}/`)] : [ruta];
  });
}
const RUTAS = ["client", "client/public", ...rutasDe("client/public/")];

// Interpreta solo el tipo de reglas que tiene hoy .vercelignore (no todo el formato de .gitignore: ni negaciones
// ni «**» ni otros patrones complejos): una regla sin «/» (salvo la final) vale para cualquier nivel; con «/» al
// principio o en el medio, se cuenta desde la raíz; «*» no cruza carpetas. Si se agrega una regla de otro tipo,
// hay que ampliar esta función.
const comoExpresion = (patron) => new RegExp(`^${patron.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*")}$`);
function excluye(regla, ruta) {
  const patron = regla.replace(/\/$/, "");
  if (!patron.slice(0, -1).includes("/") && !patron.startsWith("/")) {
    return ruta.split("/").some((parte) => comoExpresion(patron).test(parte));
  }
  const partes = ruta.split("/");
  const desdeRaiz = patron.replace(/^\//, "");
  return partes.some((_, i) => comoExpresion(desdeRaiz).test(partes.slice(0, i + 1).join("/")));
}

test(".vercelignore: la regla de la carpeta docs de la raíz no excluye client/public/docs", () => {
  assert.ok(reglas.includes("/docs/"), "excluye solo /docs/ (documentación del equipo)");
  assert.ok(!reglas.includes("docs/") && !reglas.includes("docs"), "sin la regla que excluía toda carpeta docs");
  // La forma de leer las reglas distingue los dos casos que causaron H-93.
  assert.equal(excluye("docs/", "client/public/docs/guia.pdf"), true);
  assert.equal(excluye("/docs/", "client/public/docs/guia.pdf"), false);
  assert.equal(excluye("/docs/", "docs/registro-de-cambios.md"), true);
  assert.equal(excluye("server/test/", "server/test/plan.test.js"), true);
});

test(".vercelignore: ninguna regla excluye archivos que publica el sitio (client/public)", () => {
  for (const regla of reglas) {
    const excluidas = RUTAS.filter((ruta) => excluye(regla, ruta));
    assert.deepEqual(excluidas, [], `la regla «${regla}» excluye archivos públicos`);
  }
});

test("documentos: los cinco PDF están en client/public/docs, que es lo que Vite copia al build", () => {
  const enDocs = readdirSync(new URL("client/public/docs/", raiz));
  for (const doc of Object.values(DOCUMENTOS)) {
    assert.match(doc.archivo, /^\/docs\/[\w.-]+\.pdf$/);
    assert.ok(enDocs.includes(doc.archivo.replace("/docs/", "")), doc.archivo);
  }
  assert.equal(Object.keys(DOCUMENTOS).length, 5);
});
