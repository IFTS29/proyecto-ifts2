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

// ---- Panel: convocatoria con desplegables, video y valores por defecto ----

// La convocatoria se guarda como «2.º cuatrimestre 2026». En el panel se elige con dos desplegables.
const FORMATO_CONVOCATORIA = /^([12])\.º cuatrimestre (\d{4})$/;

export function partesDeConvocatoria(texto = "") {
  const partes = String(texto).match(FORMATO_CONVOCATORIA);
  return partes ? { cuatrimestre: partes[1], anio: partes[2] } : { cuatrimestre: "", anio: "" };
}

// "" si falta alguna de las dos partes: el formulario no deja guardar una convocatoria a medias.
export const textoDeConvocatoria = (cuatrimestre, anio) =>
  cuatrimestre && anio ? `${cuatrimestre}.º cuatrimestre ${anio}` : "";

// Años del desplegable: el actual y el siguiente. Si la convocatoria guardada es de otro año (por ejemplo, la de
// 2026 vista en 2027), también se ofrece, para poder guardar otros cambios sin perderla.
export function aniosDeConvocatoria(hoy = hoyEnArgentina(), anioGuardado = "") {
  const actual = Number(hoy.slice(0, 4));
  const anios = new Set([actual, actual + 1]);
  if (anioGuardado) anios.add(Number(anioGuardado));
  return [...anios].sort((a, b) => a - b).map(String);
}

// Video de YouTube de la convocatoria. Solo se acepta la dirección de un video (watch, youtu.be, shorts o embed);
// el reproductor se arma acá con el identificador, nunca con código pegado. Misma regla que el servidor.
export function idDeYoutube(valor) {
  let url;
  try {
    url = new URL(String(valor || "").trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^(www|m)\./, "");
  let id = null;
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const ruta = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/);
    id = url.pathname === "/watch" ? url.searchParams.get("v") : ruta?.[1];
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

// Reproductor sin cookies de seguimiento hasta que se reproduce, y enlace para verlo en YouTube.
export function videoDeYoutube(valor) {
  const id = idDeYoutube(valor);
  if (!id) return null;
  return { insertar: `https://www.youtube-nocookie.com/embed/${id}`, ver: `https://www.youtube.com/watch?v=${id}` };
}

const ETAPA_VACIA = { nombre: "", desde: "", hasta: "", detalle: "", textoEnlace: "", urlEnlace: "" };

// Lo guardado antes de este cambio no tiene enlaces por etapa ni video: se completan con vacíos, siempre con el
// mismo orden de campos (el panel compara el formulario con lo guardado para saber si hay cambios).
export function normalizarIngreso(datos = {}) {
  const pre = datos.preinscripcion ?? {};
  return {
    convocatoria: datos.convocatoria ?? "",
    preinscripcion: { desde: pre.desde ?? "", hasta: pre.hasta ?? "", detalle: pre.detalle ?? "" },
    etapas: (datos.etapas ?? []).map((e) => Object.fromEntries(Object.keys(ETAPA_VACIA).map((k) => [k, e[k] ?? ""]))),
    video: datos.video ?? "",
    correo: datos.correo ?? "",
  };
}

export const etapaNueva = () => ({ ...ETAPA_VACIA });

// «Quitar convocatoria» y «Preparar convocatoria nueva»: vacían el cuatrimestre, el año, todas las fechas, el video
// y los enlaces de las etapas (un aula o un curso pueden ser de ese período). Conservan los nombres, las aclaraciones
// y el correo: la próxima convocatoria se carga con fechas nuevas, sin arrastrar datos de la anterior.
export function vaciarConvocatoria(datos) {
  return {
    ...datos,
    convocatoria: "",
    preinscripcion: { ...datos.preinscripcion, desde: "", hasta: "" },
    etapas: datos.etapas.map((e) => ({ ...e, desde: "", hasta: "", textoEnlace: "", urlEnlace: "" })),
    video: "",
  };
}

// Tiene datos propios de una convocatoria (fechas, video o enlaces), que no deberían pasar a otra.
export const tieneDatosDeConvocatoria = (datos) =>
  Boolean(datos.video) ||
  [datos.preinscripcion, ...datos.etapas].some((e) => e.desde || e.hasta) ||
  datos.etapas.some((e) => e.textoEnlace || e.urlEnlace);

// Pasar de una convocatoria a otra con fechas, video o enlaces cargados pide confirmar que se prepara una nueva:
// si no, se publicaría «1.º cuatrimestre 2027» con las fechas de 2026. Se compara con la convocatoria elegida en el
// formulario en ese momento («actual»); si esa elección está a medias, con la guardada. No se pregunta si no hay de
// dónde venir, si se vuelve a elegir la misma, si la nueva está a medias (se pregunta al completarla) o si los
// datos ya están vacíos (por ejemplo, al cambiar el segundo desplegable después de confirmar). Si después se cargan
// datos nuevos, se vuelve a preguntar.
export function pideConfirmarConvocatoriaNueva({ actual, guardada, nueva, datos }) {
  const desde = actual || guardada;
  return Boolean(desde) && Boolean(nueva) && nueva !== desde && tieneDatosDeConvocatoria(datos);
}

// ---- Historial de convocatorias (panel, solo de consulta) ----

// Pasos de una convocatoria guardada en el historial, con sus fechas en texto. Sin fechas: «Sin fechas».
export function pasosDelHistorial(datos = {}) {
  const pasos = [{ nombre: "Preinscripción", ...(datos.preinscripcion ?? {}) }, ...(datos.etapas ?? [])];
  return pasos.map((paso) => ({ ...paso, fechas: paso.desde ? textoDeRango(paso) : "Sin fechas" }));
}

// «Guardada el 3/11/2026», en hora de Argentina.
export function textoGuardadaEl(iso) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return `Guardada el ${fecha.toLocaleDateString("es-AR", { timeZone: ZONA_HORARIA })}`;
}
