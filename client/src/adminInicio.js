import { textoPeriodo } from "./academica.js";

// Datos del inicio del panel (AdminInicio.jsx), armados solo con lo que ya está guardado.

const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

// "31/10/2026", en hora de Argentina. null si la fecha no existe o no es válida.
function fechaCorta(fechaIso) {
  const fecha = new Date(fechaIso);
  if (!fechaIso || Number.isNaN(fecha.getTime())) return null;
  return fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: ZONA_HORARIA });
}

// Períodos con horarios publicados (respuesta de GET /api/academic/vigente), uno por línea.
// Pueden ser dos, por ejemplo en un cambio de período.
export function textoDeHorariosPublicados(periodos = []) {
  return periodos.length > 0 ? periodos.map(textoPeriodo) : ["Sin horarios publicados"];
}

// Actividad reciente: eventos cargados (por la fecha en que se crearon) y horarios publicados, del más reciente
// al más antiguo. No es un historial completo: no registra ediciones, ocultamientos, retiros ni quién lo hizo.
// Bedelía recibe solo los períodos (no consulta los eventos).
export function actividadReciente({ eventos = [], periodos = [], limite = 5 } = {}) {
  const deEventos = eventos.map((ev) => ({
    clave: `evento-${ev.id}`,
    accion: ev.origen === "instagram" ? "Se incorporó desde Instagram el evento" : "Se cargó el evento",
    detalle: ev.titulo || "sin título",
    fechaIso: ev.createdAt,
  }));
  const deHorarios = periodos.map((p) => ({
    clave: `horarios-${p.cicloLectivo}-${p.cuatrimestre}`,
    accion: "Se publicaron los horarios del",
    detalle: textoPeriodo(p),
    fechaIso: p.publicadoEn,
  }));

  return [...deEventos, ...deHorarios]
    .filter((item) => fechaCorta(item.fechaIso))
    .sort((a, b) => new Date(b.fechaIso) - new Date(a.fechaIso))
    .slice(0, limite)
    .map((item) => ({ ...item, fecha: fechaCorta(item.fechaIso) }));
}

// Lo que muestra el inicio según cómo terminaron las consultas. Cada consulta vale null mientras carga y
// después { ok: true, datos } u { ok: false }. "eventos" no se consulta para Bedelía.
// Un error se muestra como "No disponible", distinto de 0 o de una lista vacía.
export function datosDelInicio({ esAdmin, eventos, horarios }) {
  const visibles = eventos?.ok ? eventos.datos?.conteos?.visible : undefined;
  const eventosVisibles = eventos === null ? "…" : typeof visibles === "number" ? visibles : "No disponible";

  const horariosPublicados =
    horarios === null ? ["…"] : horarios.ok ? textoDeHorariosPublicados(horarios.datos?.periodos) : ["No disponible"];

  const consultas = esAdmin ? [eventos, horarios] : [horarios];
  let actividad;
  if (consultas.some((c) => c === null)) actividad = { estado: "cargando", items: [] };
  else if (consultas.some((c) => !c.ok)) actividad = { estado: "error", items: [] };
  else {
    const items = actividadReciente({
      eventos: esAdmin ? eventos.datos?.eventos : [],
      periodos: horarios.datos?.periodos,
    });
    actividad = { estado: items.length > 0 ? "lista" : "vacia", items };
  }

  return { eventosVisibles, horariosPublicados, actividad };
}
