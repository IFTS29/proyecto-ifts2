import { useEffect, useState } from "react";
import { api } from "./api.js";

// Contenido institucional (#36) en el sitio y en el panel: perfil del egresado, autoridades y tutoría, y
// datos de contacto. Sale de GET /api/content.

const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

export const TITULOS_DE_GRUPO = { autoridades: "Autoridades", tutoria: "Tutoría" };

// Títulos que se saltean al armar las iniciales del avatar: "Prof. Julia Sboro" → "JS".
const TITULOS_DE_PERSONA = /^(prof|profa|lic|dr|dra|ing|mg|arq|cdor|cdora)\.?$/i;

export function iniciales(nombre = "") {
  const palabras = nombre.trim().split(/\s+/).filter((p) => p && !TITULOS_DE_PERSONA.test(p));
  if (palabras.length === 0) return "";
  const primera = palabras[0][0];
  const ultima = palabras.length > 1 ? palabras[palabras.length - 1][0] : "";
  return (primera + ultima).toUpperCase();
}

// Autoridades primero y tutoría después, cada grupo con su título. Un grupo vacío no se muestra.
export function agruparPersonas(personas = []) {
  return Object.entries(TITULOS_DE_GRUPO)
    .map(([grupo, titulo]) => ({ grupo, titulo, personas: personas.filter((p) => p.grupo === grupo) }))
    .filter((g) => g.personas.length > 0);
}

// Debajo del nombre de cada sección, en el panel.
export function textoActualizado(seccion) {
  if (!seccion?.actualizadoEn) return "Sin cambios desde la carga inicial";
  const fecha = new Date(seccion.actualizadoEn).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: ZONA_HORARIA,
  });
  return `Actualizado el ${fecha}`;
}

// Estado compartido entre las páginas que muestran el contenido (Carrera, Contacto, el pie y el panel).
// - Cada página que lo usa vuelve a consultar al abrirse: nunca se queda con datos de antes de un guardado.
// - Si dos consultas coinciden (por ejemplo, la página y el pie), se hace una sola.
// - Un error no se guarda: la próxima vez que se abre una página se vuelve a intentar.
// - Al guardar desde el panel, la sección nueva reemplaza a la anterior enseguida.
// "pedir" se recibe por parámetro para poder probarlo sin servidor.
export function crearAlmacenContenido(pedir) {
  let estado = { estado: "cargando", contenido: null };
  let enCurso = null;
  let pedido = 0; // numera las consultas: la respuesta de una consulta vieja se descarta
  const oyentes = new Set();

  const cambiar = (nuevo) => {
    estado = nuevo;
    for (const oyente of oyentes) oyente(estado);
  };

  return {
    leer: () => estado,
    suscribir(oyente) {
      oyentes.add(oyente);
      return () => oyentes.delete(oyente);
    },
    cargar() {
      if (enCurso) return enCurso;
      // Si ya había datos, se siguen viendo mientras llega la respuesta nueva. Después de un error, "cargando".
      if (estado.estado === "error") cambiar({ estado: "cargando", contenido: null });
      const numero = ++pedido;
      const vigente = () => numero === pedido;
      enCurso = pedir()
        .then((contenido) => vigente() && cambiar({ estado: "listo", contenido }))
        .catch(() => vigente() && cambiar({ estado: "error", contenido: null }))
        .finally(() => {
          if (vigente()) enCurso = null;
        });
      return enCurso;
    },
    // Una consulta que ya estaba en camino traería la versión anterior: se descarta.
    reemplazarSeccion(clave, seccion) {
      pedido++;
      enCurso = null;
      if (estado.estado !== "listo") return;
      cambiar({ estado: "listo", contenido: { ...estado.contenido, [clave]: seccion } });
    },
  };
}

export const almacenContenido = crearAlmacenContenido(() => api("/content"));

// Devuelve { estado: "cargando" | "listo" | "error", contenido } y consulta al servidor al montarse.
export function useContenidoInstitucional() {
  const [estado, setEstado] = useState(almacenContenido.leer);
  useEffect(() => {
    const desuscribir = almacenContenido.suscribir(setEstado);
    almacenContenido.cargar();
    return desuscribir;
  }, []);
  return estado;
}

// Guarda una sección desde el panel y la deja visible en todo el sitio.
export async function guardarSeccion(clave, datos) {
  const seccion = await api(`/content/${clave}`, { metodo: "PUT", cuerpo: { datos } });
  almacenContenido.reemplazarSeccion(clave, seccion);
  return seccion;
}

export const SIN_DATOS = "Esta información no está disponible en este momento.";
