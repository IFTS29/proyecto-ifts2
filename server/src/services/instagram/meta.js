import { getPostCategories, parseCaption } from "./parser.js";
import { guardarMedioDeInstagram } from "../media/index.js";
import { crearRepoFeedInstagram } from "./feed.js";

const IMAGEN_DE_REEMPLAZO = "/media/instagram/placeholder.svg";
const esEnlaceDeInstagram = (url) => /^https:\/\/(www\.)?instagram\.com\/\S+$/.test(String(url || ""));

// Descarga y guarda los archivos de una publicación nueva. Cada archivo lleva un nombre fijo armado con los
// ids de Instagram: si una sincronización anterior ya lo había subido, se reutiliza.
// Devuelve los datos de los archivos para el feed, o null si la publicación queda pendiente: se puede
// reintentar en otra sincronización (mientras siga entre las últimas 20). Queda pendiente si falla una
// subida o si falta el archivo de una foto o de un carrusel.
// Excepciones:
// - un video sin miniatura usa la imagen de reemplazo;
// - algunos videos no tienen archivo descargable (por ejemplo, reels con música protegida). Si tienen
//   enlace a Instagram, el evento se crea igual y el detalle muestra la publicación de Instagram.
async function importarArchivos(post, guardarArchivo) {
  let fallo = false;
  const guardar = async (url, nombre, tipo) => {
    const archivo = await guardarArchivo(url, { nombre, tipo });
    if (!archivo) fallo = true;
    return archivo;
  };

  let archivos;
  if (post.media_type === "CAROUSEL_ALBUM") {
    const hijos = post.children?.data || [];
    // Un carrusel se importa completo: si Instagram no manda alguno de sus archivos, queda pendiente.
    if (hijos.length === 0 || hijos.some((hijo) => !hijo.media_url)) return null;
    const medios = [];
    for (const [indice, hijo] of hijos.entries()) {
      const tipo = hijo.media_type === "VIDEO" ? "VIDEO" : "IMAGE";
      const nombre = `${post.id}_${indice + 1}_${hijo.id}`;
      const archivo = await guardar(hijo.media_url, nombre, tipo);
      const miniatura =
        tipo === "VIDEO" && hijo.thumbnail_url ? await guardar(hijo.thumbnail_url, `${nombre}_thumb`, "IMAGE") : null;
      if (!archivo) continue;
      medios.push({
        id: hijo.id,
        tipo,
        url: archivo.url,
        publicId: archivo.publicId,
        thumbnailUrl: tipo === "VIDEO" ? miniatura?.url || IMAGEN_DE_REEMPLAZO : archivo.url,
      });
    }
    archivos = {
      mediaType: "CAROUSEL_ALBUM",
      localImage: medios.find((medio) => medio.tipo === "IMAGE")?.url || medios[0]?.thumbnailUrl || IMAGEN_DE_REEMPLAZO,
      mediaItems: medios,
      mediaCount: medios.length || hijos.length || 1,
    };
  } else if (post.media_type === "VIDEO") {
    if (!post.media_url && !esEnlaceDeInstagram(post.permalink)) return null;
    const video = post.media_url ? await guardar(post.media_url, post.id, "VIDEO") : null;
    const miniatura = post.thumbnail_url ? await guardar(post.thumbnail_url, `${post.id}_thumb`, "IMAGE") : null;
    archivos = {
      mediaType: "VIDEO",
      localVideo: video?.url || null,
      localThumbnail: miniatura?.url || IMAGEN_DE_REEMPLAZO,
    };
  } else {
    if (!post.media_url) return null;
    const foto = await guardar(post.media_url, post.id, "IMAGE");
    archivos = {
      mediaType: post.media_type || "IMAGE",
      localImage: foto?.url || IMAGEN_DE_REEMPLAZO,
      // La foto también va en la galería: así el detalle la muestra como foto, con el visor,
      // y no como publicación incrustada de Instagram.
      mediaItems: foto ? [{ id: post.id, tipo: "IMAGE", url: foto.url, publicId: foto.publicId, thumbnailUrl: foto.url }] : [],
    };
  }
  return fallo ? null : archivos;
}

/**
 * Cliente de sincronización con Meta Graph API (v26.0).
 * Diseñado con inyección de dependencias para tests deterministas.
 */
