// Ingreso en el sitio (Ingreso.jsx): textos de fechas y estado de la preinscripción, a partir de la sección
// «ingreso» del contenido institucional. Las fechas se guardan como día de calendario «AAAA-MM-DD».

const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

// Día de hoy en Argentina, con el mismo formato que las fechas guardadas (así se comparan como texto).
// Se arma con las partes numéricas de la fecha y no con el formato de un idioma, que puede variar
// entre navegadores.
const PARTES_DEL_DIA = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function hoyEnArgentina(ahora = new Date()) {
  const parte = Object.fromEntries(PARTES_DEL_DIA.formatToParts(ahora).map(({ type, value }) => [type, value]));
  return `${parte.year}-${parte.month}-${parte.day}`;
}

// «8 de junio de 2026». Se arma al mediodía de Argentina para que la zona horaria no cambie el día.
const partes = (dia) => {
  const fecha = new Date(`${dia}T12:00:00-03:00`);
  const opciones = { timeZone: ZONA_HORARIA };
  return {
    dia: fecha.toLocaleDateString("es-AR", { ...opciones, day: "numeric" }),
    mes: fecha.toLocaleDateString("es-AR", { ...opciones, month: "long" }),
    anio: dia.slice(0, 4),
  };
};
export const textoDeDia = (dia) => {
  const { dia: d, mes, anio } = partes(dia);
  return `${d} de ${mes} de ${anio}`;
};

// «Del 3 al 7 de agosto de 2026», «Del 8 de junio al 28 de julio de 2026», «Del 6 de noviembre de 2026
// al 5 de marzo de 2027», «3 de agosto de 2026» (un solo día) o «A partir del 10 de agosto de 2026» (sin cierre).
export function textoDeRango({ desde, hasta }) {
  if (!hasta) return `A partir del ${textoDeDia(desde)}`;
  if (hasta === desde) return textoDeDia(desde);
  const inicio = partes(desde);
  const fin = partes(hasta);
  let primero = textoDeDia(desde);
  if (inicio.anio === fin.anio) primero = inicio.mes === fin.mes ? inicio.dia : `${inicio.dia} de ${inicio.mes}`;
  return `Del ${primero} al ${textoDeDia(hasta)}`;
}

// Estado cuando todavía no hay fechas de la próxima convocatoria.
export const FECHAS_A_CONFIRMAR = { tipo: "sin-convocatoria", etiqueta: "Fechas a confirmar" };

// Estado de la preinscripción, que es la etapa con inicio y cierre conocidos. No se calcula un estado de
// toda la convocatoria: etapas como «Inicio de clases» solo tienen fecha de comienzo.
export function estadoDePreinscripcion(ingreso, hoy = hoyEnArgentina()) {
  const { desde, hasta } = ingreso?.preinscripcion ?? {};
  if (!ingreso?.convocatoria || !desde || !hasta) {
    return FECHAS_A_CONFIRMAR;
  }
  if (hoy < desde) {
    return { tipo: "proxima", etiqueta: "Próxima preinscripción", texto: `La preinscripción abre el ${textoDeDia(desde)}.` };
  }
  if (hoy <= hasta) {
    return { tipo: "abierta", etiqueta: "Preinscripción abierta", texto: `Hasta el ${textoDeDia(hasta)}.` };
  }
  return {
    tipo: "finalizada",
    etiqueta: "Preinscripción finalizada",
    texto: `La preinscripción de esta convocatoria cerró el ${textoDeDia(hasta)}.`,
  };
}

// Una etapa está en curso si hoy está entre su inicio y su cierre. Varias pueden estarlo a la vez
// (por ejemplo, el curso y el examen). Las que no tienen cierre nunca se marcan: no se inventa un fin.
export const estaEnCurso = ({ desde, hasta }, hoy = hoyEnArgentina()) => Boolean(hasta) && desde <= hoy && hoy <= hasta;

// Última fecha conocida del cronograma: la más tardía entre todos los inicios y cierres (también las etapas
// «A partir del…», que no tienen cierre). "" si no hay convocatoria.
export function ultimaFechaConocida(ingreso) {
  if (!ingreso?.convocatoria || !ingreso.preinscripcion?.desde) return "";
  const pasos = [ingreso.preinscripcion, ...(ingreso.etapas ?? [])];
  const fechas = pasos.flatMap(({ desde, hasta }) => [desde, hasta]).filter(Boolean);
  return fechas.reduce((ultima, fecha) => (fecha > ultima ? fecha : ultima), "");
}

// Ya pasaron todas las fechas conocidas: el sitio la muestra debajo, como convocatoria anterior de referencia,
// hasta que se cargue una nueva. No se afirma que el proceso terminó: solo que pasaron sus fechas.
export function esConvocatoriaAnterior(ingreso, hoy = hoyEnArgentina()) {
  const ultima = ultimaFechaConocida(ingreso);
  return Boolean(ultima) && hoy > ultima;
}

// Cronograma para mostrar: la preinscripción primero y después las demás etapas, en el orden cargado.
export function cronogramaDe(ingreso, hoy = hoyEnArgentina()) {
  if (!ingreso?.convocatoria || !ingreso.preinscripcion?.desde) return [];
  const pasos = [{ nombre: "Preinscripción", ...ingreso.preinscripcion }, ...(ingreso.etapas ?? [])];
  return pasos.map((paso) => ({ ...paso, fechas: textoDeRango(paso), enCurso: estaEnCurso(paso, hoy) }));
}
