import { HORA, compararPorId } from "./academica.js";

// Mesas de examen, organizadas por llamado ("Febrero 2027").
// Como en los horarios, cada llamado tiene datos de trabajo (los carga Bedelía) y una copia publicada,
// que es lo único que ven los alumnos. Un llamado se puede publicar sin mesas, como anuncio.

const texto = (valor) => String(valor ?? "").trim();
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Fecha AAAA-MM-DD que existe en el calendario (rechaza, por ejemplo, 2027-02-30).
export function fechaValida(valor) {
  if (!FECHA.test(valor)) return false;
  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

// Texto que se muestra cuando un llamado publicado no tiene mesas ni un aviso escrito.
export const AVISO_POR_DEFECTO = "El cronograma por materia se publicará próximamente.";

// Para comparar nombres de llamados: "Febrero 2027", " febrero  2027 " y "FEBRERO 2027" son el mismo.
export const claveDeNombre = (nombre) => texto(nombre).toLocaleLowerCase("es").replace(/\s+/g, " ");

// Devuelve { datos } con los valores limpios, o { error } con el primer problema encontrado.
// Solo el nombre es obligatorio: un llamado se puede crear (y publicar) antes de tener las fechas.
export function validarLlamado(cuerpo = {}) {
  const datos = {
    nombre: texto(cuerpo.nombre).replace(/\s+/g, " "),
    desde: texto(cuerpo.desde),
    hasta: texto(cuerpo.hasta),
    aviso: texto(cuerpo.aviso),
  };
  if (!datos.nombre) return { error: "El nombre del llamado es obligatorio. Por ejemplo: Febrero 2027." };
  if (datos.nombre.length > 60) return { error: "El nombre del llamado admite hasta 60 caracteres." };
  if (datos.desde && !fechaValida(datos.desde)) return { error: "La fecha de inicio no es válida." };
  if (datos.hasta && !fechaValida(datos.hasta)) return { error: "La fecha de cierre no es válida." };
  if (datos.desde && datos.hasta && datos.hasta < datos.desde) {
    return { error: "La fecha de cierre no puede ser anterior a la de inicio." };
  }
  if (datos.aviso.length > 300) return { error: "El aviso admite hasta 300 caracteres." };
  return { datos: { ...datos, nombreClave: claveDeNombre(datos.nombre) } };
}

// Solo la materia y el año son obligatorios: la fecha, la hora, el aula y la mesa examinadora
// se pueden completar después. Lo que falta se muestra como "A confirmar".
export function validarMesa(cuerpo = {}) {
  const datos = {
    materia: texto(cuerpo.materia),
    anioCarrera: texto(cuerpo.anioCarrera) === "" ? NaN : Number(texto(cuerpo.anioCarrera)),
    fecha: texto(cuerpo.fecha),
    hora: texto(cuerpo.hora),
    aula: texto(cuerpo.aula),
    tribunal: texto(cuerpo.tribunal),
  };
  if (!datos.materia) return { error: "La materia es obligatoria." };
  if (datos.materia.length > 120) return { error: "La materia admite hasta 120 caracteres." };
  if (![1, 2, 3].includes(datos.anioCarrera)) return { error: "El año de la carrera tiene que ser 1, 2 o 3." };
  if (datos.fecha && !fechaValida(datos.fecha)) return { error: "La fecha de la mesa no es válida." };
  if (datos.hora && !HORA.test(datos.hora)) return { error: "La hora tiene que tener el formato 18:00." };
  if (datos.aula.length > 40) return { error: "El aula admite hasta 40 caracteres." };
  if (datos.tribunal.length > 200) return { error: "La mesa examinadora admite hasta 200 caracteres." };
  return { datos };
}

// Compara fechas AAAA-MM-DD u horas HH:MM; las vacías ("A confirmar") van al final.
const vaciasAlFinal = (a, b) => (a === b ? 0 : !a ? 1 : !b ? -1 : a < b ? -1 : 1);

// Orden de las mesas: por fecha y hora (las que no tienen van al final), año y materia.
export function ordenarMesas(lista) {
  return [...lista].sort(
    (a, b) =>
      vaciasAlFinal(a.fecha, b.fecha) ||
      vaciasAlFinal(a.hora, b.hora) ||
      a.anioCarrera - b.anioCarrera ||
      a.materia.localeCompare(b.materia, "es"),
  );
}

// Los campos que se publican de cada mesa. La copia guarda además el id de trabajo como "mesaId".
export const CAMPOS_MESA = ["fecha", "hora", "anioCarrera", "materia", "aula", "tribunal"];
const CAMPOS_LLAMADO = ["nombre", "desde", "hasta", "aviso"];

export const copiaDeMesa = (mesa) =>
  Object.fromEntries([["mesaId", mesa.id], ...CAMPOS_MESA.map((campo) => [campo, mesa[campo]])]);

// Copia que ven los alumnos. Se guarda entera en el llamado, en una sola escritura.
export const copiaParaPublicar = (llamado, mesas) => ({
  publicado: true,
  publicadoEn: new Date().toISOString(),
  ...Object.fromEntries(CAMPOS_LLAMADO.map((campo) => [campo, llamado[campo]])),
  mesas: mesas.map(copiaDeMesa),
});

const NOMBRE_CAMPO_MESA = {
  fecha: "Fecha",
  hora: "Hora",
  anioCarrera: "Año",
  materia: "Materia",
  aula: "Aula",
  tribunal: "Mesa examinadora",
};
const NOMBRE_CAMPO_LLAMADO = { nombre: "Nombre", desde: "Inicio", hasta: "Cierre", aviso: "Aviso" };

// Ordinal con la "o" volada (1.º), no con el signo de grado (°).
export const textoAnio = (anio) => `${anio}.º`;

const mostrarMesa = (campo, valor) => (campo === "anioCarrera" ? textoAnio(valor) : valor || "—");

// "Ver cambios": compara lo guardado con la última copia publicada, sin modificarla.
// Primero los datos del llamado (nombre, fechas generales, aviso) y después las mesas, por id.
export function compararLlamado(llamado, mesas, publicacion) {
  const delLlamado = CAMPOS_LLAMADO.filter((campo) => (llamado[campo] || "") !== (publicacion[campo] || "")).map(
    (campo) => ({
      id: `llamado-${campo}`,
      materia: "Datos del llamado",
      cambio: NOMBRE_CAMPO_LLAMADO[campo],
      publicado: publicacion[campo] || "—",
      guardado: llamado[campo] || "—",
    }),
  );
  const publicadas = publicacion.mesas.map(({ mesaId, ...campos }) => ({ id: mesaId, ...campos }));
  const deMesas = compararPorId(mesas, publicadas, {
    campos: CAMPOS_MESA,
    nombres: NOMBRE_CAMPO_MESA,
    mostrar: mostrarMesa,
  });
  return [...delLlamado, ...deMesas];
}

// Lo que ve el sitio público: solo los llamados publicados, con su copia publicada (nunca los datos de
// trabajo). Del más reciente al más antiguo según la fecha de inicio; sin fecha, por la de publicación.
export function llamadosPublicados(llamados) {
  const publicados = llamados
    .filter((l) => l.publicacion?.publicado)
    .map(({ id, publicacion: p }) => ({
      id,
      nombre: p.nombre,
      desde: p.desde,
      hasta: p.hasta,
      aviso: p.aviso,
      publicadoEn: new Date(p.publicadoEn).toISOString(), // en MongoDB llega como Date
      mesas: ordenarMesas(p.mesas.map(({ mesaId, ...campos }) => ({ id: mesaId, ...campos }))),
    }));
  const referencia = (l) => l.desde || l.publicadoEn.slice(0, 10);
  return publicados.sort((a, b) => referencia(b).localeCompare(referencia(a)));
}

// ---------- Textos (los usa el PDF) ----------

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS_SEMANA = ["Dom.", "Lun.", "Mar.", "Mié.", "Jue.", "Vie.", "Sáb."];
const partes = (fecha) => fecha.split("-").map(Number);

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

// "Mié. 10/02/2027", con el año: el nombre del llamado puede no tenerlo. Sin fecha: "A confirmar".
export function textoFechaDeMesa(fecha) {
  if (!fecha) return "A confirmar";
  const [anio, mes, dia] = partes(fecha);
  const diaSemana = DIAS_SEMANA[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
  return `${diaSemana} ${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}`;
}

// "18 h" o "18:30 h". Sin hora: "A confirmar".
export const textoHoraDeMesa = (hora) => (hora ? `${hora.endsWith(":00") ? Number(hora.slice(0, 2)) : hora} h` : "A confirmar");
