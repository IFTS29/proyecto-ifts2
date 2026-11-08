import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Mesas de examen en el celular (H-95): la tabla se dibuja como fichas, sin perder la estructura de tabla para los
// lectores de pantalla. Las pruebas de navegador (320, 390 y 1280 px) controlan cómo se ve.

const leer = (ruta) => readFileSync(new URL(`../../client/src/${ruta}`, import.meta.url), "utf8");

test("la tabla de mesas conserva sus roles y encabezados, con filtro por año y una fila de título por año", () => {
  const llamado = leer("components/LlamadoPublico.jsx");
  for (const rol of ["table", "rowgroup", "row", "columnheader", "cell"]) {
    assert.match(llamado, new RegExp(`role="${rol}"`), `rol ${rol}`);
  }
  assert.match(llamado, /data-etiqueta="Mesa examinadora"/);
  assert.match(llamado, /data-etiqueta="Aula"/);
  // Botones de año como en los horarios; con «Todos los años», un <tbody> por año con su fila de título.
  assert.match(llamado, /OPCIONES_DE_ANIO\.map\(\(o\) => \(\s*<button key=\{o\.valor\} type="button" aria-pressed=\{anio === o\.valor\}/);
  assert.match(llamado, /useState\(\(\) => anioInicial\(llamado\.mesas\)\)/, "al entrar, el primer año con mesas");
  assert.match(llamado, /<tbody role="rowgroup" key=\{g\.anio\}>\s*\{porAnio && \(\s*<tr role="row" className="fila-anio">\s*<th role="rowheader" scope="rowgroup" colSpan=\{columnas\}>/);
  assert.match(llamado, /No hay mesas de \{anio\}\.º año en este llamado\./);
  assert.doesNotMatch(llamado, /col-anio|anio-movil/, "el año ya no es una columna");
  assert.match(llamado, /<div className="tabla-caja" key=\{anio\}>/, "al cambiar de año, la tabla vuelve al principio");
  // Los datos que faltan se siguen mostrando como «A confirmar».
  assert.match(llamado, /\{m\.tribunal \|\| "A confirmar"\}/);
  assert.match(llamado, /\{m\.aula \|\| "A confirmar"\}/);
  // Sin fecha ni hora: una sola frase a la vista, que el lector de pantalla no lee.
  assert.match(llamado, /className=\{!m\.fecha && !m\.hora \? "sin-fecha-ni-hora" : undefined\}/);
  assert.match(llamado, /<span className="fecha-hora-movil" aria-hidden="true">\s*Fecha y hora a confirmar\s*<\/span>/);
  // Alumnos y la vista previa del panel usan el mismo componente.
  assert.match(leer("components/MesasDeExamen.jsx"), /<LlamadoPublico/);
  assert.match(leer("pages/AdminMesas.jsx"), /<LlamadoPublico llamado=\{llamado\} \/>/);
});

test("las fichas tienen reglas propias de las mesas, dentro del ancho de celular", () => {
  const estilos = leer("styles.css");
  const inicio = estilos.indexOf("/* Mesas de examen en el celular (H-95)");
  assert.ok(inicio > 0, "bloque de las mesas");
  const bloque = estilos.slice(inicio, estilos.indexOf("/* Alumnos: turno de mesas o período", inicio));
  assert.match(bloque, /@media \(max-width: 600px\)/);
  assert.match(bloque, /\.llamado-publico thead \{\s*position: absolute;/);
  assert.match(bloque, /\.llamado-publico \.fila-anio \{\s*display: block;/, "fila del año como subtítulo");
  assert.match(bloque, /content: attr\(data-etiqueta\) ": " \/ "";/, "rótulo decorativo");
  assert.match(bloque, /\.llamado-publico \.acciones \.boton \{\s*width: 100%;/);
  assert.doesNotMatch(bloque, /horarios-publicos/, "no toca los horarios");
});

test("vista previa del panel: solo el título «Vista previa · …», sin cartel", () => {
  for (const pagina of ["pages/AdminMesas.jsx", "pages/AdminAcademica.jsx"]) {
    const codigo = leer(pagina);
    assert.match(codigo, /titulo=\{`Vista previa · \$\{/, pagina);
    assert.doesNotMatch(codigo, /aviso-vista-previa|Versión de trabajo|No es lo publicado/, pagina);
  }
  assert.doesNotMatch(leer("styles.css"), /\.aviso-vista-previa/);
});
