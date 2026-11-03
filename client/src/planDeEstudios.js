// Plan de estudios de la Tecnicatura Superior en Emprendimientos Gastronómicos.
// Fuente: Anexo de la Resolución N.º 1202/MEGC/2007, págs. 8 y 9 (instancias) y 60 y 61
// (correlatividades). Año y cuatrimestre: «Materias por año y cuatrimestre» del IFTS N.º 2
// (el anexo no los indica).
// Si una resolución nueva cambia el plan, se actualiza este archivo: la tabla, los contadores
// y los totales de La carrera salen de acá. Las horas son horas cátedra, como en la resolución.
//
// La ficha de la carrera del IFTS 2 muestra otras horas en cinco materias del área de Análisis
// del sector y suma 2918 en lugar de las 2758 que declara: se usa la resolución y la diferencia
// queda consultada al instituto (ver alcance_y_trabajo_futuro.md).
//
// Los selectores de Horarios y Mesas usan otra lista, MATERIAS_DEL_PLAN (academica.js), que
// todavía no sale de este archivo para no afectar datos ya guardados.

export const FUENTE_PLAN = "Anexo de la Resolución N.º 1202/MEGC/2007, págs. 8 y 9";
export const FUENTE_CORRELATIVIDADES = "Anexo de la Resolución N.º 1202/MEGC/2007, págs. 60 y 61";
export const FUENTE_ANIOS = "«Materias por año y cuatrimestre», IFTS N.º 2";

export const AREAS = [
  { clave: "analisis", nombre: "Análisis del sector" },
  { clave: "produccion", nombre: "Producción gastronómica" },
  { clave: "gestion", nombre: "Gestión y administración" },
  { clave: "practicas", nombre: "Prácticas profesionales" },
];

// Semanas de cursada según la duración: con ellas la resolución calcula el total.
export const SEMANAS = { cuatrimestral: 16, anual: 32 };

const i = (area, nombre, formato, duracion, horasSemanales, horasAutonomas, total, detalle) => ({
  area,
  nombre,
  formato,
  duracion,
  horasSemanales,
  horasAutonomas,
  total,
  ...(detalle ? { detalle } : {}),
});

// Una fila por instancia curricular, en el orden del anexo de la resolución.
// «Elaboraciones de buffet»: la tabla de la resolución dice «bufett» (errata); sus correlatividades, «buffet».
const BASE = [
  i("analisis", "Introducción a la Gastronomía", "Materia", "cuatrimestral", 3, 0, 48),
  i("analisis", "Industria de la hospitalidad", "Materia", "cuatrimestral", 3, 0, 48),
  i("analisis", "Principios de Economía", "Materia", "cuatrimestral", 3, 0, 48),
  i("analisis", "Herramientas de investigación", "Materia", "cuatrimestral", 4, 0, 64),
  i("analisis", "Organización empresarial", "Materia", "cuatrimestral", 3, 0, 48),

  i("produccion", "Elaboraciones a base de vegetales, cereales y huevos", "Taller", "cuatrimestral", 9, 0, 144),
  i("produccion", "Elaboraciones a base de carnes", "Taller", "cuatrimestral", 9, 0, 144),
  i("produccion", "Elaboración de pizzas y pastas", "Taller", "cuatrimestral", 6, 0, 96),
  i("produccion", "Elaboraciones de buffet", "Taller", "cuatrimestral", 6, 0, 96),
  i("produccion", "Servicios de catering", "Taller", "cuatrimestral", 4, 0, 64),
  i("produccion", "Cocina nacional e internacional", "Taller", "cuatrimestral", 4, 0, 64),
  i("produccion", "Taller de primeros auxilios", "Taller", "cuatrimestral", 3, 0, 48),
  i("produccion", "Seguridad e higiene en la Gastronomía", "Materia", "anual", 3, 0, 96),
  i("produccion", "Elaboraciones de Panadería", "Materia", "cuatrimestral", 5, 0, 80),
  i("produccion", "Pastelería básica", "Taller", "cuatrimestral", 6, 0, 96),
  i("produccion", "Repostería", "Materia", "cuatrimestral", 4, 0, 64),
  i("produccion", "Bebidas", "Materia", "cuatrimestral", 3, 0, 48),
  i("produccion", "Elementos de Química", "Materia", "cuatrimestral", 4, 0, 64),
  i("produccion", "Nutrición", "Materia", "cuatrimestral", 4, 0, 64),
  i("produccion", "Laboratorio de tecnología de los alimentos", "Laboratorio", "cuatrimestral", 5, 0, 80),
  i("produccion", "Taller de Francés técnico", "Taller", "cuatrimestral", 4, 0, 64),
  i("produccion", "Seminario de actualización / profundización", "Seminario", "cuatrimestral", 3, 18, 66),

  i("gestion", "Introducción general a la microempresa", "Materia", "cuatrimestral", 4, 0, 64),
  i("gestion", "Elementos de Administración y Contabilidad", "Materia", "anual", 4, 0, 128),
  i("gestion", "Comercialización", "Materia", "cuatrimestral", 3, 0, 48),
  i("gestion", "Recursos humanos", "Materia", "cuatrimestral", 4, 0, 64),
  i("gestion", "Compras y gestión de stock", "Materia", "cuatrimestral", 3, 0, 48),
  i("gestion", "Organización de eventos gastronómicos", "Materia", "cuatrimestral", 5, 0, 80),
  i("gestion", "Taller de conducción de equipos de trabajo", "Taller", "cuatrimestral", 4, 0, 64),
  i("gestion", "Taller de comunicación escrita", "Taller", "cuatrimestral", 3, 24, 72),
  i("gestion", "Inglés", "Taller", "cuatrimestral", 3, 0, 48),
  i("gestion", "Inglés técnico", "Taller", "cuatrimestral", 3, 0, 48),
  i("gestion", "Taller de Informática", "Taller", "cuatrimestral", 3, 0, 48),
  i("gestion", "Seminario de actualización / profundización", "Seminario", "cuatrimestral", 3, 18, 66),

  i("practicas", "Práctica profesional 1: Observación organizacional", "Taller", "cuatrimestral", 3, 30, 78,
    "48 h de taller y 30 h de práctica (3 semanas de 10 h)"),
  i("practicas", "Práctica profesional 2: Organización de la producción", "Taller", "cuatrimestral", 3, 60, 108,
    "48 h de taller y 60 h de práctica (4 semanas de 15 h)"),
  i("practicas", "Práctica profesional 3: Diseño de emprendimientos gastronómicos", "Taller", "cuatrimestral", 6, 64, 160,
    "96 h de taller y 64 h de trabajo autónomo"),
];

