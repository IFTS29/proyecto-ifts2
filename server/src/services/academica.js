// Reglas de la información académica: horarios de cursada.
// Se validan acá, y no solo en los modelos de Mongoose, para que el modo memoria y las pruebas
// apliquen las mismas reglas y los mensajes salgan en español.

export const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
export const TURNOS = ["manana", "tarde", "noche"];
export const HORA = /^([01]\d|2[0-3]):[0-5]\d$/; // 24 h, con dos dígitos: 08:30, 18:00

export const NOMBRE_DIA = {
  lunes: "lunes",
  martes: "martes",
  miercoles: "miércoles",
  jueves: "jueves",
  viernes: "viernes",
  sabado: "sábado",
  domingo: "domingo",
};
export const NOMBRE_TURNO = { manana: "mañana", tarde: "tarde", noche: "noche" };

const texto = (valor) => String(valor ?? "").trim();

// Acepta 2027 o "2027" (los formularios mandan texto). Cualquier otra cosa da NaN.
const entero = (valor) => (texto(valor) === "" ? NaN : Number(texto(valor)));

const enRango = (numero, min, max) => Number.isInteger(numero) && numero >= min && numero <= max;

// "2027-1" → { cicloLectivo: 2027, cuatrimestre: 1 }, o null si no tiene ese formato.
export function leerPeriodo(valor) {
  const partes = /^(\d{4})-([12])$/.exec(texto(valor));
  return partes ? { cicloLectivo: Number(partes[1]), cuatrimestre: Number(partes[2]) } : null;
}

export const codigoPeriodo = ({ cicloLectivo, cuatrimestre }) => `${cicloLectivo}-${cuatrimestre}`;
export const textoPeriodo = ({ cicloLectivo, cuatrimestre }) => `${cuatrimestre}.° cuatrimestre ${cicloLectivo}`;

// Identifica un horario cargado a mano, para no duplicarlo al reutilizar: mismo año, turno, materia,
// docente, aula, días y horarios. En los textos no cuentan mayúsculas ni espacios de más.
// Es una comparación estricta a propósito: puede haber dos comisiones de la misma materia que solo
// se diferencian en el docente o el aula, y es preferible traer una de más que perder una.
const normalizar = (valor = "") => valor.toLocaleLowerCase("es").replace(/\s+/g, " ").trim();
const textoDias = (dias) => dias.map((f) => `${f.dia} ${f.desde}-${f.hasta}`).join(",");
export function claveDeHorario(h) {
  const textos = [h.materia, h.profesor, h.aula].map(normalizar);
  return [h.anioCarrera, h.turno, ...textos, textoDias(h.dias)].join("|");
}

// Devuelve { datos } con los valores limpios, o { error } con el primer problema encontrado.
// Solo controles básicos: no se revisa si dos materias coinciden en día y horario,
// porque eso puede ser válido (otro año, otra aula, modalidad virtual, materias a elección).
// El docente y el aula son opcionales: en la planilla del instituto el aula no figura
// y algunas materias todavía no tienen docente asignado.
export function validarHorario(cuerpo = {}) {
  const datos = {
    cicloLectivo: entero(cuerpo.cicloLectivo),
    cuatrimestre: entero(cuerpo.cuatrimestre),
    anioCarrera: entero(cuerpo.anioCarrera),
    turno: texto(cuerpo.turno),
    materia: texto(cuerpo.materia),
    profesor: texto(cuerpo.profesor),
    aula: texto(cuerpo.aula),
    dias: Array.isArray(cuerpo.dias)
      ? cuerpo.dias.map((franja) => ({
          dia: texto(franja?.dia).toLowerCase(),
          desde: texto(franja?.desde),
          hasta: texto(franja?.hasta),
        }))
      : [],
  };

  if (!datos.materia) return { error: "Completá la materia." };
  if (datos.materia.length > 120 || datos.profesor.length > 120 || datos.aula.length > 40) {
    return { error: "La materia y el nombre del docente admiten hasta 120 caracteres; el aula, hasta 40." };
  }
  if (!enRango(datos.cicloLectivo, 2020, 2100)) {
    return { error: "El ciclo lectivo tiene que ser un año, por ejemplo 2027." };
  }
  if (!enRango(datos.cuatrimestre, 1, 2)) return { error: "El cuatrimestre tiene que ser 1 o 2." };
  if (!enRango(datos.anioCarrera, 1, 3)) return { error: "El año de la carrera tiene que ser 1, 2 o 3." };
  if (!TURNOS.includes(datos.turno)) return { error: "Elegí el turno: mañana, tarde o noche." };
  if (datos.dias.length === 0) return { error: "Agregá al menos un día de cursada con su horario." };

  for (const { dia, desde, hasta } of datos.dias) {
    if (!DIAS.includes(dia)) return { error: "Hay un día de cursada que no es válido." };
    if (!HORA.test(desde) || !HORA.test(hasta)) {
      return { error: `Revisá el horario del ${NOMBRE_DIA[dia]}: tiene que tener el formato 18:00.` };
    }
    if (desde >= hasta) {
      return { error: `El horario del ${NOMBRE_DIA[dia]} tiene que terminar después de empezar.` };
    }
  }
  // Un mismo día puede tener varias franjas; solo se evita cargar dos veces la misma.
  const franjas = datos.dias.map((f) => `${f.dia} ${f.desde}-${f.hasta}`);
  if (new Set(franjas).size !== franjas.length) {
    return { error: "Hay un día de cursada repetido con el mismo horario." };
  }

  datos.dias.sort((a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia) || a.desde.localeCompare(b.desde));
  return { datos };
}

