// Motivos permitidos y validaciones del formulario de contacto.

// Clave que envía el formulario → texto que va en el asunto del correo.
export const MOTIVOS = {
  inscripcion: "Inscripción a la carrera",
  equivalencias: "Equivalencias",
  horarios: "Horarios y mesas de examen",
  tramites: "Trámites y certificados",
  otro: "Otro",
};

export const LIMITES = { nombre: 100, mail: 150, telefono: 30, mensaje: 3000 };

const CAMPOS = ["nombre", "mail", "telefono", "motivo", "mensaje"];
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Dígitos, espacios, guiones, paréntesis y un + inicial (ej.: +54 11 1234-5678, (011) 4567-8901).
const REGEX_TELEFONO = /^\+?[\d\s()-]+$/;

// Devuelve { error } si algo está mal, o { consulta } con los datos limpios.
export function validarConsulta(datos = {}) {
  if (datos === null || typeof datos !== "object" || Array.isArray(datos)) {
    return { error: "Los datos enviados no tienen el formato esperado." };
  }
  // Solo se aceptan textos: un arreglo u objeto no se convierte a texto, se rechaza.
  for (const campo of CAMPOS) {
    const valor = datos[campo];
    if (valor !== undefined && valor !== null && typeof valor !== "string") {
      return { error: "Los datos enviados no tienen el formato esperado." };
    }
  }

  const consulta = {
    nombre: (datos.nombre ?? "").trim(),
    mail: (datos.mail ?? "").trim().toLowerCase(),
    telefono: (datos.telefono ?? "").trim(),
    motivo: (datos.motivo ?? "").trim(),
    mensaje: (datos.mensaje ?? "").trim(),
  };

  if (!consulta.nombre || !consulta.mail || !consulta.mensaje) {
    return { error: "Completá tu nombre, tu correo y el mensaje." };
  }
  if (!REGEX_CORREO.test(consulta.mail)) {
    return { error: "El correo no tiene un formato válido." };
  }
  if (consulta.telefono) {
    const digitos = consulta.telefono.replace(/\D/g, "").length;
    if (
      !REGEX_TELEFONO.test(consulta.telefono) ||
      digitos < 6 ||
      digitos > 15
    ) {
      return {
        error: "El teléfono no tiene un formato válido. Podés dejarlo vacío.",
      };
    }
  }
  if (!Object.hasOwn(MOTIVOS, consulta.motivo)) {
    return { error: "Elegí un motivo de consulta de la lista." };
  }
  for (const [campo, maximo] of Object.entries(LIMITES)) {
    if (consulta[campo].length > maximo) {
      return { error: `El campo ${campo} supera los ${maximo} caracteres.` };
    }
  }
  return { consulta };
}