// En qué año y cuatrimestre se cursa cada instancia, según «Materias por año y cuatrimestre»
// del IFTS N.º 2. "anual" = se cursa los dos cuatrimestres (se cuenta una sola vez).
// Los dos seminarios: el instituto los numera I (3.º año, 1.º cuatrimestre) y II (3.º año,
// 2.º cuatrimestre); el anexo no dice cuál corresponde a cada área. Acá se asigna el I al de
// Producción y el II al de Gestión: está consultado al IFTS 2 y el sitio no lo muestra
// (la vista por año usa «I» y «II»; la vista por área, el nombre sin número y
// «cuatrimestre por confirmar»).
const UBICACION = {
  "analisis|Introducción a la Gastronomía": [1, 1],
  "analisis|Industria de la hospitalidad": [1, 2],
  "analisis|Principios de Economía": [1, 2],
  "analisis|Herramientas de investigación": [2, 2],
  "analisis|Organización empresarial": [3, 1],
  "produccion|Elaboraciones a base de vegetales, cereales y huevos": [1, 1],
  "produccion|Elaboraciones a base de carnes": [1, 2],
  "produccion|Elaboración de pizzas y pastas": [2, 1],
  "produccion|Elaboraciones de buffet": [3, 1],
  "produccion|Servicios de catering": [3, 2],
  "produccion|Cocina nacional e internacional": [3, 2],
  "produccion|Taller de primeros auxilios": [1, 1],
  "produccion|Seguridad e higiene en la Gastronomía": [1, "anual"],
  "produccion|Elaboraciones de Panadería": [2, 1],
  "produccion|Pastelería básica": [2, 2],
  "produccion|Repostería": [3, 1],
  "produccion|Bebidas": [3, 2],
  "produccion|Elementos de Química": [1, 2],
  "produccion|Nutrición": [1, 1],
  "produccion|Laboratorio de tecnología de los alimentos": [3, 2],
  "produccion|Taller de Francés técnico": [3, 1],
  "produccion|Seminario de actualización / profundización": [3, 1, "I"],
  "gestion|Introducción general a la microempresa": [2, 1],
  "gestion|Elementos de Administración y Contabilidad": [2, "anual"],
  "gestion|Comercialización": [2, 2],
  "gestion|Recursos humanos": [3, 1],
  "gestion|Compras y gestión de stock": [3, 1],
  "gestion|Organización de eventos gastronómicos": [3, 1],
  "gestion|Taller de conducción de equipos de trabajo": [3, 2],
  "gestion|Taller de comunicación escrita": [1, 1],
  "gestion|Inglés": [2, 1],
  "gestion|Inglés técnico": [2, 2],
  "gestion|Taller de Informática": [2, 1],
  "gestion|Seminario de actualización / profundización": [3, 2, "II"],
  "practicas|Práctica profesional 1: Observación organizacional": [1, 2],
  "practicas|Práctica profesional 2: Organización de la producción": [2, 2],
  "practicas|Práctica profesional 3: Diseño de emprendimientos gastronómicos": [3, 2],
};

