import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  OPCIONES_DE_ANIO,
  TODOS_LOS_ANIOS,
  anioInicial,
  filasDeHorarios,
  textoFecha,
  textoSinMaterias,
  turnosDisponibles,
} from "../../client/src/academica.js";
import { DOCUMENTOS } from "../../client/src/documentos.js";

// Página de Alumnos: «Todos los años» en los horarios publicados y documentos de prácticas.

const leer = (ruta) => readFileSync(new URL(`../../client/src/${ruta}`, import.meta.url), "utf8");

const materia = (id, anioCarrera, turno, dias) => ({ id, materia: `M${id}`, anioCarrera, turno, dias });
const HORARIOS = [
  materia("a", 2, "noche", [{ dia: "martes", desde: "18:00", hasta: "19:20" }]),
  materia("b", 1, "noche", [
    { dia: "martes", desde: "18:00", hasta: "19:20" },
    { dia: "lunes", desde: "19:30", hasta: "21:00" },
  ]),
  materia("c", 3, "noche", [{ dia: "martes", desde: "18:00", hasta: "19:20" }]),
  materia("d", 1, "manana", [{ dia: "lunes", desde: "08:00", hasta: "10:00" }]),
  materia("e", 3, "noche", [{ dia: "lunes", desde: "18:00", hasta: "19:20" }]),
];
const resumen = (filas) => filas.map((f) => `${f.dia} ${f.desde} ${f.h.anioCarrera}.º ${f.h.id}`);

test("horarios: botones de los tres años y «Todos los años» al final; al entrar, el primer año con materias", () => {
  assert.deepEqual(
    OPCIONES_DE_ANIO.map((o) => o.texto),
    ["1.º año", "2.º año", "3.º año", "Todos los años"],
  );
  assert.equal(anioInicial(HORARIOS), 1);
  assert.equal(anioInicial(HORARIOS.filter((h) => h.anioCarrera > 1)), 2);
  assert.equal(anioInicial([]), 1);
});

test("horarios: «Todos los años» agrupa por año y, dentro de cada año, ordena por día y hora", () => {
  assert.deepEqual(resumen(filasDeHorarios(HORARIOS, { anio: TODOS_LOS_ANIOS })), [
    "lunes 08:00 1.º d",
    "lunes 19:30 1.º b",
    "martes 18:00 1.º b",
    "martes 18:00 2.º a",
    // Martes de 18:00 a 19:20 cursan los tres años: cada materia aparece en el grupo de su año.
    "lunes 18:00 3.º e",
    "martes 18:00 3.º c",
  ]);
});

test("horarios: el desplegable de turno ofrece solo los turnos del año elegido", () => {
  const nombres = (anio) => turnosDisponibles(HORARIOS, anio).map((t) => t.valor);
  assert.deepEqual(nombres(1), ["noche", "manana"], "1.º año tiene noche y mañana");
  assert.deepEqual(nombres(2), ["noche"], "2.º año solo noche: no se ofrece «Mañana»");
  assert.deepEqual(nombres(TODOS_LOS_ANIOS), ["noche", "manana"]);
  // La tabla usa esta función, y la vista previa del panel se rearma al cambiar de período.
  assert.match(leer("components/HorariosPublicos.jsx"), /turnosDisponibles\(horarios, anio\)/);
  assert.match(leer("pages/AdminAcademica.jsx"), /<HorariosPublicos key=\{codigoPeriodo\(estado\)\}/);
  assert.match(leer("components/HorariosDeCursada.jsx"), /<HorariosPublicos\s+key=\{actual\.periodo\}/);
});

test("horarios: un año solo muestra el suyo; el turno se combina con el año", () => {
  assert.deepEqual(resumen(filasDeHorarios(HORARIOS, { anio: 1 })), [
    "lunes 08:00 1.º d",
    "lunes 19:30 1.º b",
    "martes 18:00 1.º b",
  ]);
  assert.deepEqual(resumen(filasDeHorarios(HORARIOS, { anio: 1, turno: "noche" })), [
    "lunes 19:30 1.º b",
    "martes 18:00 1.º b",
  ]);
  assert.deepEqual(resumen(filasDeHorarios(HORARIOS, { anio: TODOS_LOS_ANIOS, turno: "manana" })), [
    "lunes 08:00 1.º d",
  ]);
  assert.deepEqual(filasDeHorarios(HORARIOS, { anio: 2, turno: "manana" }), []);
  assert.equal(textoSinMaterias(2), "No hay materias de 2.º año en este período.");
  assert.equal(textoSinMaterias(TODOS_LOS_ANIOS), "No hay materias en este período.");
});

