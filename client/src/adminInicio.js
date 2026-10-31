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

// Llamados de mesas de examen publicados (también los anuncios sin mesas), uno por línea.
export function textoDeLlamadosPublicados(llamados = []) {
  return llamados.length > 0 ? llamados.map((l) => l.nombre) : ["Sin llamados publicados"];
}

// Actividad reciente: eventos cargados (por la fecha en que se crearon), horarios y llamados publicados, del más
// reciente al más antiguo. No es un historial completo: no registra ediciones, ocultamientos, retiros ni quién
// lo hizo. Bedelía recibe solo los períodos y los llamados (no consulta los eventos).
export function actividadReciente({ eventos = [], periodos = [], llamados = [], limite = 5 } = {}) {
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

  // "Se publicó el llamado" sirve tanto para un anuncio como para un cronograma completo.
  const deLlamados = llamados.map((l) => ({
    clave: `llamado-${l.id}`,
    accion: "Se publicó el llamado",
    detalle: l.nombre,
    fechaIso: l.publicadoEn,
  }));

  return [...deEventos, ...deHorarios, ...deLlamados]
    .filter((item) => fechaCorta(item.fechaIso))
    .sort((a, b) => new Date(b.fechaIso) - new Date(a.fechaIso))
    .slice(0, limite)
    .map((item) => ({ ...item, fecha: fechaCorta(item.fechaIso) }));
}

// Lo que muestra el inicio según cómo terminaron las consultas. Cada consulta vale null mientras carga y
// después { ok: true, datos } u { ok: false }. "vigente" es GET /api/academic/vigente (horarios y llamados
// publicados); "eventos" no se consulta para Bedelía.
// Un error se muestra como "No disponible", distinto de 0 o de una lista vacía.
export function datosDelInicio({ esAdmin, eventos, vigente }) {
  const visibles = eventos?.ok ? eventos.datos?.conteos?.visible : undefined;
  const eventosVisibles = eventos === null ? "…" : typeof visibles === "number" ? visibles : "No disponible";

  const deVigente = (armarTexto, lista) =>
    vigente === null ? ["…"] : vigente.ok ? armarTexto(lista) : ["No disponible"];
  const horariosPublicados = deVigente(textoDeHorariosPublicados, vigente?.datos?.periodos);
  const llamadosPublicados = deVigente(textoDeLlamadosPublicados, vigente?.datos?.llamados);

  const consultas = esAdmin ? [eventos, vigente] : [vigente];
  let actividad;
  if (consultas.some((c) => c === null)) actividad = { estado: "cargando", items: [] };
  else if (consultas.some((c) => !c.ok)) actividad = { estado: "error", items: [] };
  else {
    const items = actividadReciente({
      eventos: esAdmin ? eventos.datos?.eventos : [],
      periodos: vigente.datos?.periodos,
      llamados: vigente.datos?.llamados,
    });
    actividad = { estado: items.length > 0 ? "lista" : "vacia", items };
  }

  return { eventosVisibles, horariosPublicados, llamadosPublicados, actividad };
}