// Materias promocionables según el listado del sitio anterior del instituto (sin fecha). Su vigencia no está
// confirmada: queda pendiente validarla con el IFTS 2.
const PROMOCIONABLES = [
  "analisis|Introducción a la Gastronomía",
  "analisis|Principios de Economía",
  "analisis|Industria de la hospitalidad",
  "produccion|Taller de primeros auxilios",
  "gestion|Taller de comunicación escrita",
  "gestion|Taller de Informática",
  "gestion|Inglés",
  "gestion|Comercialización",
  "gestion|Inglés técnico",
  "analisis|Organización empresarial",
  "produccion|Seminario de actualización / profundización",
  "gestion|Seminario de actualización / profundización",
  "gestion|Compras y gestión de stock",
  "produccion|Bebidas",
];

const clave = (x) => `${x.area}|${x.nombre}`;

export const INSTANCIAS = BASE.map((x) => {
  const [anio, cuatrimestre, numero] = UBICACION[clave(x)];
  return { ...x, anio, cuatrimestre, ...(numero ? { numero } : {}), promocionable: PROMOCIONABLES.includes(clave(x)) };
});

export const ANIOS = [1, 2, 3];
// Orden dentro de cada año: primero las anuales, que se cursan desde el comienzo del año,
// y después los dos cuatrimestres seguidos, sin nada en el medio.
export const PERIODOS = [
  { valor: "anual", nombre: "Anuales" },
  { valor: 1, nombre: "1.º cuatrimestre" },
  { valor: 2, nombre: "2.º cuatrimestre" },
];
export const nombreAnio = (anio) => `${anio}.º año`;
// Nombre en la vista por año: los seminarios llevan el número que usa el instituto.
export const nombreEnAnio = (x) => (x.numero ? `${x.nombre} ${x.numero}` : x.nombre);
export const instanciasDeAnio = (anio, cuatrimestre) =>
  INSTANCIAS.filter((x) => x.anio === anio && (cuatrimestre === undefined || x.cuatrimestre === cuatrimestre));
export const totalPorAnio = (anio) => instanciasDeAnio(anio).reduce((suma, x) => suma + x.total, 0);
// «2.º año, 1.º cuatrimestre» o «1.º año, anual». Los seminarios, en la vista por área: no se sabe
// cuál (I o II) corresponde a cada área, así que no se muestra un cuatrimestre sin confirmar.
export const ubicacionInstancia = (x) =>
  x.numero
    ? `${nombreAnio(x.anio)}, cuatrimestre por confirmar`
    : `${nombreAnio(x.anio)}, ${x.cuatrimestre === "anual" ? "anual" : `${x.cuatrimestre}.º cuatrimestre`}`;


// «Taller cuatrimestral», «Materia anual»…
export const regimen = (instancia) => `${instancia.formato} ${instancia.duracion}`;

// Línea de detalle debajo del nombre: la de las prácticas o, si hay trabajo autónomo, cuánto incluye.
export const detalleInstancia = (instancia) =>
  instancia.detalle ??
  (instancia.horasAutonomas > 0 ? `Incluye ${instancia.horasAutonomas} h de trabajo autónomo` : "");

export const instanciasDeArea = (area) => INSTANCIAS.filter((x) => x.area === area);
export const cantidadPorArea = (area) => instanciasDeArea(area).length;
export const totalPorArea = (area) => instanciasDeArea(area).reduce((suma, x) => suma + x.total, 0);
export const totalCarrera = () => INSTANCIAS.reduce((suma, x) => suma + x.total, 0);

// Texto de los contadores de cada área: «5 materias», «3 prácticas» o, si el área mezcla materias,
// talleres, laboratorios y seminarios, «17 instancias curriculares» (el término de la resolución).
export const textoCantidad = (area) => {
  const lista = typeof area === "number" ? instanciasDeAnio(area) : instanciasDeArea(area);
  const n = lista.length;
  if (area === "practicas") return `${n} ${n === 1 ? "práctica" : "prácticas"}`;
  if (lista.every((x) => x.formato === "Materia")) return `${n} ${n === 1 ? "materia" : "materias"}`;
  return `${n} ${n === 1 ? "instancia curricular" : "instancias curriculares"}`;
};

