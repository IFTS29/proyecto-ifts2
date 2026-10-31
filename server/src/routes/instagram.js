import { Router } from "express";
import { credencialesDeInstagram, crearRepoFeedInstagram, sincronizarInstagram } from "../services/instagram/index.js";
import { guardarMedioDeInstagram } from "../services/media/index.js";
import { autenticar, requiereRol } from "../middleware/auth.js";

export function crearRutasInstagram({
  config = {},
  usuarios,
  eventos,
  repoFeed = crearRepoFeedInstagram(),
  mediaService = { guardarMedioDeInstagram },
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

      const { configuradas } = credencialesDeInstagram(config);
      // La versión anterior, al sincronizar sin credenciales, guardaba estado "sin_sincronizar" con la hora
      // del clic. Esa fecha no corresponde a una sincronización real: se descarta.
      const guardado = statusGuardado?.estado === "sin_sincronizar" ? null : statusGuardado;
      const datosGuardados = {
        cuenta: guardado?.cuenta || null,
        hashtag: "#eventosIFTS2",
        ultimaSincronizacion: guardado?.ultimaSincronizacion || null,
      };

      // Sin credenciales no hay conexión, aunque haya quedado guardada una sincronización correcta anterior.
      if (!configuradas) {
        return res.json({ ...datosGuardados, configurado: false, conectado: false, estado: "sin_conexion", error: null });
      }

      return res.json({
        ...datosGuardados,
        configurado: true,
        conectado: guardado?.conectado ?? true,
        estado: guardado?.estado || "activo",
        error: guardado?.error || null,
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

      // 503: la sincronización no está disponible porque falta configurarla (no se consultó Instagram).
      // 502: la sincronización falló, por ejemplo porque Instagram respondió con un error.
      if (!resultado.success) {
        return res.status(resultado.sinCredenciales ? 503 : 502).json(resultado);
      }

      return res.json(resultado);
    } catch (err) {
      console.error("[rutas-instagram] Error al sincronizar:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
