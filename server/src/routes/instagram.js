import { Router } from "express";
import { crearRepoFeedInstagram, sincronizarInstagram } from "../services/instagram/index.js";
import { guardarMedio } from "../services/media/index.js";
import { autenticar, requiereRol } from "../middleware/auth.js";

export function crearRutasInstagram({
  config = {},
  usuarios,
  eventos,
  repoFeed = crearRepoFeedInstagram(),
  mediaService = { guardarMedio },
} = {}) {
  const router = Router();
  const middlewaresAuth = usuarios
    ? [autenticar({ config, usuarios }), requiereRol("admin")]
    : [];

  // GET /api/instagram/status (Información dinámica del estado de sincronización y cuenta conectada)
  router.get("/status", async (req, res) => {
    try {
      const statusGuardado = repoFeed.loadSyncStatus
        ? await repoFeed.loadSyncStatus()
        : null;

      const tieneCredenciales = Boolean(
        config.instagramToken || process.env.INSTAGRAM_ACCESS_TOKEN || process.env.INSTAGRAM_TOKEN,
      );

      return res.json({
        conectado: statusGuardado?.conectado ?? tieneCredenciales,
        cuenta: statusGuardado?.cuenta || null,
        hashtag: "#eventosIFTS2",
        ultimaSincronizacion: statusGuardado?.ultimaSincronizacion || null,
        estado: statusGuardado?.estado || (tieneCredenciales ? "activo" : "sin_sincronizar"),
        error: statusGuardado?.error || null,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/instagram/feed?category=eventos (Público para el portal institucional)
  router.get("/feed", async (req, res) => {
    try {
      const posts = await repoFeed.loadFeed();
      const { category } = req.query;

      if (category) {
        const filtered = posts.filter(
          (p) => Array.isArray(p.categories) && p.categories.includes(String(category)),
        );
        return res.json(filtered);
      }

      return res.json(posts);
    } catch (err) {
      console.error("[rutas-instagram] Error al cargar feed:", err);
      return res.status(500).json({ error: "Error al cargar el feed de Instagram" });
    }
  });

  // POST /api/instagram/sync (Protegido: requiere JWT válido y rol admin)
  router.post("/sync", ...middlewaresAuth, async (req, res) => {
    try {
      const resultado = await sincronizarInstagram({
        config,
        repoFeed,
        mediaService,
        eventos,
      });

      if (!resultado.success) {
        return res.status(502).json(resultado);
      }

      return res.json(resultado);
    } catch (err) {
      console.error("[rutas-instagram] Error al sincronizar:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
