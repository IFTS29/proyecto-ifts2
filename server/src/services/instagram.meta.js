import { getPostCategories } from "./instagram.parser.js";
import { guardarMedio } from "./media.local.js";
import { crearRepoFeedInstagram } from "./instagram.feed.js";

/**
 * Cliente de sincronización con Meta Graph API (v26.0).
 * Diseñado con inyección de dependencias para tests deterministas.
 */
export async function sincronizarInstagram({
  config = {},
  repoFeed = crearRepoFeedInstagram(),
  mediaService = { guardarMedio },
  fetchFn = globalThis.fetch,
} = {}) {
  const token = config.instagramToken || process.env.INSTAGRAM_ACCESS_TOKEN || process.env.INSTAGRAM_TOKEN;
  const accountId = config.instagramAccountId || process.env.INSTAGRAM_ACCOUNT_ID;
  const limit = 20;

  if (!token || token === "tu_token_de_larga_duracion_aqui") {
    const existing = await repoFeed.loadFeed();
    return {
      success: true,
      mensaje: "Sin token de Instagram configurado. Se mantiene el feed persistido.",
      count: existing.length,
      posts: existing,
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
      return {
        success: true,
        count: mergedPosts.length,
        nuevos: feedResults.length,
        posts: mergedPosts,
      };
    }

    return {
      success: true,
      count: existingPosts.length,
      posts: existingPosts,
      notice: "Sin publicaciones nuevas coincidentes",
    };
  } catch (err) {
    console.error("[instagram.meta] Error de red o ejecución:", err.message);
    const existing = await repoFeed.loadFeed();
    return {
      success: false,
      error: err.message,
      posts: existing,
    };
  }
}
