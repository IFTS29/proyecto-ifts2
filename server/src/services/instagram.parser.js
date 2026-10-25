/**
 * Parser y clasificador de publicaciones de Instagram para el IFTS N.° 2.
 */

export const CONFIG_CATEGORIAS_DEFECTO = {
  novedades: {
    id: "novedades",
    titulo: "Novedades Institucionales",
    hashtags: ["#novedades", "#ifts2novedades", "#comunicado", "#institucional", "#inscripciones", "#test"],
  },
  eventos: {
    id: "eventos",
    titulo: "Eventos y Prácticas",
    hashtags: ["#eventos", "#ifts2eventos", "#talleres", "#hackathon", "#estudiantes", "#comunidad"],
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

/**
 * Normaliza y estructura editorialmente el texto (caption) de una publicación:
 * 1. Extrae y separa los hashtags del cuerpo del texto.
 * 2. Extrae la 1.° línea como título institucional (default: "Publicación Institucional").
 * 3. Genera una bajada breve para la tarjeta del carrusel (máx. ~110 caracteres).
 * 4. Separa el resto en párrafos limpios para la vista detallada.
 *
 * @param {string|null|undefined} rawCaption
 * @returns {{ title: string, summary: string, bodyParagraphs: string[], hashtags: string[], cleanCaption: string }}
 */
export function parseCaption(rawCaption) {
  const defaultTitle = "Publicación Institucional";

  if (!rawCaption || typeof rawCaption !== "string") {
    return {
      title: defaultTitle,
      summary: "",
      bodyParagraphs: [],
      hashtags: [],
      cleanCaption: "",
    };
  }

  // 1. Extraer hashtags y limpiar el cuerpo
  const hashtags = rawCaption.match(/#[\p{L}\p{N}_]+/gu) || [];
  const textWithoutTags = rawCaption.replace(/#[\p{L}\p{N}_]+/gu, "").trim();

  // Si solo contenía hashtags o quedó vacío tras quitarlos
  if (!textWithoutTags) {
    return {
      title: defaultTitle,
      summary: "",
      bodyParagraphs: [],
      hashtags,
      cleanCaption: "",
    };
  }

  // 2. Normalizar saltos de línea y remover líneas con puntos típicas de Instagram
  const normalized = textWithoutTags
    .replace(/\r\n/g, "\n")
    .replace(/\n\s*[.·•-]+\s*\n/g, "\n\n")
    .trim();

  // 3. Dividir por bloques de párrafos
  const rawParagraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !/^[.·•\-_ \t]+$/.test(p));

  const paragraphs = rawParagraphs.length > 0
    ? rawParagraphs
    : normalized.split(/\n+/).map((p) => p.trim()).filter(Boolean);

  let title = defaultTitle;
  let bodyParagraphs = [];

  if (paragraphs.length > 0) {
    const firstP = paragraphs[0];
    const firstLines = firstP.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    title = firstLines[0] || defaultTitle;

    if (firstLines.length > 1) {
      bodyParagraphs = [firstLines.slice(1).join(" "), ...paragraphs.slice(1)];
    } else {
      bodyParagraphs = paragraphs.slice(1);
    }
  }

  // 4. Bajada para la tarjeta (resumen)
  let summary = bodyParagraphs[0] || "";
  if (!summary && paragraphs.length > 0 && paragraphs[0] !== title) {
    summary = paragraphs[0];
  }
  if (!summary) {
    summary = textWithoutTags;
  }

  const maxSummary = 110;
  if (summary.length > maxSummary) {
    summary = summary.substring(0, maxSummary).trim().replace(/[\s,;.]+$/, "") + "...";
  }

  return {
    title,
    summary,
    bodyParagraphs: bodyParagraphs.length > 0 ? bodyParagraphs : (summary ? [summary] : []),
    hashtags,
    cleanCaption: textWithoutTags,
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
    const idKey = post.id ? String(post.id) : null;
    const linkKey = post.permalink ? String(post.permalink).toLowerCase().trim() : null;

    if (idKey && seenIds.has(idKey)) continue;
    if (linkKey && seenPermalinks.has(linkKey)) continue;

    if (idKey) seenIds.add(idKey);
    if (linkKey) seenPermalinks.add(linkKey);

    result.push(post);
  }

  return result;
}
