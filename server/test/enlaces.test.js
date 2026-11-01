import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ENLACES, EXTERNO } from "../../client/src/enlaces.js";

// Enlaces útiles a sitios externos (RF-04): todos salen de client/src/enlaces.js.

const leer = (ruta) => readFileSync(new URL(`../../client/src/${ruta}`, import.meta.url), "utf8");
const PAGINAS = [
  "pages/Alumnos.jsx",
  "pages/Inicio.jsx",
  "components/Footer.jsx",
  "pages/Ingreso.jsx",
  "pages/Contacto.jsx",
];

test("cada enlace externo lleva a la dirección esperada", () => {
  assert.deepEqual(ENLACES, {
    siuAlumnos: "https://guarani-autogestionagencia.bue.edu.ar/",
    siuGestion: "https://guarani-gestionagencia.bue.edu.ar/",
    aulasVirtuales: "https://aulasvirtuales.bue.edu.ar/",
    miArgentina: "https://www.argentina.gob.ar/miargentina",
    progresar: "https://www.argentina.gob.ar/educacion/progresar",
    instagram: "https://www.instagram.com/ifts_2_ok/",
    facebook: "https://www.facebook.com/iftsn2/",
    preinscripcion: "https://guarani-autogestionagencia.bue.edu.ar/preinscripcion/SSAALV/acceso",
    ofertaEducativa:
      "https://www.buenosaires.gob.ar/educacion/estudiantes/sistema-educativo/terciario/formacion-tecnica-superior",
  });
});

test("todas las direcciones son absolutas y seguras (https)", () => {
  for (const [clave, direccion] of Object.entries(ENLACES)) {
    assert.equal(new URL(direccion).protocol, "https:", clave);
  }
});

test("los enlaces externos abren en otra pestaña sin acceso a la página de origen", () => {
  assert.equal(EXTERNO.target, "_blank");
  assert.match(EXTERNO.rel, /\bnoopener\b/);
  assert.match(EXTERNO.rel, /\bnoreferrer\b/);
});

test("las páginas toman las direcciones de enlaces.js, sin escribirlas a mano", () => {
  for (const ruta of PAGINAS) {
    const codigo = leer(ruta);
    assert.match(codigo, /from "\.\.\/enlaces\.js"/, ruta);
    assert.doesNotMatch(codigo, /href="https?:\/\//, ruta);
  }
});

test("ningún enlace interno (Link) se presenta como sitio externo", () => {
  const externos = /Sitio externo|SIU Guaraní|Aulas virtuales|Mi Argentina|Progresar|Instagram|Facebook|@ifts_2_ok/;
  for (const ruta of PAGINAS) {
    for (const [enlace] of leer(ruta).matchAll(/<Link\b[\s\S]*?<\/Link>/g)) {
      assert.doesNotMatch(enlace, externos, `${ruta}: ${enlace.slice(0, 80)}`);
    }
  }
});
