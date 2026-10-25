import { Router } from "express";
import { crearRepoFeedInstagram } from "../services/instagram.feed.js";
import { sincronizarInstagram } from "../services/instagram.meta.js";
import { guardarMedio } from "../services/media.local.js";
import { autenticar, requiereRol } from "../middleware/auth.js";

export function crearRutasInstagram({
  config = {},
  usuarios,
  repoFeed = crearRepoFeedInstagram(),
  mediaService = { guardarMedio },
} = {}) {
  const router = Router();
  const middlewaresAuth = usuarios
    ? [autenticar({ config, usuarios }), requiereRol("admin")]
    : [];

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
