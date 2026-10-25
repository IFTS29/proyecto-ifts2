import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { parseCaption, formatMonthYear, deduplicateFeed } from "./parser.js";
import { InstagramSync } from "../../models/InstagramSync.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const esServerless = Boolean(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.NOW_REGION ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  (typeof __dirname === "string" && __dirname.includes("/var/task"))
);

// En Vercel o serverless (/var/task de solo lectura) redirigimos el fallback a /tmp
const DEFAULT_STORAGE_DIR = esServerless
  ? path.join(os.tmpdir(), "instagram")
  : path.resolve(__dirname, "../../../storage/instagram");

function enriquecerPost(post) {
  const parsed = parseCaption(post.caption);
  const fechaFormateada = formatMonthYear(post.timestamp);
  const isAlbum =
    post.mediaType === "CAROUSEL_ALBUM" || (Array.isArray(post.mediaItems) && post.mediaItems.length > 1);
  const isVideo = post.mediaType === "VIDEO";
  const cantidadMedios = post.mediaCount || (Array.isArray(post.mediaItems) ? post.mediaItems.length : 1);

  return {
    ...post,
    parsed,
    fechaFormateada,
    isAlbum,
    isVideo,
    cantidadMedios,
    fotoPrincipal: isVideo
      ? post.localThumbnail || post.thumbnailUrl || "/media/instagram/placeholder.svg"
      : post.localImage || post.mediaItems?.[0]?.url || "/media/instagram/placeholder.svg",
  };
}

export function crearRepoFeedInstagram({
  storageDir = DEFAULT_STORAGE_DIR,
  feedFilename = "feed.json",
  deletedFilename = "deleted-posts.json",
  syncStatusFilename = "sync-status.json",
  maxPosts = 20,
} = {}) {
  const feedPath = path.join(storageDir, feedFilename);
  const deletedPath = path.join(storageDir, deletedFilename);
  const syncStatusPath = path.join(storageDir, syncStatusFilename);

  const usaMongo = () => Boolean(mongoose.connection && mongoose.connection.readyState >= 1);

  async function loadDeletedPostIds() {
    if (usaMongo()) {
      try {
        const doc = await InstagramSync.findOne({ clave: "global" }).lean();
        if (!doc || !Array.isArray(doc.deletedPosts)) return [];
        return doc.deletedPosts.map((item) =>
          typeof item === "object" && item !== null && item.id ? String(item.id) : String(item),
        );
      } catch {
        return [];
      }
    }

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

    if (usaMongo()) {
      try {
        await InstagramSync.findOneAndUpdate(
          { clave: "global" },
          {
            $addToSet: {
              deletedPosts: {
                id: targetId,
                discardedAt: new Date().toISOString(),
                caption: postDetails?.caption || "",
                mediaType: postDetails?.mediaType || "",
              },
            },
          },
          { upsert: true },
        );
        return;
      } catch (err) {
        console.warn("[repo-instagram] Error registrando post descartado en MongoDB:", err.message);
      }
    }

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
    if (usaMongo()) {
      try {
        const doc = await InstagramSync.findOne({ clave: "global" }).lean();
        const posts = Array.isArray(doc?.feedCache) ? doc.feedCache : [];
        const deletedIds = await loadDeletedPostIds();
        const active = posts.filter((p) => !deletedIds.includes(String(p.id)));
        return active.map(enriquecerPost);
      } catch {
        return [];
      }
    }

    let raw;
    try {
      raw = await fs.readFile(feedPath, "utf-8");
    } catch {
      return [];
    }

    try {
      const posts = JSON.parse(raw);
      if (!Array.isArray(posts)) return [];

      const deletedIds = await loadDeletedPostIds();
      const active = posts.filter((p) => !deletedIds.includes(String(p.id)));
      return active.map(enriquecerPost);
    } catch {
      return [];
    }
  }

  async function saveFeed(posts = []) {
    const deduplicated = deduplicateFeed(posts);
    const sorted = [...deduplicated].sort(
      (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime(),
    );
    const trimmed = sorted.slice(0, maxPosts);

    if (usaMongo()) {
      try {
        await InstagramSync.findOneAndUpdate(
          { clave: "global" },
          { $set: { feedCache: trimmed } },
          { upsert: true },
        );
        return trimmed;
      } catch (err) {
        console.warn("[repo-instagram] Error guardando feed en MongoDB:", err.message);
      }
    }

    await fs.mkdir(storageDir, { recursive: true });
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

  async function loadSyncStatus() {
    if (usaMongo()) {
      try {
        const doc = await InstagramSync.findOne({ clave: "global" }).lean();
        if (!doc) {
          return {
            conectado: false,
            cuenta: null,
            hashtag: "#eventosIFTS2",
            ultimaSincronizacion: null,
            estado: "sin_sincronizar",
          };
        }
        return {
          conectado: Boolean(doc.conectado),
          cuenta: doc.cuenta || null,
          hashtag: doc.hashtag || "#eventosIFTS2",
          ultimaSincronizacion: doc.ultimaSincronizacion ? new Date(doc.ultimaSincronizacion).toISOString() : null,
          estado: doc.estado || "activo",
          error: doc.error || null,
        };
      } catch {
        return {
          conectado: false,
          cuenta: null,
          hashtag: "#eventosIFTS2",
          ultimaSincronizacion: null,
          estado: "sin_sincronizar",
        };
      }
    }

    try {
      const raw = await fs.readFile(syncStatusPath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return {
        conectado: false,
        cuenta: null,
        hashtag: "#eventosIFTS2",
        ultimaSincronizacion: null,
        estado: "sin_sincronizar",
      };
    }
  }

  async function saveSyncStatus(status = {}) {
    if (usaMongo()) {
      try {
        await InstagramSync.findOneAndUpdate(
          { clave: "global" },
          {
            $set: {
              conectado: Boolean(status.conectado),
              cuenta: status.cuenta || null,
              hashtag: status.hashtag || "#eventosIFTS2",
              ultimaSincronizacion: status.ultimaSincronizacion
                ? new Date(status.ultimaSincronizacion)
                : new Date(),
              estado: status.estado || "activo",
              error: status.error || null,
            },
          },
          { upsert: true },
        );
        return status;
      } catch (err) {
        console.warn("[repo-instagram] Error guardando estado de sincronización en MongoDB:", err.message);
      }
    }

    try {
      await fs.mkdir(storageDir, { recursive: true });
      await fs.writeFile(syncStatusPath, JSON.stringify(status, null, 2), "utf-8");
      return status;
    } catch {
      return status;
    }
  }

  return {
    loadFeed,
    saveFeed,
    loadDeletedPostIds,
    registerDeletedPostId,
    deletePostById,
    loadSyncStatus,
    saveSyncStatus,
  };
}
