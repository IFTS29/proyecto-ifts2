import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  OPCIONES_DE_ANIO,
  TODOS_LOS_ANIOS,
  anioInicial,
  filasDeHorarios,
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

test("horarios: «Todos los años» ordena por día, hora y año; las materias simultáneas aparecen todas", () => {
  assert.deepEqual(resumen(filasDeHorarios(HORARIOS, { anio: TODOS_LOS_ANIOS })), [
    "lunes 08:00 1.º d",
    "lunes 18:00 3.º e",
    "lunes 19:30 1.º b",
    // Martes de 18:00 a 19:20 cursan los tres años: tres filas, ordenadas por año.
    "martes 18:00 1.º b",
    "martes 18:00 2.º a",
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

test("horarios: la tabla suma la columna Año solo con «Todos los años», y en el celular el año va en la fila", () => {
  const tabla = leer("components/HorariosPublicos.jsx");
  assert.match(tabla, /filasDeHorarios\(horarios, \{ anio, turno \}\)/, "una sola lógica de filtrado");
  assert.match(tabla, /\{conAnio && \(\s*<th role="columnheader" scope="col" className="col-anio">/);
  assert.match(tabla, /<span className="anio-movil" aria-hidden="true">/);
  assert.doesNotMatch(tabla, /\.° año/, "ordinal «.º»");
  const estilos = leer("styles.css");
  assert.match(tabla, /data-etiqueta="Docente"/, "en el celular cada dato lleva su nombre");
  // Accesibilidad: los encabezados se ocultan solo a la vista y la tabla conserva sus roles.
  assert.match(estilos, /\.horarios-publicos thead \{\s*position: absolute;[\s\S]*?clip: rect\(0 0 0 0\);/);
  assert.doesNotMatch(estilos, /\.horarios-publicos thead[^{]*\{\s*display: none/);
  assert.match(estilos, /content: attr\(data-etiqueta\) ": " \/ "";/, "rótulo visible, decorativo para lectores");
  for (const rol of ['role="table"', 'role="row"', 'role="columnheader"', 'role="cell"']) assert.ok(tabla.includes(rol), rol);
  // La vista previa del panel usa el mismo componente.
  assert.match(leer("components/HorariosDeCursada.jsx") + leer("pages/AdminAcademica.jsx"), /<HorariosPublicos/);
});

test("Alumnos: documentos de prácticas y pasantías antes de los enlaces útiles, presentados como materiales distintos", () => {
  const pagina = leer("pages/Alumnos.jsx");
  const practicas = pagina.indexOf("Prácticas profesionalizantes y pasantías");
  assert.ok(practicas > pagina.indexOf("<MesasDeExamen />") && practicas < pagina.indexOf("<h2>Enlaces útiles</h2>"));
  assert.match(pagina, /<Documento doc=\{DOCUMENTOS\.practicasProfesionalizantes\} \/>/);
  assert.match(pagina, /<Documento doc=\{DOCUMENTOS\.leyPasantias\} \/>/);
  assert.match(DOCUMENTOS.leyPasantias.descripcion, /No es la normativa de las prácticas profesionalizantes/);
  assert.doesNotMatch(DOCUMENTOS.leyPasantias.descripcion + DOCUMENTOS.practicasProfesionalizantes.descripcion, /regula todas/);
});
