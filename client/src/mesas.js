// Mesas de examen: textos para el panel y la página de Alumnos.
// Repiten los del servidor (server/src/services/mesas.js), que los usa en el PDF, para que digan lo mismo.

// Texto que se muestra cuando un llamado publicado no tiene mesas ni un aviso escrito.
export const AVISO_POR_DEFECTO = "El cronograma por materia se publicará próximamente.";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS_SEMANA = ["Dom.", "Lun.", "Mar.", "Mié.", "Jue.", "Vie.", "Sáb."];
const partes = (fecha) => fecha.split("-").map(Number);

// Ordinal con la "o" volada: "1.º".
export const textoAnio = (anio) => `${anio}.º`;

// "1 mesa", "12 mesas"
export const textoMesas = (cantidad) => `${cantidad} ${cantidad === 1 ? "mesa" : "mesas"}`;

// "Del 9 al 20 de febrero de 2027", "Desde el 9 de febrero de 2027", "" si no hay fechas.
// No arma un rango si falta una de las dos.
export function textoFechasDelLlamado({ desde, hasta }) {
  const completa = (fecha) => {
    const [anio, mes, dia] = partes(fecha);
    return `${dia} de ${MESES[mes - 1]} de ${anio}`;
  };
  if (desde && hasta) {
    const [a1, m1, d1] = partes(desde);
    const [a2, m2] = partes(hasta);
    if (desde === hasta) return `El ${completa(desde)}`;
    if (a1 === a2 && m1 === m2) return `Del ${d1} al ${completa(hasta)}`;
    if (a1 === a2) return `Del ${d1} de ${MESES[m1 - 1]} al ${completa(hasta)}`;
    return `Del ${completa(desde)} al ${completa(hasta)}`;
  }
  if (desde) return `Desde el ${completa(desde)}`;
  if (hasta) return `Hasta el ${completa(hasta)}`;
  return "";
}

// "Mié. 10/02/2027". Sin fecha: "A confirmar".
export function textoFechaDeMesa(fecha) {
  if (!fecha) return "A confirmar";
  const [anio, mes, dia] = partes(fecha);
  const diaSemana = DIAS_SEMANA[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
  return `${diaSemana} ${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}`;
}

// "18 h" o "18:30 h". Sin hora: "A confirmar".
export const textoHoraDeMesa = (hora) =>
  hora ? `${hora.endsWith(":00") ? Number(hora.slice(0, 2)) : hora} h` : "A confirmar";

// Aviso que ven los alumnos: el escrito por Bedelía o, si el llamado no tiene mesas, el de por defecto.
export const avisoDelLlamado = (llamado) =>
  llamado.aviso || (llamado.mesas.length === 0 ? AVISO_POR_DEFECTO : "");

// "Febrero 2027" → "febrero-2027", para el nombre del archivo (como en el servidor).
export const paraArchivo = (texto) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