// Orden de los horarios de un período para los alumnos: por año de la carrera, primer día de cursada,
// hora y materia. La tabla del panel no lo usa: la ordena el navegador, por materia.
export function ordenarHorarios(lista) {
  const primerDia = (h) => DIAS.indexOf(h.dias[0]?.dia);
  const primeraHora = (h) => h.dias[0]?.desde ?? "";
  return [...lista].sort(
    (a, b) =>
      a.anioCarrera - b.anioCarrera ||
      primerDia(a) - primerDia(b) ||
      primeraHora(a).localeCompare(primeraHora(b)) ||
      a.materia.localeCompare(b.materia, "es"),
  );
}

// Los campos que se publican de cada materia. La copia publicada guarda solo estos y el id de trabajo.
export const CAMPOS_PUBLICADOS = ["materia", "anioCarrera", "turno", "profesor", "aula", "dias"];

export const copiaParaPublicar = (horario) =>
  Object.fromEntries([["id", horario.id], ...CAMPOS_PUBLICADOS.map((campo) => [campo, horario[campo]])]);

const NOMBRE_CAMPO = {
  materia: "Materia",
  anioCarrera: "Año",
  turno: "Turno",
  profesor: "Docente",
  aula: "Aula",
  dias: "Días y horarios",
};

// Valor de un campo como se muestra en "Ver cambios". Los vacíos se muestran como "—".
function mostrar(campo, valor) {
  if (campo === "anioCarrera") return `${valor}.°`;
  if (campo === "turno") return NOMBRE_TURNO[valor] ?? valor;
  if (campo === "dias") return valor.map((f) => `${NOMBRE_DIA[f.dia]} ${f.desde} a ${f.hasta}`).join(", ");
  return valor || "—";
}

const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Compara los datos de trabajo con la copia publicada, por id:
// - está en el trabajo y no en la copia → "Se agrega";
// - está en la copia y no en el trabajo → "Se quita del sitio";
// - está en las dos con algún campo distinto → una fila por campo, con el valor publicado y el guardado.
// Devuelve la lista ordenada por materia; vacía si no hay cambios.
export function compararConPublicado(trabajo, publicados) {
  const porId = new Map(publicados.map((h) => [h.id, h]));
  const enTrabajo = new Set(trabajo.map((h) => h.id));
  const cambios = [];

  for (const actual of trabajo) {
    const publicado = porId.get(actual.id);
    if (!publicado) {
      cambios.push({ id: actual.id, materia: actual.materia, cambio: "Se agrega" });
      continue;
    }
    for (const campo of CAMPOS_PUBLICADOS) {
      if (iguales(actual[campo], publicado[campo])) continue;
      cambios.push({
        id: actual.id,
        materia: actual.materia,
        cambio: NOMBRE_CAMPO[campo],
        publicado: mostrar(campo, publicado[campo]),
        guardado: mostrar(campo, actual[campo]),
      });
    }
  }
  for (const publicado of publicados) {
    if (!enTrabajo.has(publicado.id)) {
      cambios.push({ id: publicado.id, materia: publicado.materia, cambio: "Se quita del sitio" });
    }
  }
  return cambios.sort((a, b) => a.materia.localeCompare(b.materia, "es"));
}