// Archivado por fecha (#35, RF12). Nada se borra ni se mueve: el sistema calcula al mostrar qué está vigente y
// qué pasó al archivo, con una regla por tipo de contenido. Lo archivado no se ve en el sitio público, pero el
// panel lo sigue mostrando (marcado) a quien gestiona ese contenido.
//
// Todas las fechas se comparan en el calendario de Argentina, nunca con la zona horaria del servidor: "hoy" es
// un día "AAAA-MM-DD" y se recibe por parámetro para poder probar los límites (31/12, 1/1, día 30 y 31).
//
// Las acciones manuales tienen prioridad: un evento oculto sigue oculto aunque tenga "visibleSiempre", y un
// período o llamado retirado no vuelve a mostrarse por ser el último. Retirar el más reciente tampoco hace
// reaparecer uno anterior que ya estaba archivado: la excepción del «último» es solo para el más reciente de todos
// los que se publicaron alguna vez, y solo mientras siga publicado.

import { llamadosPublicados } from "./mesas.js";

const ZONA_HORARIA = "America/Argentina/Buenos_Aires";
const PARTES_DEL_DIA = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Día en Argentina de un instante ("2026-11-03"). null si la fecha no es válida.
export function diaEnArgentina(fecha = new Date()) {
  const instante = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(instante.getTime())) return null;
  const p = Object.fromEntries(PARTES_DEL_DIA.formatToParts(instante).map(({ type, value }) => [type, value]));
  return `${p.year}-${p.month}-${p.day}`;
}

const DIA = /^\d{4}-\d{2}-\d{2}$/;

// Suma días a un "AAAA-MM-DD" contando días de calendario (sin horas ni zonas horarias).
export function sumarDias(dia, dias) {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

// ---------- Eventos ----------
// Se ven en el sitio los del año actual y el anterior. Los de antes pasan al archivo, salvo que la administración
// haya elegido mostrarlos igual ("visibleSiempre"). Un evento oculto nunca se muestra, archivado o no.
// Sin fecha válida no se archiva: no hay con qué calcularlo.
export function eventoArchivado(evento, hoy) {
  if (!evento?.fechaEvento) return false;
  const dia = diaEnArgentina(evento.fechaEvento);
  if (!dia) return false;
  return Number(dia.slice(0, 4)) < Number(hoy.slice(0, 4)) - 1;
}

export const eventoEnElSitio = (evento, hoy) =>
  evento?.estado === "visible" && (!eventoArchivado(evento, hoy) || evento.visibleSiempre === true);

// ---------- Horarios ----------
// Se ven los períodos publicados del año actual y el más reciente de todos los que se publicaron alguna vez, si
// sigue publicado (para que Alumnos no quede vacía entre un año y otro). "publicaciones" son todas las copias,
// también las retiradas. Si se retira el más reciente, no vuelve uno anterior ya archivado: Alumnos muestra lo del
// año actual o queda sin horarios hasta que Bedelía publique. Volver a publicar un período viejo no lo muestra,
// salvo que sea el más reciente de todos.
const ordenPeriodo = (p) => p.cicloLectivo * 10 + p.cuatrimestre;

export function periodosEnElSitio(publicaciones, hoy) {
  const anio = Number(hoy.slice(0, 4));
  const masReciente = Math.max(...publicaciones.map(ordenPeriodo));
  return publicaciones.filter((p) => p.publicado && (p.cicloLectivo === anio || ordenPeriodo(p) === masReciente));
}

export const periodoArchivado = (publicacion, publicaciones, hoy) =>
  Boolean(publicacion?.publicado) && !periodosEnElSitio(publicaciones, hoy).includes(publicacion);

// ---------- Mesas de examen ----------
// Un llamado publicado pasa al archivo cuando pasaron más de 30 días desde su fecha más tardía conocida: la mesa
// más tardía, el «hasta» o, si no hay otra, el «desde» del llamado. Sin ninguna fecha no se archiva (no hay con
// qué calcularlo). El más reciente de todos los que se publicaron alguna vez no se archiva mientras siga
// publicado; si se lo retira, no vuelve en su lugar uno anterior ya archivado.
export const DIAS_HASTA_ARCHIVAR_MESAS = 30;

export function ultimaFechaDelLlamado(llamado) {
  const fechas = [...(llamado.mesas ?? []).map((m) => m.fecha), llamado.hasta, llamado.desde].filter((f) =>
    DIA.test(f ?? ""),
  );
  return fechas.reduce((ultima, f) => (f > ultima ? f : ultima), "");
}

// Id del llamado más reciente entre todos los que se publicaron alguna vez (también los retirados), con el mismo
// criterio de orden que la lista de Alumnos: fecha de inicio o, sin ella, fecha de publicación.
function idDelMasReciente(llamados) {
  const referencia = (l) => l.publicacion.desde || new Date(l.publicacion.publicadoEn).toISOString().slice(0, 10);
  const conCopia = llamados.filter((l) => l.publicacion).sort((a, b) => referencia(b).localeCompare(referencia(a)));
  return conCopia[0]?.id ?? null;
}

// Los llamados que ve Alumnos hoy, con el formato de lo publicado (llamadosPublicados). "llamados" son los
// registros completos del repositorio, con su copia publicada.
export function llamadosEnElSitio(llamados, hoy) {
  const masReciente = idDelMasReciente(llamados);
  return llamadosPublicados(llamados).filter((llamado) => {
    if (llamado.id === masReciente) return true;
    const ultima = ultimaFechaDelLlamado(llamado);
    return !ultima || hoy <= sumarDias(ultima, DIAS_HASTA_ARCHIVAR_MESAS);
  });
}
