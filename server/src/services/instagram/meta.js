import { getPostCategories, parseCaption } from "./parser.js";
import { guardarMedio } from "../media/index.js";
import { crearRepoFeedInstagram } from "./feed.js";

/**
 * Cliente de sincronización con Meta Graph API (v26.0).
 * Diseñado con inyección de dependencias para tests deterministas.
 */
export async function sincronizarInstagram({
  config = {},
  repoFeed = crearRepoFeedInstagram(),
  mediaService = { guardarMedio },
  eventos = null,
  fetchFn = globalThis.fetch,
} = {}) {
  const token = config.instagramToken || process.env.INSTAGRAM_ACCESS_TOKEN || process.env.INSTAGRAM_TOKEN;
  const accountId = config.instagramAccountId || process.env.INSTAGRAM_ACCOUNT_ID;
  const limit = 20;

  if (!token || token === "tu_token_de_larga_duracion_aqui") {
    const existing = await repoFeed.loadFeed();
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
              fotoPrincipal: post.localImage || post.fotoPrincipal || "/media/instagram/placeholder.svg",
              videoUrl: post.localVideo || post.permalink,
              videoThumbnail: post.localThumbnail || null,
              medios: post.mediaItems || [],
              cantidadMedios: post.mediaCount || (post.mediaItems?.length) || 1,
              estado: "visible",
              categorias: post.categories,
            });
          }
        }
      }
    }

    const syncStatus = {
      conectado: false,
      cuenta: "@ifts_2_ok",
      hashtag: "#eventosIFTS2",
      ultimaSincronizacion: new Date().toISOString(),
      estado: "sin_sincronizar",
      totalPosts: existing.length,
    };
    if (repoFeed.saveSyncStatus) {
      await repoFeed.saveSyncStatus(syncStatus);
    }

    return {
      success: true,
      mensaje: "Sin token de Instagram configurado. Se mantiene el feed persistido.",
      count: existing.length,
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

  let accountUsername = "@ifts_2_ok";
  try {
    const profileUrl = `https://graph.facebook.com/v26.0/${accountId}?fields=id,username,name&access_token=${token}`;
    const profileRes = await fetchFn(profileUrl);
    const profile = await profileRes.json();
    if (profile && profile.username) {
      accountUsername = `@${profile.username}`;
    }
  } catch {
    // Preservar fallback institucional @ifts_2_ok
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

    for (const post of postsMeta) {
      if (deletedIds.includes(String(post.id))) {
        continue;
      }

      const caption = post.caption || "";
      const categories = getPostCategories(caption);

      if (categories.length === 0) {
        continue;
      }

      if (post.media_type === "CAROUSEL_ALBUM") {
        const childrenData = post.children?.data || [];
        const mediaItems = [];
        let coverImage = null;

        for (let i = 0; i < childrenData.length; i++) {
          const child = childrenData[i];
          const isChildVideo = child.media_type === "VIDEO";
          const ext = isChildVideo ? ".mp4" : ".jpg";
          const childFilename = `${post.id}_${i + 1}_${child.id}${ext}`;

          let localChildPath = null;
          if (child.media_url) {
            localChildPath = await mediaService.guardarMedio(child.media_url, childFilename);
          }

          let localChildThumb = null;
          if (isChildVideo && child.thumbnail_url) {
            localChildThumb = await mediaService.guardarMedio(
              child.thumbnail_url,
              `${post.id}_${i + 1}_${child.id}_thumb.jpg`,
            );
          }

          if (localChildPath) {
            mediaItems.push({
              id: child.id,
              mediaType: child.media_type || "IMAGE",
              url: localChildPath,
              thumbnailUrl: localChildThumb || localChildPath,
            });
            if (!coverImage && !isChildVideo) {
              coverImage = localChildPath;
            }
          }
        }

        if (!coverImage && post.media_url) {
          coverImage = await mediaService.guardarMedio(post.media_url, `${post.id}.jpg`);
        }
        if (!coverImage && mediaItems.length > 0) {
          coverImage = mediaItems[0].thumbnailUrl || mediaItems[0].url;
        }

        feedResults.push({
          id: post.id,
          caption,
          mediaType: "CAROUSEL_ALBUM",
          permalink: post.permalink,
          timestamp: post.timestamp,
          localImage: coverImage || "/media/instagram/placeholder.svg",
          mediaItems,
          mediaCount: mediaItems.length > 0 ? mediaItems.length : childrenData.length || 1,
          categories,
        });
      } else if (post.media_type === "VIDEO") {
        const localThumb = post.thumbnail_url
          ? await mediaService.guardarMedio(post.thumbnail_url, `${post.id}_thumb.jpg`)
          : "/media/instagram/placeholder.svg";
        const localVideo = post.media_url
          ? await mediaService.guardarMedio(post.media_url, `${post.id}.mp4`)
          : null;

        feedResults.push({
          id: post.id,
          caption,
          mediaType: "VIDEO",
          permalink: post.permalink,
          timestamp: post.timestamp,
          localThumbnail: localThumb,
          localVideo,
          categories,
        });
      } else {
        const localImg = post.media_url
          ? await mediaService.guardarMedio(post.media_url, `${post.id}.jpg`)
          : "/media/instagram/placeholder.svg";

        feedResults.push({
          id: post.id,
          caption,
          mediaType: post.media_type || "IMAGE",
          permalink: post.permalink,
          timestamp: post.timestamp,
          localImage: localImg,
          categories,
        });
      }
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
    if (eventos && Array.isArray(mergedPosts)) {
      for (const post of mergedPosts) {
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
              fotoPrincipal: post.localImage || post.fotoPrincipal || "/media/instagram/placeholder.svg",
              videoUrl: post.localVideo || post.permalink,
              videoThumbnail: post.localThumbnail || null,
              medios: post.mediaItems || [],
              cantidadMedios: post.mediaCount || (post.mediaItems?.length) || 1,
              estado: "visible",
              categorias: post.categories,
            });
          }
        }
      }
    }

    const syncStatus = {
      conectado: true,
      cuenta: accountUsername,
      cuentaId: accountId,
      hashtag: "#eventosIFTS2",
      ultimaSincronizacion: new Date().toISOString(),
      estado: "activo",
      totalPosts: mergedPosts.length,
      nuevos: feedResults.length,
    };
    if (repoFeed.saveSyncStatus) {
      await repoFeed.saveSyncStatus(syncStatus);
    }

    if (mergedPosts.length > 0) {
      return {
        success: true,
        count: mergedPosts.length,
        nuevos: feedResults.length,
        posts: mergedPosts,
        syncStatus,
      };
    }

    return {
      success: true,
      count: existingPosts.length,
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