export async function sincronizarInstagram({
  config = {},
  repoFeed = crearRepoFeedInstagram(),
  mediaService = { guardarMedioDeInstagram },
  eventos = null,
  fetchFn = globalThis.fetch,
} = {}) {
  const token = config.instagramToken || process.env.INSTAGRAM_ACCESS_TOKEN || process.env.INSTAGRAM_TOKEN;
  const accountId = config.instagramAccountId || process.env.INSTAGRAM_ACCOUNT_ID;
  const limit = 20;

  if (!token || token === "tu_token_de_larga_duracion_aqui") {
    const existing = await repoFeed.loadFeed();
    let nuevosGuardados = 0;
    if (eventos && Array.isArray(existing)) {
      for (const post of existing) {
        if (post.categories?.includes("eventos")) {
          const existe = await eventos.buscarPorInstagramId(post.id);
          const parsed = post.parsed || parseCaption(post.caption);
          if (!existe) {
            await eventos.crear({
              origen: "instagram",
              instagramId: String(post.id),
              permalink: post.permalink,
              titulo: parsed.title,
              resumen: parsed.summary,
              descripcion:
                parsed.bodyParagraphs && parsed.bodyParagraphs.length > 0
                  ? parsed.bodyParagraphs.join("\n\n")
                  : post.caption || "",
              captionOriginal: post.caption,
              fechaEvento: post.timestamp || new Date().toISOString(),
              fechaPublicacionOriginal: post.timestamp || null,
              tipoMedio: post.mediaType || "IMAGE",
              fotoPrincipal:
                post.localImage ||
                post.localThumbnail ||
                post.fotoPrincipal ||
                "/media/instagram/placeholder.svg",
              videoUrl: post.localVideo || post.permalink,
              videoThumbnail: post.localThumbnail || null,
              medios: post.mediaItems || [],
              cantidadMedios: post.mediaCount || (post.mediaItems?.length) || 1,
              estado: "visible",
              categorias: post.categories,
            });
            nuevosGuardados++;
          }
        }
      }
    }

    const syncStatus = {
      conectado: false,
      cuenta: (await repoFeed.loadSyncStatus?.())?.cuenta || null,
      hashtag: "#eventosIFTS2",
      ultimaSincronizacion: new Date().toISOString(),
      estado: "sin_sincronizar",
      totalPosts: existing.length,
      nuevos: nuevosGuardados,
    };
    if (repoFeed.saveSyncStatus) {
      await repoFeed.saveSyncStatus(syncStatus);
    }

    return {
      success: true,
      mensaje: "Sin token de Instagram configurado. Se mantiene el feed persistido.",
      count: existing.length,
      nuevos: nuevosGuardados,
      posts: existing,
      syncStatus,
    };
  }

  if (!accountId) {
    const existing = await repoFeed.loadFeed();
    return {
      success: false,
      error: "Falta configurar INSTAGRAM_ACCOUNT_ID",
      posts: existing,
    };
  }

  let accountUsername = (await repoFeed.loadSyncStatus?.())?.cuenta || null;
  try {
    const profileUrl = `https://graph.facebook.com/v26.0/${accountId}?fields=id,username,name&access_token=${token}`;
    const profileRes = await fetchFn(profileUrl);
    const profile = await profileRes.json();
    if (profile && profile.username) {
      accountUsername = `@${profile.username}`;
    }
  } catch {
    // Si falla la consulta del perfil, mantener la cuenta previa o null
  }

  const fields =
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_type,media_url,thumbnail_url}";
  const urlMeta = `https://graph.facebook.com/v26.0/${accountId}/media?fields=${fields}&limit=${limit}&access_token=${token}`;

  try {
    const res = await fetchFn(urlMeta);
    const result = await res.json();

    if (!res.ok || result.error) {
      const errorMsg = result.error?.message || `Error HTTP ${res.status}`;
      console.warn(`[instagram.meta] Advertencia de Meta Graph API: ${errorMsg}`);
      const existing = await repoFeed.loadFeed();
      if (repoFeed.saveSyncStatus) {
        await repoFeed.saveSyncStatus({
          conectado: false,
          cuenta: accountUsername,
          cuentaId: accountId,
          hashtag: "#eventosIFTS2",
          ultimaSincronizacion: (await repoFeed.loadSyncStatus?.())?.ultimaSincronizacion || null,
          estado: "error",
          error: errorMsg,
        });
      }
      return {
        success: false,
        error: errorMsg,
        code: result.error?.code,
        posts: existing,
      };
    }

    const postsMeta = result.data || [];
    const deletedIds = await repoFeed.loadDeletedPostIds();
    const feedResults = [];
    // Publicaciones que no se importaron porque falló algún archivo: se reintentan en la próxima sincronización.
    const pendientes = new Set();

    for (const post of postsMeta) {
      if (deletedIds.includes(String(post.id))) {
        continue;
      }

      const caption = post.caption || "";
      const categories = getPostCategories(caption);

      if (categories.length === 0) {
        continue;
      }

      // Si el evento ya existe no se descarga ni se sube nada: la sincronización no modifica eventos guardados.
      if (eventos && (await eventos.buscarPorInstagramId(post.id))) {
        continue;
      }

      const archivos = await importarArchivos(post, mediaService.guardarMedioDeInstagram);
      if (!archivos) {
        pendientes.add(String(post.id));
        continue;
      }
      feedResults.push({
        id: post.id,
        caption,
        permalink: post.permalink,
        timestamp: post.timestamp,
        categories,
        ...archivos,
      });
    }

    // Fusión acumulativa con posts locales existentes
    const existingPosts = await repoFeed.loadFeed();
    const validExisting = existingPosts.filter((p) => !deletedIds.includes(String(p.id)));
    const newIds = new Set(feedResults.map((p) => String(p.id)));

    const mergedPosts = [
      ...feedResults,
      ...validExisting.filter((p) => !newIds.has(String(p.id))),
    ];

    if (mergedPosts.length > 0) {
      await repoFeed.saveFeed(mergedPosts);
    }

    // Ingestar en la colección de eventos institucionales cualquier publicación categorizada
    let nuevosGuardados = 0;
    if (eventos && Array.isArray(mergedPosts)) {
      for (const post of mergedPosts) {
        if (post.categories?.includes("eventos") && !pendientes.has(String(post.id))) {
          const existe = await eventos.buscarPorInstagramId(post.id);
          const parsed = post.parsed || parseCaption(post.caption);
          if (!existe) {
            await eventos.crear({
              origen: "instagram",
              instagramId: String(post.id),
              permalink: post.permalink,
              titulo: parsed.title,
              resumen: parsed.summary,
              descripcion:
                parsed.bodyParagraphs && parsed.bodyParagraphs.length > 0
                  ? parsed.bodyParagraphs.join("\n\n")
                  : post.caption || "",
              captionOriginal: post.caption,
              fechaEvento: post.timestamp || new Date().toISOString(),
              fechaPublicacionOriginal: post.timestamp || null,
              tipoMedio: post.mediaType || "IMAGE",
              fotoPrincipal:
                post.localImage ||
                post.localThumbnail ||
                post.fotoPrincipal ||
                "/media/instagram/placeholder.svg",
              videoUrl: post.localVideo || post.permalink,
              videoThumbnail: post.localThumbnail || null,
              medios: post.mediaItems || [],
              cantidadMedios: post.mediaCount || (post.mediaItems?.length) || 1,
              estado: "visible",
              categorias: post.categories,
            });
            nuevosGuardados++;
          }
        }
      }
    } else {
      nuevosGuardados = feedResults.filter((p) => !validExisting.some((e) => String(e.id) === String(p.id))).length;
    }

    const syncStatus = {
      conectado: true,
      cuenta: accountUsername,
      cuentaId: accountId,
      hashtag: "#eventosIFTS2",
      ultimaSincronizacion: new Date().toISOString(),
      estado: "activo",
      totalPosts: mergedPosts.length,
      nuevos: nuevosGuardados,
      pendientes: pendientes.size,
      totalLeidos: postsMeta.length,
    };
    if (repoFeed.saveSyncStatus) {
      await repoFeed.saveSyncStatus(syncStatus);
    }

    if (mergedPosts.length > 0) {
      return {
        success: true,
        count: mergedPosts.length,
        nuevos: nuevosGuardados,
        pendientes: pendientes.size,
        totalLeidos: postsMeta.length,
        posts: mergedPosts,
        syncStatus,
      };
    }

    return {
      success: true,
      count: existingPosts.length,
      nuevos: nuevosGuardados,
      pendientes: pendientes.size,
      totalLeidos: postsMeta.length,
      posts: existingPosts,
      notice: "Sin publicaciones nuevas coincidentes",
      syncStatus,
    };
  } catch (err) {
    console.error("[instagram.meta] Error de red o ejecución:", err.message);
    const existing = await repoFeed.loadFeed();
    if (repoFeed.saveSyncStatus) {
      await repoFeed.saveSyncStatus({
        conectado: false,
        cuenta: accountUsername,
        hashtag: "#eventosIFTS2",
        ultimaSincronizacion: (await repoFeed.loadSyncStatus?.())?.ultimaSincronizacion || null,
        estado: "error",
        error: err.message,
      });
    }
    return {
      success: false,
      error: err.message,
      posts: existing,
    };
  }
}
