import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import {
  ALCANCES_DEL_TITULO,
  AREAS,
  CORRELATIVIDADES,
  FUENTE_ALCANCES,
  INSTANCIAS,
  SEMANAS,
  cantidadPorArea,
  detalleInstancia,
  regimen,
  textoCantidad,
  totalCarrera,
  totalPorArea,
} from "../../client/src/planDeEstudios.js";
import {
  DOCUMENTOS,
  compartirDocumento,
  datosDelArchivo,
  direccionPublica,
  nombreDeDescarga,
} from "../../client/src/documentos.js";

// Plan de estudios de La carrera (#36): datos de la Resolución N.º 1202/MEGC/2007.

const leer = (ruta) => readFileSync(new URL(`../../client/${ruta}`, import.meta.url), "utf8");

// Copia de la tabla de la resolución (págs. 8 y 9), fila por fila: nombre, régimen y total.
// Si alguien cambia un dato de planDeEstudios.js, esta prueba avisa.
const RESOLUCION = [
  ["analisis", "Introducción a la Gastronomía", "Materia cuatrimestral", 48],
  ["analisis", "Industria de la hospitalidad", "Materia cuatrimestral", 48],
  ["analisis", "Principios de Economía", "Materia cuatrimestral", 48],
  ["analisis", "Herramientas de investigación", "Materia cuatrimestral", 64],
  ["analisis", "Organización empresarial", "Materia cuatrimestral", 48],
  ["produccion", "Elaboraciones a base de vegetales, cereales y huevos", "Taller cuatrimestral", 144],
  ["produccion", "Elaboraciones a base de carnes", "Taller cuatrimestral", 144],
  ["produccion", "Elaboración de pizzas y pastas", "Taller cuatrimestral", 96],
  ["produccion", "Elaboraciones de buffet", "Taller cuatrimestral", 96],
  ["produccion", "Servicios de catering", "Taller cuatrimestral", 64],
  ["produccion", "Cocina nacional e internacional", "Taller cuatrimestral", 64],
  ["produccion", "Taller de primeros auxilios", "Taller cuatrimestral", 48],
  ["produccion", "Seguridad e higiene en la Gastronomía", "Materia anual", 96],
  ["produccion", "Elaboraciones de Panadería", "Materia cuatrimestral", 80],
  ["produccion", "Pastelería básica", "Taller cuatrimestral", 96],
  ["produccion", "Repostería", "Materia cuatrimestral", 64],
  ["produccion", "Bebidas", "Materia cuatrimestral", 48],
  ["produccion", "Elementos de Química", "Materia cuatrimestral", 64],
  ["produccion", "Nutrición", "Materia cuatrimestral", 64],
  ["produccion", "Laboratorio de tecnología de los alimentos", "Laboratorio cuatrimestral", 80],
  ["produccion", "Taller de Francés técnico", "Taller cuatrimestral", 64],
  ["produccion", "Seminario de actualización / profundización", "Seminario cuatrimestral", 66],
  ["gestion", "Introducción general a la microempresa", "Materia cuatrimestral", 64],
  ["gestion", "Elementos de Administración y Contabilidad", "Materia anual", 128],
  ["gestion", "Comercialización", "Materia cuatrimestral", 48],
  ["gestion", "Recursos humanos", "Materia cuatrimestral", 64],
  ["gestion", "Compras y gestión de stock", "Materia cuatrimestral", 48],
  ["gestion", "Organización de eventos gastronómicos", "Materia cuatrimestral", 80],
  ["gestion", "Taller de conducción de equipos de trabajo", "Taller cuatrimestral", 64],
  ["gestion", "Taller de comunicación escrita", "Taller cuatrimestral", 72],
  ["gestion", "Inglés", "Taller cuatrimestral", 48],
  ["gestion", "Inglés técnico", "Taller cuatrimestral", 48],
  ["gestion", "Taller de Informática", "Taller cuatrimestral", 48],
  ["gestion", "Seminario de actualización / profundización", "Seminario cuatrimestral", 66],
  ["practicas", "Práctica profesional 1: Observación organizacional", "Taller cuatrimestral", 78],
  ["practicas", "Práctica profesional 2: Organización de la producción", "Taller cuatrimestral", 108],
  ["practicas", "Práctica profesional 3: Diseño de emprendimientos gastronómicos", "Taller cuatrimestral", 160],
];

test("plan: las 37 instancias coinciden fila por fila con la resolución", () => {
  assert.equal(INSTANCIAS.length, 37);
  assert.deepEqual(
    INSTANCIAS.map((x) => [x.area, x.nombre, regimen(x), x.total]),
    RESOLUCION
  );
});

test("plan: cantidades y totales por área y de la carrera", () => {
  assert.deepEqual(
    AREAS.map((a) => [a.clave, cantidadPorArea(a.clave), totalPorArea(a.clave)]),
    [
      ["analisis", 5, 256],
      ["produccion", 17, 1378],
      ["gestion", 12, 778],
      ["practicas", 3, 346],
    ]
  );
  assert.equal(totalCarrera(), 2758);
});

test("plan: cada total sale de las horas semanales por las semanas, más el trabajo autónomo", () => {
  for (const x of INSTANCIAS) {
    assert.equal(x.total, x.horasSemanales * SEMANAS[x.duracion] + x.horasAutonomas, x.nombre);
  }
});

