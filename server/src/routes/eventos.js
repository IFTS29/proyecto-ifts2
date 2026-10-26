import { Router } from "express";
import { autenticar, requiereRol } from "../middleware/auth.js";
import { guardarMedio } from "../services/media/index.js";
import {
  ErrorDeFotos,
  borrarFotosSubidas,
  esEnlaceValido,
  esFotoNueva,
  revisarFotoNueva,
  subirFotosNuevas,
} from "../services/media/fotosEventos.js";

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

// "fotos" guarda las fotos nuevas de los eventos (Cloudinary, o el disco en desarrollo local).
// Si es null, no hay dónde guardarlas y el alta con fotos nuevas responde 503.
export function crearRutasEventos({ config, usuarios, eventos, fotos = null }) {
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
    // Fotos subidas a Cloudinary en este alta. Si algo falla antes de guardar el evento, se intenta borrarlas.
    let subidas = [];
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
      const medios = Array.isArray(datos.medios) ? datos.medios.map((m) => ({ ...m })) : [];

      // Las fotos que ya existen se guardan tal cual, pero tienen que ser enlaces válidos.
      const enlaces = [...medios.map((m) => m.url), fotoPrincipal].filter((url) => !esFotoNueva(url));
      if (enlaces.some((url) => !esEnlaceValido(url))) {
        return res.status(400).json({ error: "Una de las fotos tiene un enlace que no es válido." });
      }

      // Fotos nuevas subidas desde la computadora (data:image/...): se revisan todas antes de subir nada.
      const nuevas = [...new Set([...medios.map((m) => m.url), fotoPrincipal].filter(esFotoNueva))];
      for (const [indice, dataUrl] of nuevas.entries()) {
        const error = revisarFotoNueva(dataUrl, indice + 1);
        if (error) return res.status(400).json({ error });
      }
      if (nuevas.length > 0 && !fotos) {
        return res.status(503).json({ error: "Falta configurar el almacenamiento de fotos. No se guardó el evento." });
      }

      // Se suben a Cloudinary y en el evento quedan solo sus enlaces.
      if (nuevas.length > 0) {
        try {
          subidas = await subirFotosNuevas(fotos, nuevas, titulo);
        } catch (err) {
          if (err instanceof ErrorDeFotos) return res.status(err.estado).json({ error: err.message });
          throw err;
        }
        const subidaDe = new Map(subidas.map((s) => [s.dataUrl, s]));
        for (const medio of medios) {
          const subida = subidaDe.get(medio.url);
          if (subida) Object.assign(medio, { url: subida.url, publicId: subida.publicId });
        }
        if (subidaDe.has(fotoPrincipal)) fotoPrincipal = subidaDe.get(fotoPrincipal).url;
      }

      // Sin portada indicada, la portada es la primera foto (el formulario no la repite, así no la manda dos veces).
      if (!String(datos.fotoPrincipal || "").trim()) {
        const primeraFoto = medios.find((m) => m.tipo === "IMAGE" && m.url);
        if (primeraFoto) fotoPrincipal = primeraFoto.url;
      }

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

      let nuevo;
      try {
        nuevo = await eventos.crear({
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
      } catch (err) {
        // Las fotos se subieron, pero el evento no se guardó: se intenta borrar solo las fotos nuevas de este alta.
        console.error(`[eventos] No se pudo guardar el evento: ${err.message}`);
        await borrarFotosSubidas(fotos, subidas);
        return res.status(500).json({ error: "No se pudo guardar el evento. Probá de nuevo en unos minutos." });
      }
      subidas = []; // ya son fotos del evento guardado: no se borran aunque algo falle después

      res.status(201).json({ evento: nuevo });
    } catch (e) {
      // Error inesperado entre la subida y el guardado: también se intenta borrar las fotos nuevas.
      await borrarFotosSubidas(fotos, subidas);
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
