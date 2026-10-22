import { MOTIVOS } from "./contacto.js";

// Motivos que atiende la casilla institucional. El resto (inscripción, equivalencias,
// horarios y mesas, trámites) los atiende Bedelía.
const MOTIVOS_INSTITUCIONAL = ["otro"];

// Arma el correo de una consulta ya validada. No lo envía: eso lo hace el servicio de correo.
// Reparto: la casilla responsable va en "Para" y la otra en "CC", como respaldo ante ausencias.
// El visitante va en "Responder a", para que le contesten directo; no recibe copia.
export function armarCorreoConsulta(consulta, { correoBedelia, correoInstitucional }) {
  if (!correoBedelia || !correoInstitucional) {
    throw new Error("Faltan configurar CORREO_BEDELIA y CORREO_INSTITUCIONAL.");
  }
  // Si fueran la misma casilla no habría respaldo: la idea es que la consulta llegue a dos personas.
  if (correoBedelia.trim().toLowerCase() === correoInstitucional.trim().toLowerCase()) {
    throw new Error("CORREO_BEDELIA y CORREO_INSTITUCIONAL tienen que ser casillas distintas.");
  }
  const vaAInstitucional = MOTIVOS_INSTITUCIONAL.includes(consulta.motivo);
  const motivo = MOTIVOS[consulta.motivo];
  // Sin saltos de línea en el asunto: un nombre con saltos podría agregar encabezados al correo.
  const nombreEnAsunto = consulta.nombre.replace(/[\r\n]+/g, " ");

  return {
    to: vaAInstitucional ? correoInstitucional : correoBedelia,
    cc: vaAInstitucional ? correoBedelia : correoInstitucional,
    replyTo: consulta.mail,
    subject: `[Portal IFTS 2] ${motivo} - ${nombreEnAsunto}`,
    text: [
      "Nueva consulta desde el formulario de contacto del portal.",
      "",
      `Motivo: ${motivo}`,
      `Nombre: ${consulta.nombre}`,
      `Correo: ${consulta.mail}`,
      `Teléfono: ${consulta.telefono || "(no informado)"}`,
      "",
      "Mensaje:",
      consulta.mensaje,
      "",
      "Para contestar, respondé este correo: la respuesta le llega directo a quien consultó.",
      "Si la casilla en \"Para\" está de licencia, responde la que figura en copia.",
    ].join("\n"),
  };
}