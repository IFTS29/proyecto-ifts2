/**
 * Parser y clasificador de publicaciones de Instagram para el IFTS N.° 2.
 */

export const CONFIG_CATEGORIAS_DEFECTO = {
  eventos: {
    id: "eventos",
    titulo: "Eventos Institucionales",
    hashtags: ["#eventosIFTS2"],
  },
};

/**
 * Extrae todos los hashtags presentes en un texto preservando caracteres acentuados.
 * Devuelve un arreglo en minúsculas con el prefijo '#' incluido.
 *
 * @param {string} caption
 * @returns {string[]}
 */
export function extractHashtags(caption) {
  if (!caption || typeof caption !== "string") return [];
  const matches = caption.match(/#[\p{L}\p{N}_]+/gu);
  return matches ? matches.map((t) => t.toLowerCase()) : [];
}

/**
 * Clasifica una publicación en una o más categorías según sus hashtags (case-insensitive).
 * Si no contiene ningún hashtag configurado, devuelve [] y queda descartada.
 *
 * @param {string} caption
 * @param {object} [categoriasConfig]
 * @returns {string[]}
 */
export function getPostCategories(caption, categoriasConfig = CONFIG_CATEGORIAS_DEFECTO) {
  const postTags = new Set(extractHashtags(caption));
  const matched = [];

  for (const [catKey, catConfig] of Object.entries(categoriasConfig)) {
    const targetTags = (catConfig.hashtags || []).map((t) => {
      const trimmed = t.trim().toLowerCase();
      return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    });

    if (targetTags.some((tag) => postTags.has(tag))) {
      matched.push(catKey);
    }
  }

  return matched;
}

/**
 * Alias semántico según plan de testing: clasifica publicaciones o determina categorías.
 */
export function classifyPosts(caption, categoriasConfig = CONFIG_CATEGORIAS_DEFECTO) {
  return getPostCategories(caption, categoriasConfig);
}

// ----- Título, resumen y descripción de una publicación sincronizada -----

const TITULO_POR_DEFECTO = "Publicación Institucional";
// Largo máximo del título, incluidos los «…» cuando se acorta. Un renglón más largo es un párrafo.
const LARGO_MAXIMO_TITULO = 100;
const LARGO_MAXIMO_RESUMEN = 110;

const HASHTAG = /#[\p{L}\p{N}_]+/gu;
// Caracteres que Instagram usa para dejar renglones «vacíos» o que no se ven: espacio de ancho cero,
// espacio braille (⠀) y relleno hangul. El espacio duro cuenta como un espacio común.
const INVISIBLES = /[\u200B-\u200D\u2060\uFEFF]/g;
const ESPACIOS_RAROS = /[\u00A0\u2800\u3164]/g;
// Renglón que solo separa párrafos o decora: puntos, viñetas, guiones o emojis.
const SEPARADOR = /^[.·•\-_\s\p{Extended_Pictographic}\uFE0F\u200D]+$/u;
const EMOJI_FINAL = /[\s\p{Extended_Pictographic}\uFE0F\u200D]+$/u;

// Renglones del texto sin hashtags ni espacios de más. Los renglones sin texto quedan como "".
function renglonesLimpios(texto) {
  return texto
    .replace(HASHTAG, "")
    .replace(INVISIBLES, "")
    .replace(ESPACIOS_RAROS, " ")
    .split(/\r?\n/)
    .map((renglon) => renglon.replace(/[ \t]+/g, " ").trim())
    .map((renglon) => (SEPARADOR.test(renglon) ? "" : renglon));
}

// Agrupa los renglones en párrafos: un renglón vacío los separa; dentro de un párrafo se conservan los saltos.
function parrafosDe(renglones) {
  const parrafos = [];
  let actual = [];
  for (const renglon of renglones) {
    if (renglon) {
      actual.push(renglon);
    } else if (actual.length) {
      parrafos.push(actual.join("\n"));
      actual = [];
    }
  }
  if (actual.length) parrafos.push(actual.join("\n"));
  return parrafos;
}

// Acorta un texto en la última palabra completa, con «…», sin pasar del largo máximo.
// Avanza de a caracteres completos (Intl.Segmenter) para no cortar un emoji por la mitad.
function acortar(texto, largo) {
  if (texto.length <= largo) return texto;
  let corte = "";
  for (const { segment } of new Intl.Segmenter("es", { granularity: "grapheme" }).segment(texto)) {
    if (corte.length + segment.length > largo - 1) break;
    corte += segment;
  }
  const ultimoEspacio = corte.lastIndexOf(" ");
  const base = ultimoEspacio > 0 ? corte.slice(0, ultimoEspacio) : corte;
  return `${base.replace(/[\s,;:.]+$/, "")}…`;
}

// Quita del final del título los emojis, el punto y los dos puntos. Conserva «!», «?» y los puntos suspensivos.
function limpiarTitulo(titulo) {
  const sinEmoji = titulo.replace(EMOJI_FINAL, "");
  if (/(\.\.\.|…)$/.test(sinEmoji)) return sinEmoji;
  return sinEmoji.replace(/[.:]+$/, "").trim();
}

// Abreviaturas frecuentes en las publicaciones del instituto: su punto no termina la oración («la Lic. Gómez»).
const ABREVIATURA = /(?:^|\s)(?:lic|dr|dra|prof|profa|sr|sra|srta|ing|arq|mg|esp|tec|téc|gral|av|n|nº|tel|etc)$/i;

// Fin de la primera oración: «.», «!» o «?» seguidos de un espacio. No cuentan el punto de una abreviatura
// ni los puntos suspensivos seguidos de minúscula («Llegó el verano... y la feria» sigue siendo una oración).
function finDeOracion(renglon) {
  for (const fin of renglon.matchAll(/[.!?…]+(?=\s)/g)) {
    const despues = renglon.slice(fin.index + fin[0].length).trimStart();
    const suspensivos = fin[0] === "…" || fin[0].startsWith("..");
    if (suspensivos && /^\p{Ll}/u.test(despues)) continue;
    if (fin[0] === "." && ABREVIATURA.test(renglon.slice(0, fin.index))) continue;
    return fin;
  }
  return null;
}

// Primera oración de un renglón: hasta el fin de oración o un emoji que separa (después del quinto carácter).
// Devuelve { oracion, resto } o null si el renglón tiene una sola oración.
function primeraOracion(renglon) {
  const fin = finDeOracion(renglon);
  const emoji = renglon.match(/\s*\p{Extended_Pictographic}\uFE0F?\s*/u);
  const corteEmoji = emoji && emoji.index > 5 ? emoji : null;
  const corteFin = fin ? { index: fin.index + fin[0].length, largo: 0 } : null;
  const corte =
    corteEmoji && (!corteFin || corteEmoji.index < corteFin.index)
      ? { index: corteEmoji.index, largo: corteEmoji[0].length }
      : corteFin;
  if (!corte) return null;
  const oracion = renglon.slice(0, corte.index).trim();
  // Un emoji justo después del fin de la oración no forma parte de la descripción.
  const resto = renglon.slice(corte.index + corte.largo).replace(/^[\s\p{Extended_Pictographic}\uFE0F\u200D]+/u, "");
  return oracion && resto ? { oracion, resto } : null;
}

// Arma el título, el resumen y la descripción a partir del texto de una publicación de Instagram:
// 1. Si hay más de un renglón y el primero es corto, el primero es el título (con o sin renglón en blanco).
// 2. Si no, la primera oración, si es corta.
// 3. Si no, el comienzo del texto acortado con «…». En ese caso la descripción es el texto completo.
// La descripción nunca se corta; el resumen sí (es el texto de la tarjeta).
// No siempre se puede distinguir un título de una oración: el título se puede corregir desde el panel.
export function parseCaption(rawCaption) {
  const texto = typeof rawCaption === "string" ? rawCaption : "";
  const hashtags = texto.match(HASHTAG) || [];
  const renglones = renglonesLimpios(texto);
  const conTexto = renglones.filter(Boolean);

  if (conTexto.length === 0) {
    return { title: TITULO_POR_DEFECTO, summary: "", bodyParagraphs: [], hashtags, cleanCaption: "" };
  }

  const primero = renglones.findIndex(Boolean);
  const primerRenglon = renglones[primero];
  const despues = renglones.slice(primero + 1);
  const textoCompleto = parrafosDe(renglones);

  let titulo;
  let descripcion;
  const oracion = primeraOracion(primerRenglon);
  if (conTexto.length > 1 && primerRenglon.length <= LARGO_MAXIMO_TITULO) {
    titulo = primerRenglon;
    descripcion = parrafosDe(despues);
  } else if (oracion && oracion.oracion.length <= LARGO_MAXIMO_TITULO) {
    titulo = oracion.oracion;
    descripcion = parrafosDe([oracion.resto, ...despues]);
  } else if (conTexto.length === 1 && primerRenglon.length <= LARGO_MAXIMO_TITULO) {
    titulo = primerRenglon;
    descripcion = textoCompleto;
  } else {
    titulo = acortar(primerRenglon, LARGO_MAXIMO_TITULO);
    descripcion = textoCompleto;
  }

  titulo = limpiarTitulo(titulo);
  if (!titulo) titulo = TITULO_POR_DEFECTO;
  if (descripcion.length === 0) descripcion = textoCompleto;

  const primerParrafo = descripcion[0].replace(/\n/g, " ");
  const resumen =
    primerParrafo.length > LARGO_MAXIMO_RESUMEN
      ? `${primerParrafo.substring(0, LARGO_MAXIMO_RESUMEN).trim().replace(/[\s,;.]+$/, "")}...`
      : primerParrafo;

  return {
    title: titulo,
    summary: resumen,
    bodyParagraphs: descripcion,
    hashtags,
    cleanCaption: textoCompleto.join("\n\n"),
  };
}

/**
 * Formatea una fecha ISO a Mes Año institucional (ej. "Mayo 2026")
 *
 * @param {string|Date} timestamp
 * @returns {string}
 */
export function formatMonthYear(timestamp) {
  if (!timestamp) return "Reciente";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Reciente";

  const month = date.toLocaleDateString("es-AR", { month: "long" });
  const year = date.getFullYear();
  const capMonth = month.charAt(0).toUpperCase() + month.slice(1);
  return `${capMonth} ${year}`;
}

/**
 * Deduplica un listado de publicaciones por id y permalink.
 * Si hay duplicados, preserva la instancia más reciente o primera.
 *
 * @param {Array} posts
 * @returns {Array}
 */
export function deduplicateFeed(posts = []) {
  if (!Array.isArray(posts)) return [];
  const seenIds = new Set();
  const seenPermalinks = new Set();
  const result = [];

  for (const post of posts) {
    if (!post) continue;
    const id = post.id ? String(post.id) : null;
    const permalink = post.permalink ? String(post.permalink).trim().toLowerCase() : null;

    if (id && seenIds.has(id)) continue;
    if (permalink && seenPermalinks.has(permalink)) continue;

    if (id) seenIds.add(id);
    if (permalink) seenPermalinks.add(permalink);
    result.push(post);
  }

  return result;
}
