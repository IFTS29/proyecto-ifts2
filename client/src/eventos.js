// Ayudas para los formularios de eventos (alta y edición).

const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

// Día AAAA-MM-DD (el formato del campo de fecha) tal como se ve en Argentina.
export const diaEnArgentina = (fecha = new Date()) =>
  new Date(fecha).toLocaleDateString("en-CA", { timeZone: ZONA_HORARIA });

// Fecha que se guarda para un día elegido: mediodía en Argentina. Así se ve el mismo día en el sitio
// (de noche en UTC no cambia el día, como pasaría con la medianoche).
export const fechaDelDia = (dia) => new Date(`${dia}T12:00:00-03:00`).toISOString();

// Datos del formulario a partir de un evento guardado (o vacío, con la fecha de hoy).
export const valoresDeEvento = (evento = {}) => ({
  titulo: evento.titulo || "",
  fecha: diaEnArgentina(evento.fechaEvento || new Date()),
  resumen: evento.resumen || "",
  descripcion: evento.descripcion || "",
});

// Revisa que estén los datos obligatorios. Devuelve el mensaje para mostrar o "" si está todo.
export function faltaUnDato(valores) {
  if (!valores.titulo.trim()) return "Completá el título del evento.";
  if (!valores.fecha) return "Elegí la fecha del evento.";
  if (!valores.descripcion.trim()) return "Completá la descripción del evento.";
  return "";
}

// Textos y fecha listos para mandar al servidor. En la edición se pasa "inicial": si el día no cambió,
// la fecha no se manda y el servidor conserva la original, con su hora. Antes se revisa con faltaUnDato,
// así que el día nunca llega vacío.
export function datosBasicosParaEnviar(valores, inicial = null) {
  const datos = {
    titulo: valores.titulo.trim(),
    resumen: valores.resumen.trim(),
    descripcion: valores.descripcion.trim(),
  };
  const cambioElDia = !inicial || valores.fecha !== inicial.fecha;
  if (valores.fecha && cambioElDia) datos.fechaEvento = fechaDelDia(valores.fecha);
  return datos;
}
