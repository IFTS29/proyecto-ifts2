import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCaption, formatMonthYear, deduplicateFeed } from "./parser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_STORAGE_DIR = path.resolve(__dirname, "../../../storage/instagram");

export function crearRepoFeedInstagram({
  storageDir = DEFAULT_STORAGE_DIR,
  feedFilename = "feed.json",
  deletedFilename = "deleted-posts.json",
  maxPosts = 20,
} = {}) {
  const feedPath = path.join(storageDir, feedFilename);
  const deletedPath = path.join(storageDir, deletedFilename);
  const seedPath = path.resolve(__dirname, "../../data/instagram-seed.json");

  async function loadDeletedPostIds() {
    try {
      const raw = await fs.readFile(deletedPath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        return data.map((item) =>
          typeof item === "object" && item !== null && item.id ? String(item.id) : String(item),
        );
      }
      return [];
    } catch {
      return [];
    }
  }

  async function registerDeletedPostId(id, postDetails = null) {
    if (!id) return;
    const targetId = String(id);
    let records = [];
    try {
      const raw = await fs.readFile(deletedPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) records = parsed;
    } catch {
      // Ignorar si aún no existe
    }

    const exists = records.some(
      (item) => (typeof item === "object" && item !== null ? String(item.id) : String(item)) === targetId,
    );

    if (!exists) {
      records.push({
        id: targetId,
        discardedAt: new Date().toISOString(),
        caption: postDetails?.caption || "",
        mediaType: postDetails?.mediaType || "",
      });
      await fs.mkdir(storageDir, { recursive: true });
      await fs.writeFile(deletedPath, JSON.stringify(records, null, 2), "utf-8");
    }
  }

  async function loadFeed() {
    let raw;
    try {
      raw = await fs.readFile(feedPath, "utf-8");
    } catch {
      try {
        raw = await fs.readFile(seedPath, "utf-8");
        await fs.mkdir(storageDir, { recursive: true });
        await fs.writeFile(feedPath, raw, "utf-8");
      } catch {
        return [];
      }
    }

    try {
      const posts = JSON.parse(raw);
      if (!Array.isArray(posts)) return [];

      const deletedIds = await loadDeletedPostIds();
      const active = posts.filter((p) => !deletedIds.includes(String(p.id)));

      // Enriquecer con información procesada (título editorial, resumen, fecha formateada)
      return active.map((post) => {
        const parsed = parseCaption(post.caption);
        const fechaFormateada = formatMonthYear(post.timestamp);
        const isAlbum = post.mediaType === "CAROUSEL_ALBUM" || (Array.isArray(post.mediaItems) && post.mediaItems.length > 1);
        const isVideo = post.mediaType === "VIDEO";
        const cantidadMedios = post.mediaCount || (Array.isArray(post.mediaItems) ? post.mediaItems.length : 1);

        return {
          ...post,
          parsed,
          fechaFormateada,
          isAlbum,
          isVideo,
          cantidadMedios,
          // Asegurar fallback de imagen principal
          fotoPrincipal: isVideo
            ? (post.localThumbnail || post.thumbnailUrl || "/media/instagram/placeholder.svg")
            : (post.localImage || (post.mediaItems?.[0]?.url) || "/media/instagram/placeholder.svg"),
        };
      });
    } catch {
      return [];
    }
  }

  async function saveFeed(posts = []) {
    await fs.mkdir(storageDir, { recursive: true });
    const deduplicated = deduplicateFeed(posts);

    // Ordenar cronológicamente descendente
    const sorted = [...deduplicated].sort(
      (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime(),
    );

    const trimmed = sorted.slice(0, maxPosts);
    await fs.writeFile(feedPath, JSON.stringify(trimmed, null, 2), "utf-8");
    return trimmed;
  }

  async function deletePostById(id) {
    const posts = await loadFeed();
    const targetId = String(id);
    const targetPost = posts.find((p) => String(p.id) === targetId);
    const remaining = posts.filter((p) => String(p.id) !== targetId);

    await registerDeletedPostId(targetId, targetPost);
    await saveFeed(remaining);
    return { success: true, deletedId: targetId, total: remaining.length };
  }

  return {
    loadFeed,
    saveFeed,
    loadDeletedPostIds,
    registerDeletedPostId,
    deletePostById,
  };
}