test("horarios: con «Todos los años», una fila con el nombre de cada año, distinta del encabezado y de las materias", () => {
  const tabla = leer("components/HorariosPublicos.jsx");
  assert.match(tabla, /filasDeHorarios\(horarios, \{ anio, turno \}\)/, "una sola lógica de filtrado");
  // Cada año en su propio <tbody>, encabezado por la fila con su nombre, que ocupa todas las columnas
  // (scope="rowgroup" solo es correcto si el grupo es un <tbody> propio).
  assert.match(tabla, /\{grupos\.map\(\(g\) => \(\s*<tbody role="rowgroup" key=\{g\.anio \?\? "unico"\}>/);
  assert.match(tabla, /\{porAnio && \(\s*<tr role="row" className="fila-anio">\s*<th role="rowheader" scope="rowgroup" colSpan=\{columnas\}>\s*\{g\.anio\}\.º año/);
  assert.equal((tabla.match(/scope="rowgroup"/g) || []).length, 1);
  assert.doesNotMatch(tabla, /col-anio|anio-movil/, "ya no hace falta la columna Año");
  assert.doesNotMatch(tabla, /\.° año/, "ordinal «.º»");
  const estilos = leer("styles.css");
  assert.match(estilos, /\.horarios-publicos \.fila-anio th \{[^}]*background: var\(--verde-suave\);/, "fondo propio, distinto del gris del encabezado");
  assert.match(tabla, /data-etiqueta="Docente"/, "en el celular cada dato lleva su nombre");
  // Accesibilidad: los encabezados se ocultan solo a la vista y la tabla conserva sus roles.
  assert.match(estilos, /\.horarios-publicos thead \{\s*position: absolute;[\s\S]*?clip: rect\(0 0 0 0\);/);
  assert.doesNotMatch(estilos, /\.horarios-publicos thead[^{]*\{\s*display: none/);
  assert.match(estilos, /content: attr\(data-etiqueta\) ": " \/ "";/, "rótulo visible, decorativo para lectores");
  for (const rol of ['role="table"', 'role="row"', 'role="columnheader"', 'role="cell"']) assert.ok(tabla.includes(rol), rol);
  // La vista previa del panel usa el mismo componente.
  assert.match(leer("components/HorariosDeCursada.jsx") + leer("pages/AdminAcademica.jsx"), /<HorariosPublicos/);
});

test("Alumnos: franjas alternadas, un solo PDF por llamado y documentos de prácticas antes de los enlaces útiles", () => {
  const pagina = leer("pages/Alumnos.jsx");
  const practicas = pagina.indexOf("Prácticas profesionalizantes y pasantías");
  assert.ok(practicas > pagina.indexOf("<MesasDeExamen />") && practicas < pagina.indexOf("<h2>Enlaces útiles</h2>"));
  assert.match(pagina, /<Documento doc=\{DOCUMENTOS\.practicasProfesionalizantes\} \/>/);
  assert.match(pagina, /<Documento doc=\{DOCUMENTOS\.leyPasantias\} \/>/);
  assert.match(DOCUMENTOS.leyPasantias.descripcion, /No es la normativa de las prácticas profesionalizantes/);
  assert.doesNotMatch(DOCUMENTOS.leyPasantias.descripcion + DOCUMENTOS.practicasProfesionalizantes.descripcion, /regula todas/);
  // Enlaces útiles: tres columnas y tarjetas blancas con borde sobre la franja gris.
  assert.match(pagina, /<ul className="enlaces tres-col">/);
  const estilosAlumnos = leer("styles.css");
  assert.match(estilosAlumnos, /\.tres-col \{\s*grid-template-columns: repeat\(3, 1fr\);/);
  assert.match(estilosAlumnos, /\.seccion-alt \.enlaces a \{\s*background: var\(--superficie\);\s*border-color: var\(--borde\);/);
  // Una franja por sección, con el fondo alternado: las mesas van en gris, como los enlaces útiles.
  const franjas = [...pagina.matchAll(/<section className="(seccion[^"]*|banner[^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(franjas, ["banner velo-suave", "seccion", "seccion seccion-alt", "seccion", "seccion seccion-alt"]);
  const orden = ["<HorariosDeCursada />", "<MesasDeExamen />", "Prácticas profesionalizantes y pasantías", "<h2>Enlaces útiles</h2>"];
  const posiciones = orden.map((texto) => pagina.indexOf(texto));
  assert.ok(posiciones.every((p, i) => p > 0 && (i === 0 || p > posiciones[i - 1])), "horarios, mesas, prácticas y enlaces");
  const mesasEnGris = pagina.slice(pagina.indexOf('<section className="seccion seccion-alt">'), pagina.indexOf("<MesasDeExamen />"));
  assert.doesNotMatch(mesasEnGris, /<\/section>/, "las mesas están dentro de la primera franja gris");
  // Cada llamado: un solo botón de PDF y la fecha de actualización en el encabezado, como en los horarios.
  const mesas = leer("components/MesasDeExamen.jsx");
  assert.equal(mesas.match(/<a\b/g).length, 1, "un solo enlace de descarga por llamado");
  assert.match(mesas, />\s*Descargar mesas \(PDF\)\s*</);
  assert.match(mesas, /aria-label=\{`Descargar mesas de \$\{llamado\.nombre\} \(PDF\)`\}/, "el lector de pantalla oye el llamado");
  assert.doesNotMatch(mesas, /className="actualizado"/, "la fecha ya no va al lado del botón");
  assert.match(mesas, /actualizado=\{/);
  const llamado = leer("components/LlamadoPublico.jsx");
  assert.match(llamado, /\{actualizado && <p className="actualizado-llamado">\{actualizado\}<\/p>\}/);
  // La vista previa del panel no muestra la fecha: no pasa "actualizado".
  assert.match(leer("pages/AdminMesas.jsx"), /<LlamadoPublico llamado=\{llamado\} \/>/);
  // Misma fecha, sin hora, que en los horarios.
  assert.match(leer("components/HorariosDeCursada.jsx"), /import \{ textoFecha, textoPeriodo \} from "\.\.\/academica\.js";/);
  assert.equal(textoFecha("2026-11-08T05:40:00Z"), "8 de noviembre de 2026");
});