// Correlatividades, transcriptas de la resolución tal como figuran (algunos nombres difieren
// de la tabla del plan, por ejemplo «Taller de producción escrita»: está consultado al IFTS 2).
export const CORRELATIVIDADES = [
  {
    paraCursar: "Elaboraciones a base de vegetales, cereales y huevos",
    requiere: "Introducción a la Gastronomía, Seguridad e higiene en la Gastronomía y Taller de primeros auxilios en curso.",
  },
  { paraCursar: "Elaboraciones a base de carnes", requiere: "Elaboraciones a base de vegetales, cereales y huevos (aprobada)." },
  { paraCursar: "Elaboración de pizzas y pastas", requiere: "Panadería (cursada o en curso)." },
  { paraCursar: "Repostería", requiere: "Pastelería básica (cursada aprobada)." },
  { paraCursar: "Laboratorio de tecnología de los alimentos", requiere: "Química (cursada aprobada)" },
  {
    paraCursar: "Elaboraciones de buffet",
    requiere: "Elaboraciones a base de vegetales, cereales y huevos y Elaboraciones a base de carnes (aprobada).",
  },
  {
    paraCursar: "Comercialización",
    requiere: "Principios de Economía (aprobada) e Introducción a la microempresa (cursada aprobada).",
  },
  {
    paraCursar: "Cocina nacional e internacional",
    requiere: "Elaboraciones a base de vegetales, cereales y huevos y Elaboraciones a base de carnes (cursadas aprobadas).",
  },
  { paraCursar: "Compras y gestión de stock", requiere: "Elementos de Administración y Contabilidad (cursada aprobada)" },
  {
    paraCursar: "Organización de eventos gastronómicos",
    requiere: "Compras y gestión de stock y Servicios de catering (cursada aprobada o en curso)",
  },
  {
    paraCursar: "Práctica 1 – Observación organizacional",
    requiere: "Taller de producción escrita e Introducción a la Gastronomía (cursada aprobada)",
  },
  {
    paraCursar: "Práctica 2 – Producción gastronómica",
    requiere:
      "Práctica 1, Elaboraciones a base de vegetales, cereales y huevos y Elaboraciones a base de carnes (aprobadas), Elaboración de Buffet y Elementos de Administración y Contabilidad (en curso)",
  },
  {
    paraCursar: "Práctica 3: Diseño de emprendimientos gastronómicos",
    requiere:
      "Comercialización, Herramientas de investigación, Práctica 1 y Práctica 2 (aprobadas); Compras y gestión de stock (cursada aprobada) y hasta el 25% en curso simultáneo.",
  },
];

// Alcances de la titulación: texto del anexo de la resolución (pág. 7). Es normativo, no se edita desde el panel.
export const ALCANCES_DEL_TITULO =
  "El egresado de esta carrera estará capacitado para diseñar su propio emprendimiento productivo desarrollando todas las fases vinculadas a un plan de negocio. Asimismo, podrá desempeñarse en organizaciones de gestión estatal o privada vinculadas directa o indirectamente con la actividad gastronómica.";
export const FUENTE_ALCANCES = "Anexo de la Resolución N.º 1202/MEGC/2007, pág. 7";

// Grupos que muestra la tabla según la vista ("anio" o "area") y el filtro ("todos", un año o un área).
// Por año, cada año se divide en anuales, 1.º cuatrimestre y 2.º cuatrimestre (las anuales, una sola vez).
export function gruposDelPlan(vista, filtro) {
  if (vista === "anio") {
    return ANIOS.filter((a) => filtro === "todos" || a === filtro).map((a) => ({
      clave: a,
      titulo: nombreAnio(a),
      cuenta: textoCantidad(a),
      total: totalPorAnio(a),
      secciones: PERIODOS.map((p) => ({ titulo: p.nombre, filas: instanciasDeAnio(a, p.valor) })).filter(
        (s) => s.filas.length > 0
      ),
    }));
  }
  return AREAS.filter((a) => filtro === "todos" || a.clave === filtro).map((a) => ({
    clave: a.clave,
    titulo: a.nombre,
    cuenta: textoCantidad(a.clave),
    total: totalPorArea(a.clave),
    secciones: [{ titulo: null, filas: instanciasDeArea(a.clave) }],
  }));
}
