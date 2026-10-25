import PDFDocument from "pdfkit";
import { NOMBRE_TURNO, textoPeriodo } from "./academica.js";

// Arma el PDF de horarios que se descarga desde la página de Alumnos (lo publicado)
// y desde el panel (la vista previa de los datos de trabajo, con una marca bien visible).
// Usa las fuentes estándar de PDF (Helvetica), que incluyen tildes, ñ y el símbolo °.

const COLOR = {
  verde: "#007a40",
  verdeSuave: "#e4f2e9",
  naranja: "#ee8a36",
  rojo: "#b42318",
  rojoSuave: "#fdecea",
  texto: "#15201a",
  suave: "#4b5a52",
  borde: "#dce5df",
  enlace: "#1a56db",
};

const MARGEN = 40;
const NOMBRE_DIA = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};
const ORDEN_DIA = Object.keys(NOMBRE_DIA);
export const MARCA_VISTA_PREVIA = "Vista previa — Versión de trabajo";

const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);
const sinCeros = (hora) => (hora.endsWith(":00") ? String(Number(hora.slice(0, 2))) : hora);
const textoFranja = ({ desde, hasta }) => `${sinCeros(desde)} a ${sinCeros(hasta)} h`;

// Fecha en hora de Argentina: "23 de octubre de 2026".
export function textoFecha(fechaIso) {
  if (!fechaIso) return "";
  return new Date(fechaIso).toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Encabezado verde con el nombre del instituto y de la carrera, como en el sitio.
function encabezado(doc, titulo, subtitulo) {
  const ancho = doc.page.width;
  doc.rect(0, 0, ancho, 78).fill(COLOR.verde);
  doc.rect(0, 78, ancho, 4).fill(COLOR.naranja);
  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(15)
    .text("Instituto de Formación Técnica Superior N.° 2 · D.E. 20", MARGEN, 22, { width: ancho - MARGEN * 2 })
    .font("Helvetica")
    .fontSize(11)
    .text("Tecnicatura Superior en Emprendimientos Gastronómicos", MARGEN, 44);

  doc.fillColor(COLOR.texto).font("Helvetica-Bold").fontSize(20).text(titulo, MARGEN, 104);
  doc.fillColor(COLOR.suave).font("Helvetica").fontSize(12).text(subtitulo, MARGEN, doc.y + 2);
  doc.moveDown(1);
}

// Recuadro rojo debajo del título: deja claro que no es la información publicada.
function avisoVistaPrevia(doc) {
  const ancho = doc.page.width - MARGEN * 2;
  const y = doc.y;
  doc.rect(MARGEN, y, ancho, 34).fill(COLOR.rojoSuave);
  doc
    .fillColor(COLOR.rojo)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(`${MARCA_VISTA_PREVIA}. No es la información publicada para los alumnos.`, MARGEN + 10, y + 11, {
      width: ancho - 20,
    });
  doc.x = MARGEN;
  doc.y = y + 34;
  doc.moveDown(1);
}

// Tabla simple: encabezado verde claro, filas con línea divisoria y salto de página que repite el encabezado.
function tabla(doc, columnas, filas) {
  const x0 = MARGEN;
  const anchoTotal = doc.page.width - MARGEN * 2;
  const anchos = columnas.map((c) => c.ancho * anchoTotal);
  const relleno = 6;
  const limite = () => doc.page.height - MARGEN - 40; // deja lugar para el pie

  const altoFila = (celdas, fuente) => {
    doc.font(fuente).fontSize(10);
    const altos = celdas.map((t, i) => doc.heightOfString(String(t), { width: anchos[i] - relleno * 2 }));
    return Math.max(...altos) + relleno * 2;
  };

  const fila = (celdas, { fondo, fuente = "Helvetica", color = COLOR.texto }) => {
    const alto = altoFila(celdas, fuente);
    if (doc.y + alto > limite()) {
      doc.addPage();
      doc.y = MARGEN;
      if (!fondo) fila(columnas.map((c) => c.titulo), { fondo: COLOR.verdeSuave, fuente: "Helvetica-Bold" });
    }
    const y = doc.y;
    if (fondo) doc.rect(x0, y, anchoTotal, alto).fill(fondo);
    let x = x0;
    celdas.forEach((t, i) => {
      doc
        .font(fuente)
        .fontSize(10)
        .fillColor(color)
        .text(String(t), x + relleno, y + relleno, { width: anchos[i] - relleno * 2 });
      x += anchos[i];
    });
    doc.moveTo(x0, y + alto).lineTo(x0 + anchoTotal, y + alto).lineWidth(0.5).strokeColor(COLOR.borde).stroke();
    doc.x = x0;
    doc.y = y + alto;
  };

  fila(columnas.map((c) => c.titulo), { fondo: COLOR.verdeSuave, fuente: "Helvetica-Bold" });
  filas.forEach((celdas) => fila(celdas, {}));
  doc.moveDown(1.2);
}

// Título de cada año. Si la tabla entera no entra en lo que queda de la página pero sí en una nueva,
// empieza en la página siguiente para no cortarla.
function subtituloSeccion(doc, texto, cantidadFilas) {
  const limite = doc.page.height - MARGEN - 40;
  const estimado = 30 + (cantidadFilas + 1) * 22;
  if (doc.y + estimado > limite && estimado < limite - MARGEN) doc.addPage();
  doc.fillColor(COLOR.verde).font("Helvetica-Bold").fontSize(13).text(texto, MARGEN, doc.y);
  doc.moveDown(0.4);
}

// Pie en todas las páginas: fecha, enlace a Contacto y número de página.
// En la vista previa, el pie repite la marca, por si se imprime una sola hoja.
function pies(doc, { fecha, urlContacto, vistaPrevia }) {
  const rango = doc.bufferedPageRange();
  for (let i = 0; i < rango.count; i++) {
    doc.switchToPage(rango.start + i);
    const y = doc.page.height - MARGEN - 18;
    const ancho = doc.page.width - MARGEN * 2;
    doc.moveTo(MARGEN, y - 6).lineTo(MARGEN + ancho, y - 6).lineWidth(0.5).strokeColor(COLOR.borde).stroke();
    const inicio = vistaPrevia ? `${MARCA_VISTA_PREVIA}. ` : fecha ? `Actualizado el ${fecha}. ` : "";
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(vistaPrevia ? COLOR.rojo : COLOR.suave)
      .text(`${inicio}Consultas: `, MARGEN, y, { continued: true, lineBreak: false })
      .fillColor(COLOR.enlace)
      .text(urlContacto, { link: urlContacto, underline: true, continued: false, lineBreak: false });
    doc
      .fillColor(COLOR.suave)
      .text(`Página ${i + 1} de ${rango.count}`, MARGEN, y, { width: ancho, align: "right", lineBreak: false });
  }
}

// Devuelve el PDF terminado como Buffer.
function generar(dibujar, { titulo }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: MARGEN,
      bufferPages: true,
      info: { Title: titulo, Author: "IFTS N.° 2 D.E. 20" },
    });
    const partes = [];
    doc.on("data", (parte) => partes.push(parte));
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);
    try {
      dibujar(doc);
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

// Horarios de un período: una tabla por año de la carrera, con una fila por día de cursada.
// - "horarios": la copia publicada (sitio público) o los datos de trabajo (vista previa).
// - "fecha": la de la última publicación; en la vista previa no se usa.
// Columnas de la tabla. Si el PDF tiene un solo turno, va en el subtítulo; si tiene varios, cada fila
// lleva su turno. El aula aparece solo si alguna materia la tiene cargada.
// Cada columna tiene un peso; el ancho final se reparte en proporción.
export function columnasHorarios(horarios) {
  const conTurno = new Set(horarios.map((h) => h.turno)).size > 1;
  const conAula = horarios.some((h) => h.aula);
  const columnas = [
    { titulo: "Día", peso: 13, valor: (f) => NOMBRE_DIA[f.dia] },
    { titulo: "Horario", peso: 15, valor: (f) => textoFranja(f) },
    ...(conTurno ? [{ titulo: "Turno", peso: 10, valor: (f) => mayuscula(NOMBRE_TURNO[f.h.turno]) }] : []),
    { titulo: "Materia", peso: 38, valor: (f) => f.h.materia },
    { titulo: "Docente", peso: 24, valor: (f) => f.h.profesor || "A designar" },
    ...(conAula ? [{ titulo: "Aula", peso: 11, valor: (f) => f.h.aula || "—" }] : []),
  ];
  const total = columnas.reduce((suma, c) => suma + c.peso, 0);
  return columnas.map((c) => ({ ...c, ancho: c.peso / total }));
}

export function pdfHorarios({ horarios, periodo, urlContacto, fecha = "", vistaPrevia = false }) {
  const turnos = [...new Set(horarios.map((h) => h.turno))];
  const turno = turnos.length === 1 ? ` · Turno ${NOMBRE_TURNO[turnos[0]]}` : "";
  const subtitulo = `${textoPeriodo(periodo)}${turno}`;
  const columnas = columnasHorarios(horarios);
  const titulo = `Horarios de cursada - ${subtitulo}`;

  return generar(
    (doc) => {
      encabezado(doc, "Horarios de cursada", subtitulo);
      if (vistaPrevia) avisoVistaPrevia(doc);
      for (const anio of [1, 2, 3]) {
        const filas = horarios
          .filter((h) => h.anioCarrera === anio)
          .flatMap((h) => h.dias.map((franja) => ({ ...franja, h })))
          .sort((a, b) => ORDEN_DIA.indexOf(a.dia) - ORDEN_DIA.indexOf(b.dia) || a.desde.localeCompare(b.desde))
          .map((f) => columnas.map((c) => c.valor(f)));
        if (filas.length === 0) continue;
        subtituloSeccion(doc, `${anio}.° año`, filas.length);
        tabla(doc, columnas, filas);
      }
      pies(doc, { fecha, urlContacto, vistaPrevia });
    },
    { titulo: vistaPrevia ? `${MARCA_VISTA_PREVIA} - ${titulo}` : titulo },
  );
}