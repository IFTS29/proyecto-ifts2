// Etiquetas y formatos de la información académica, compartidos por el panel y la página de Alumnos.
// El servidor guarda valores simples (lunes, noche, 18:00); acá se pasan a texto para mostrar.

export const DIAS = [
  { valor: "lunes", texto: "Lunes" },
  { valor: "martes", texto: "Martes" },
  { valor: "miercoles", texto: "Miércoles" },
  { valor: "jueves", texto: "Jueves" },
  { valor: "viernes", texto: "Viernes" },
  { valor: "sabado", texto: "Sábado" },
  { valor: "domingo", texto: "Domingo" },
];

export const TURNOS = [
  { valor: "noche", texto: "Noche" },
  { valor: "tarde", texto: "Tarde" },
  { valor: "manana", texto: "Mañana" },
];

// Materias del plan de estudios (ficha de la carrera que compartió el instituto). Se sugieren al escribir
// para evitar nombres distintos de la misma materia; igual se puede escribir otro si hace falta.
export const MATERIAS_DEL_PLAN = [
  "Introducción a la Gastronomía",
  "Industria de la hospitalidad",
  "Principios de Economía",
  "Herramientas de Investigación",
  "Organización empresarial",
  "Elaboraciones a base de vegetales, cereales y huevos",
  "Elaboraciones a base de carnes",
  "Elaboración de pizzas y pastas",
  "Elaboraciones de buffet",
  "Servicios de catering",
  "Cocina nacional e internacional",
  "Taller de primeros auxilios",
  "Seguridad e higiene en la Gastronomía",
  "Elaboraciones de Panadería",
  "Pastelería básica",
  "Repostería",
  "Bebidas",
  "Elementos de Química",
  "Nutrición",
  "Laboratorio de tecnología de los alimentos",
  "Taller de Francés técnico",
  "Seminario de actualización / profundización I",
  "Seminario de actualización / profundización II",
  "Introducción general a la microempresa",
  "Elementos de Administración y Contabilidad",
  "Comercialización",
  "Recursos humanos",
  "Compras y gestión de stock",
  "Organización de eventos gastronómicos",
  "Taller de conducción de equipos de trabajo",
  "Taller de comunicación escrita",
  "Inglés",
  "Inglés técnico",
  "Taller de Informática",
  "Práctica Profesional 1: Observación organizacional",
  "Práctica Profesional 2: Organización de la producción",
  "Práctica Profesional 3: Diseño de Emprendimientos Gastronómicos",
];

export const nombreDia = (valor) => DIAS.find((d) => d.valor === valor)?.texto ?? valor;
export const nombreTurno = (valor) => TURNOS.find((t) => t.valor === valor)?.texto ?? valor;
export const ordenDia = (valor) => DIAS.findIndex((d) => d.valor === valor);

// Períodos: el servidor los identifica como "2027-1".
export const codigoPeriodo = ({ cicloLectivo, cuatrimestre }) => `${cicloLectivo}-${cuatrimestre}`;

export function leerPeriodo(codigo) {
  const [cicloLectivo, cuatrimestre] = String(codigo).split("-").map(Number);
  return { cicloLectivo, cuatrimestre };
}

// "1 materia", "20 materias"
export const textoMaterias = (cantidad) => `${cantidad} ${cantidad === 1 ? "materia" : "materias"}`;

// "1.º cuatrimestre 2027"
export const textoPeriodo = ({ cicloLectivo, cuatrimestre }) => `${cuatrimestre}.º cuatrimestre ${cicloLectivo}`;

// El período en curso: desde agosto, el 2.º cuatrimestre.
export function periodoActual(hoy = new Date()) {
  return { cicloLectivo: hoy.getFullYear(), cuatrimestre: hoy.getMonth() >= 7 ? 2 : 1 };
}

// "18:00" → "18"; "18:30" → "18:30"
const sinCeros = (hora) => (hora.endsWith(":00") ? String(Number(hora.slice(0, 2))) : hora);

// "18 a 22 h"
export const textoFranja = ({ desde, hasta }) => `${sinCeros(desde)} a ${sinCeros(hasta)} h`;

// "Lunes 18 a 20 h · Jueves 18 a 20 h"
export const textoDias = (dias) => dias.map((f) => `${nombreDia(f.dia)} ${textoFranja(f)}`).join(" · ");

// Fecha en Argentina: "10 de marzo de 2027". La usan los horarios y las mesas publicados en Alumnos.
export const textoFecha = (fechaIso) =>
  new Date(fechaIso).toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// Fecha y hora en Argentina: "10 de marzo de 2027, 18:05".
export function textoFechaHora(fechaIso) {
  if (!fechaIso) return "";
  return new Date(fechaIso).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23", // 24 h: sin «a. m.» ni «p. m.»
  });
}

// Para buscar sin que importen las mayúsculas ni las tildes: "Nutrición" coincide con "nutricion".
export const paraBuscar = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
// ---- Horarios publicados (página de Alumnos y vista previa del panel) ----

export const ANIOS_DE_CARRERA = [1, 2, 3];
export const TODOS_LOS_ANIOS = "todos";

// Botones del filtro: los tres años y, al final, la vista conjunta (como la hoja «Unificado» del instituto).
export const OPCIONES_DE_ANIO = [
  ...ANIOS_DE_CARRERA.map((a) => ({ valor: a, texto: `${a}.º año` })),
  { valor: TODOS_LOS_ANIOS, texto: "Todos los años" },
];

// Al entrar se muestra el primer año con materias: cada estudiante busca el suyo.
export const anioInicial = (horarios) => ANIOS_DE_CARRERA.find((a) => horarios.some((h) => h.anioCarrera === a)) ?? 1;

// Una fila por día de cursada, ordenadas por día, hora y, si coinciden, año. Dos materias de años distintos
// en la misma franja aparecen las dos (una fila cada una).
export function filasDeHorarios(horarios, { anio, turno = "" }) {
  return horarios
    .filter((h) => !turno || h.turno === turno)
    .filter((h) => anio === TODOS_LOS_ANIOS || h.anioCarrera === anio)
    .flatMap((h) => h.dias.map((franja) => ({ ...franja, h })))
    .sort(
      (a, b) =>
        a.h.anioCarrera - b.h.anioCarrera || ordenDia(a.dia) - ordenDia(b.dia) || a.desde.localeCompare(b.desde),
    );
}

// Turnos del desplegable: solo los que tienen materias en el año elegido (con «Todos los años», los de los tres).
// Así no se ofrece un turno que deja la tabla vacía.
export const turnosDisponibles = (horarios, anio) =>
  TURNOS.filter((t) =>
    horarios.some((h) => h.turno === t.valor && (anio === TODOS_LOS_ANIOS || h.anioCarrera === anio)),
  );

export const textoSinMaterias = (anio) =>
  anio === TODOS_LOS_ANIOS ? "No hay materias en este período." : `No hay materias de ${anio}.º año en este período.`;