test("plan: no hay nombres repetidos dentro de un área; cada instancia es de un área conocida", () => {
  const claves = AREAS.map((a) => a.clave);
  for (const area of claves) {
    const nombres = INSTANCIAS.filter((x) => x.area === area).map((x) => x.nombre);
    assert.equal(new Set(nombres).size, nombres.length, area);
  }
  assert.ok(INSTANCIAS.every((x) => claves.includes(x.area)));
});

test("plan: textos de los contadores y del detalle", () => {
  assert.equal(textoCantidad("analisis"), "5 materias");
  assert.equal(textoCantidad("produccion"), "17 instancias curriculares");
  assert.equal(textoCantidad("gestion"), "12 instancias curriculares");
  assert.equal(textoCantidad("practicas"), "3 prácticas");
  const buscar = (nombre) => INSTANCIAS.find((x) => x.nombre === nombre);
  assert.equal(detalleInstancia(buscar("Taller de comunicación escrita")), "Incluye 24 h de trabajo autónomo");
  assert.equal(detalleInstancia(buscar("Bebidas")), "");
  assert.match(detalleInstancia(buscar("Práctica profesional 1: Observación organizacional")), /3 semanas de 10 h/);
});

test("correlatividades: las 13 filas de la resolución, con las dos columnas completas", () => {
  assert.equal(CORRELATIVIDADES.length, 13);
  for (const c of CORRELATIVIDADES) {
    assert.ok(c.paraCursar.trim() && c.requiere.trim(), JSON.stringify(c));
  }
  assert.equal(CORRELATIVIDADES[0].paraCursar, "Elaboraciones a base de vegetales, cereales y huevos");
  assert.match(CORRELATIVIDADES[12].requiere, /hasta el 25% en curso simultáneo/);
});

test("La carrera toma el plan de los datos: sin filas ni contadores escritos a mano", () => {
  const codigo = leer("src/pages/Carrera.jsx");
  assert.match(codigo, /from "\.\.\/planDeEstudios\.js"/);
  assert.doesNotMatch(codigo, /<td>Introducción a la Gastronomía<\/td>/);
  assert.doesNotMatch(codigo, /\d+ materias( y talleres)?<\/span>/);
  assert.match(codigo, /scope="rowgroup"/);
  assert.doesNotMatch(codigo, /scope="colgroup"/);
  assert.doesNotMatch(codigo, /to="\/carrera#plan-estudios"/);
  assert.doesNotMatch(codigo, /Régimen de correlatividades \(PDF\)/);
});

test("documentos: los archivos existen y el tamaño anunciado coincide con el real", () => {
  for (const [clave, doc] of Object.entries(DOCUMENTOS)) {
    const ruta = new URL(`../../client/public${doc.archivo}`, import.meta.url);
    const bytes = readFileSync(ruta);
    assert.equal(doc.kb, Math.ceil(statSync(ruta).size / 1024), `${clave}: kb`);
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-", `${clave}: es un PDF`);
    const paginas = bytes.toString("latin1").match(/\/Type\s*\/Page(?!s)/g)?.length;
    assert.equal(doc.paginas, paginas, `${clave}: páginas`);
  }
});

test("alcances del título: texto y página de la resolución", () => {
  assert.match(ALCANCES_DEL_TITULO, /^El egresado de esta carrera estará capacitado para diseñar su propio emprendimiento/);
  assert.equal(FUENTE_ALCANCES, "Resolución N.º 1202/MEGC/2007, pág. 7");
});

test("documentos: el enlace dice tipo, tamaño y páginas, y se descarga con su nombre", () => {
  assert.equal(datosDelArchivo(DOCUMENTOS.resolucion), "PDF, 340 KB, 66 páginas");
  assert.equal(datosDelArchivo({ kb: 10, paginas: 1 }), "PDF, 10 KB, 1 página");
  assert.equal(nombreDeDescarga(DOCUMENTOS.correlatividades), "correlatividades-resolucion-1202-MEGC-2007.pdf");
  assert.equal(
    direccionPublica(DOCUMENTOS.resolucion, "https://sitio.example"),
    "https://sitio.example/docs/resolucion-1202-MEGC-2007.pdf"
  );
});

test("documentos: Ver abre otra pestaña sin acceso a la página; Descargar usa el atributo download", () => {
  const codigo = leer("src/components/Documento.jsx");
  assert.match(codigo, /target="_blank" rel="noopener noreferrer"/);
  assert.match(codigo, /download=\{nombreDeDescarga\(doc\)\}/);
  assert.match(codigo, /se abre en otra pestaña/);
});

test("compartir: menú del sistema si existe; si no, copia el enlace; cancelar no es un error", async () => {
  const doc = DOCUMENTOS.resolucion;
  const location = { origin: "https://sitio.example" };
  const url = "https://sitio.example/docs/resolucion-1202-MEGC-2007.pdf";

  let compartido;
  const conMenu = { location, navigator: { share: async (datos) => (compartido = datos) } };
  assert.equal(await compartirDocumento(doc, conMenu), "");
  assert.deepEqual(compartido, { title: doc.titulo, url });

  const cancelado = Object.assign(new Error("cancelado"), { name: "AbortError" });
  const cancela = { location, navigator: { share: async () => Promise.reject(cancelado) } };
  assert.equal(await compartirDocumento(doc, cancela), "");

  let copiado;
  const sinMenu = { location, navigator: { clipboard: { writeText: async (t) => (copiado = t) } } };
  assert.equal(await compartirDocumento(doc, sinMenu), "Enlace copiado.");
  assert.equal(copiado, url);

  const nada = { location, navigator: {} };
  assert.equal(await compartirDocumento(doc, nada), `No se pudo copiar el enlace. Dirección: ${url}`);
});
