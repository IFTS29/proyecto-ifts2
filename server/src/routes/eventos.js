import { Router } from "express";
import { autenticar, requiereRol } from "../middleware/auth.js";
import { guardarMedio } from "../services/media/index.js";

const ESTADOS_VALIDOS = ["visible", "oculto", "archivado"];

async function extraerFotoInstagram(url) {
  try {
    if (!url || typeof url !== "string" || !url.includes("instagram.com")) return null;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/property="og:image"\s+content="([^"]+)"/i);
    if (!match || !match[1]) return null;
    const cdnUrl = match[1].replaceAll("&amp;", "&");
    const idMatch = url.match(/\/(p|reel)\/([^/?#]+)/i);
    const shortcode = idMatch ? idMatch[2] : String(Date.now());
    const localUrl = await guardarMedio(cdnUrl, `ig_post_${shortcode}.jpg`);
    return localUrl || cdnUrl;
  } catch {
    return null;
  }
}

export function crearRutasEventos({ config, usuarios, eventos }) {
  const router = Router();
  const soloAdmin = [autenticar({ config, usuarios }), requiereRol("admin")];

  // ==============================================================
  // Rutas administrativas (Panel de control: AdminEventos.jsx)
  // ==============================================================

  // GET /api/events/admin: requiere autenticación y rol admin.
  // Permite ver todos los estados o filtrar con ?estado=... y devuelve conteos de moderación.
  router.get("/admin", ...soloAdmin, async (req, res, next) => {
    try {
      const estadoFiltro =
        req.query.estado && ESTADOS_VALIDOS.includes(req.query.estado)
          ? req.query.estado
          : undefined;

      const lista = await eventos.listar({
        estado: estadoFiltro,
        origen: req.query.origen,
      });

      const conteos = eventos.contarPorEstado ? await eventos.contarPorEstado() : null;

      res.json({
        eventos: lista,
        conteos,
      });
    } catch (e) {
      next(e);
    }
  });

  // POST /api/events: Creación manual de eventos (solo administradores autenticados).
  router.post("/", ...soloAdmin, async (req, res, next) => {
    try {
      const datos = req.body || {};
      const titulo = String(datos.titulo || "").trim();
      const descripcion = String(datos.descripcion || "").trim();
      const resumen = String(datos.resumen || "").trim();
      let fotoPrincipal = String(datos.fotoPrincipal || "").trim() || "/media/instagram/placeholder.svg";

      if (!titulo) {
        return res.status(400).json({ error: "El título del evento es obligatorio." });
      }
      if (!descripcion) {
        return res.status(400).json({ error: "La descripción del evento es obligatoria." });
      }

      let fechaEvento = new Date();
      if (datos.fechaEvento) {
        const fechaParseada = new Date(datos.fechaEvento);
        if (isNaN(fechaParseada.getTime())) {
          return res.status(400).json({ error: "La fecha del evento no es válida." });
        }
        fechaEvento = fechaParseada;
      }

      const estado = ESTADOS_VALIDOS.includes(datos.estado) ? datos.estado : "visible";
      const medios = Array.isArray(datos.medios) ? [...datos.medios] : [];
      const tieneFotoManual = fotoPrincipal && !fotoPrincipal.includes("placeholder");
      const urlVideo = datos.videoUrl ? String(datos.videoUrl).trim() : null;
      const tieneFotosSubidas = medios.some((m) => m.tipo === "IMAGE" && m.url && !m.url.includes("placeholder"));

      if (!tieneFotoManual && !tieneFotosSubidas && urlVideo && urlVideo.includes("instagram.com")) {
        const fotoExtraida = await extraerFotoInstagram(urlVideo);
        if (fotoExtraida) {
          fotoPrincipal = fotoExtraida;
          medios.length = 0;
          medios.push({
            tipo: "IMAGE",
            url: fotoExtraida,
          });
        }
      }

      if (medios.length === 0) {
        if (urlVideo) {
          medios.push({
            tipo: "VIDEO",
            url: urlVideo,
          });
        } else if (fotoPrincipal) {
          medios.push({
            tipo: "IMAGE",
            url: fotoPrincipal,
          });
        }
      }

      const nuevo = await eventos.crear({
        origen: "manual",
        titulo,
        resumen,
        descripcion,
        fechaEvento,
        fotoPrincipal,
        videoUrl: datos.videoUrl ? String(datos.videoUrl).trim() : null,
        medios,
        cantidadMedios: medios.length || 1,
        estado,
        categorias: Array.isArray(datos.categorias) && datos.categorias.length ? datos.categorias : ["eventos"],
      });

      res.status(201).json({ evento: nuevo });
    } catch (e) {
      next(e);
    }
  });

  // ==============================================================
  // Rutas públicas (Galería del sitio web: Eventos.jsx)
  // ==============================================================

  // GET /api/events: Público. Devuelve únicamente los eventos con estado 'visible'.
  router.get("/", async (req, res, next) => {
    try {
      const lista = await eventos.listar({
        estado: "visible",
        origen: req.query.origen,
      });

      res.json({ eventos: lista });
    } catch (e) {
      next(e);
    }
  });

  // GET /api/events/:id: Público. Detalle de evento solo si su estado es 'visible'.
  router.get("/:id", async (req, res, next) => {
    try {
      const evento = await eventos.buscarPorId(req.params.id);
      if (!evento || evento.estado !== "visible") {
        return res.status(404).json({ error: "Evento no encontrado." });
      }
      res.json({ evento });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
