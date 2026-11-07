import { Router } from "express";
import { autenticar, requiereRol } from "../middleware/auth.js";
import { diaEnArgentina, eventoArchivado, eventoEnElSitio } from "../services/archivo.js";
import {
  ErrorDeFotos,
  borrarFotosSubidas,
  esEnlaceValido,
  esFotoNueva,
  revisarFotoNueva,
  subirFotosNuevas,
} from "../services/media/fotosEventos.js";
import { MAXIMO_DE_FOTOS, armarGaleria, contarFotos, revisarListaDeFotos } from "../services/media/galeriaEvento.js";
import { MENSAJE_ENLACE_INVALIDO, direccionDeInstagram } from "../services/instagram/enlace.js";

const ESTADOS_VALIDOS = ["visible", "oculto", "archivado"];
// Desde el panel solo se muestra u oculta un evento. El archivado por fecha se calcula (services/archivo.js, #35);
// el estado "archivado" queda solo por compatibilidad con datos anteriores.
const ESTADOS_DE_VISIBILIDAD = ["visible", "oculto"];

// El sitio público no recibe el registro de fotos quitadas: puede haber fotos que se sacaron a propósito.
const paraElSitio = ({ mediosQuitados, visibleSiempre, ...evento }) => evento;

// Revisa los textos y la fecha de un evento; los usan el alta y la edición.
// Devuelve { valores } con los datos limpios o { error } con el mensaje para el panel.
// En la edición, "anterior" es el evento guardado: si no llegan la fecha o el resumen, se conservan.
function revisarDatosBasicos(datos, anterior = {}) {
  const titulo = String(datos.titulo || "").trim();
  const descripcion = String(datos.descripcion || "").trim();
  const resumen = datos.resumen === undefined ? anterior.resumen || "" : String(datos.resumen).trim();

  if (!titulo) return { error: "El título del evento es obligatorio." };
  if (!descripcion) return { error: "La descripción del evento es obligatoria." };

  let fechaEvento = anterior.fechaEvento ?? new Date();
  if (datos.fechaEvento) {
    fechaEvento = new Date(datos.fechaEvento);
    if (isNaN(fechaEvento.getTime())) return { error: "La fecha del evento no es válida." };
  }
  return { valores: { titulo, descripcion, resumen, fechaEvento } };
}

// Aviso del alta con enlace cuando no se pudo obtener la foto de la publicación: el evento se guarda igual.
export const AVISO_SIN_FOTO_DE_INSTAGRAM =
  "El evento se guardó, pero no se pudo obtener la imagen. Se intentará mostrar la publicación de Instagram.";

const esReemplazo = (url) => !url || String(url).includes("placeholder");

// "fotos" guarda las fotos nuevas de los eventos (Cloudinary, o el disco en desarrollo local).
// Si es null, no hay dónde guardarlas y el alta con fotos nuevas responde 503.
// "buscarFoto" obtiene la foto de una publicación de Instagram (services/instagram/fotoDePublicacion.js).
// Si es null, el alta con enlace guarda la publicación incrustada sin intentar obtener la foto.
export function crearRutasEventos({
  config,
  usuarios,
  eventos,
  fotos = null,
  buscarFoto = null,
  hoy = () => diaEnArgentina(),
}) {
  const router = Router();
  // El panel recibe si cada evento está archivado por fecha (#35): se calcula, no se guarda.
  const conArchivo = (evento, dia = hoy()) => ({ ...evento, archivado: eventoArchivado(evento, dia) });
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

      const dia = hoy();
      // "enElSitio": los que hoy ve un visitante (visibles y no archivados por fecha). Lo usa el inicio del panel.
      const enElSitio = (await eventos.listar({})).filter((e) => eventoEnElSitio(e, dia)).length;
      res.json({
        eventos: lista.map((e) => conArchivo(e, dia)),
        conteos: conteos ? { ...conteos, enElSitio } : { enElSitio },
      });
    } catch (e) {
      next(e);
    }
  });

  // GET /api/events/admin/:id: un evento en cualquier estado, para editarlo (solo administradores).
  router.get("/admin/:id", ...soloAdmin, async (req, res, next) => {
    try {
      const evento = await eventos.buscarPorId(req.params.id);
      if (!evento) return res.status(404).json({ error: "El evento no existe." });
      res.json({ evento: conArchivo(evento) });
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
      const { valores, error } = revisarDatosBasicos(datos);
      if (error) return res.status(400).json({ error });
      const { titulo, descripcion, resumen, fechaEvento } = valores;

      // El enlace de Instagram se revisa antes que nada, así un enlace inválido no sube ninguna foto.
      const textoDelEnlace = datos.videoUrl == null ? "" : String(datos.videoUrl).trim();
      const enlaceDeInstagram = textoDelEnlace ? direccionDeInstagram(textoDelEnlace) : null;
      if (textoDelEnlace && !enlaceDeInstagram) return res.status(400).json({ error: MENSAJE_ENLACE_INVALIDO });
      // Una publicación de Instagram genera un solo evento, cargado a mano o por la sincronización.
      const repetido = enlaceDeInstagram ? await eventos.buscarPorEnlaceDeInstagram(enlaceDeInstagram) : null;
      if (repetido) {
        return res.status(409).json({
          error: `Ya existe un evento con esta publicación de Instagram: «${repetido.titulo}». Se puede editar desde la lista de eventos.`,
        });
      }

      let fotoPrincipal = String(datos.fotoPrincipal || "").trim() || "/media/instagram/placeholder.svg";

      const estado = ESTADOS_VALIDOS.includes(datos.estado) ? datos.estado : "visible";
      // La publicación de Instagram no es un medio del evento: se vuelve a agregar más abajo, con el enlace revisado.
      const medios = (Array.isArray(datos.medios) ? datos.medios : [])
        .filter((m) => !(m?.url && (m.url === textoDelEnlace || direccionDeInstagram(m.url))))
        .map((m) => ({ ...m }));

      // Las fotos que ya existen se guardan tal cual, pero tienen que ser enlaces válidos.
      const enlaces = [...medios.map((m) => m.url), fotoPrincipal].filter((url) => !esFotoNueva(url));
      if (enlaces.some((url) => !esEnlaceValido(url))) {
        return res.status(400).json({ error: "Una de las fotos tiene un enlace que no es válido." });
      }

      if (contarFotos(medios) > MAXIMO_DE_FOTOS) {
        return res.status(400).json({ error: `Un evento puede tener hasta ${MAXIMO_DE_FOTOS} fotos.` });
      }

      // Alta con enlace y sin fotos: se intenta obtener la foto de la publicación. Si se obtiene, sigue el
      // mismo camino que una foto cargada desde la computadora. Sin almacenamiento de fotos no se intenta.
      let aviso = null;
      const sinFotos = esReemplazo(fotoPrincipal) && !medios.some((m) => m.tipo === "IMAGE" && !esReemplazo(m.url));
      if (enlaceDeInstagram && sinFotos) {
        const fotoObtenida = fotos && buscarFoto ? await buscarFoto(enlaceDeInstagram) : null;
        if (fotoObtenida) medios.push({ tipo: "IMAGE", url: fotoObtenida });
        else aviso = AVISO_SIN_FOTO_DE_INSTAGRAM;
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
      if (esReemplazo(fotoPrincipal)) {
        const primeraFoto = medios.find((m) => m.tipo === "IMAGE" && m.url);
        if (primeraFoto) fotoPrincipal = primeraFoto.url;
      }

      if (medios.length === 0) {
        if (enlaceDeInstagram) {
          medios.push({
            tipo: "VIDEO",
            url: enlaceDeInstagram,
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
          videoUrl: enlaceDeInstagram,
          medios,
          cantidadMedios: medios.length || 1,
          // El tipo sale de las fotos guardadas, no del formulario. Desde el panel no se cargan videos:
          // la publicación de Instagram se muestra incrustada y no es un video propio del evento.
          tipoMedio: contarFotos(medios) > 1 ? "CAROUSEL_ALBUM" : "IMAGE",
          estado,
          categorias: Array.isArray(datos.categorias) && datos.categorias.length ? datos.categorias : ["eventos"],
        });
      } catch (err) {
        // Las fotos se subieron, pero el evento no se guardó: se intenta borrar solo las fotos nuevas de este alta.
        console.error(`[eventos] No se pudo guardar el evento: ${err.message}`);
        await borrarFotosSubidas(fotos, subidas);
        return res.status(500).json({ error: "No se pudo guardar el evento. Volver a intentarlo en unos minutos." });
      }
      subidas = []; // ya son fotos del evento guardado: no se borran aunque algo falle después

      res.status(201).json(aviso ? { evento: nuevo, aviso } : { evento: nuevo });
    } catch (e) {
      // Error inesperado entre la subida y el guardado: también se intenta borrar las fotos nuevas.
      await borrarFotosSubidas(fotos, subidas);
      next(e);
    }
  });

  // PUT /api/events/:id: corrige los textos, la fecha y las fotos de un evento (solo administradores).
  // "fotos" es opcional: si no llega, las fotos no se tocan. Si llega, es la lista final en orden, con los
  // enlaces de las fotos que se conservan y las fotos nuevas. El origen y el estado no se cambian acá.
  router.put("/:id", ...soloAdmin, async (req, res, next) => {
    // Fotos nuevas subidas en esta edición: si el evento no se llega a guardar, se intenta borrarlas.
    let subidas = [];
    try {
      const datos = req.body || {};
      const actual = await eventos.buscarPorId(req.params.id);
      if (!actual) return res.status(404).json({ error: "El evento no existe." });

      const { valores, error } = revisarDatosBasicos(datos, actual);
      if (error) return res.status(400).json({ error });
      const cambios = { ...valores };

      if (datos.fotos !== undefined) {
        const lista = revisarListaDeFotos(actual, datos.fotos);
        if (lista.error) return res.status(400).json({ error: lista.error });
        for (const [indice, dataUrl] of lista.nuevas.entries()) {
          const errorFoto = revisarFotoNueva(dataUrl, indice + 1);
          if (errorFoto) return res.status(400).json({ error: errorFoto });
        }
        if (lista.nuevas.length > 0 && !fotos) {
          return res.status(503).json({ error: "Falta configurar el almacenamiento de fotos. No se guardaron los cambios." });
        }

        if (lista.nuevas.length > 0) {
          try {
            subidas = await subirFotosNuevas(fotos, lista.nuevas, valores.titulo);
          } catch (err) {
            if (err instanceof ErrorDeFotos) return res.status(err.estado).json({ error: err.message });
            throw err;
          }
        }
        const subidaDe = new Map(subidas.map((s) => [s.dataUrl, s]));
        const fotosFinales = lista.pedidas.map((pedida) =>
          pedida.nueva
            ? { tipo: "IMAGE", url: subidaDe.get(pedida.url).url, publicId: subidaDe.get(pedida.url).publicId }
            : pedida.medio,
        );
        Object.assign(cambios, armarGaleria(actual, fotosFinales));
      }

      // En un evento de Instagram queda registrado que ya no es igual a la publicación original.
      if (actual.origen === "instagram") cambios.editadoPorAdmin = true;

      let actualizado;
      try {
        actualizado = await eventos.actualizar(actual.id, cambios);
      } catch (err) {
        // Las fotos nuevas se subieron, pero el evento no se guardó: se intenta borrar solo esas fotos.
        console.error(`[eventos] No se pudo guardar la edición del evento ${actual.id}: ${err.message}`);
        await borrarFotosSubidas(fotos, subidas);
        return res.status(500).json({ error: "No se pudieron guardar los cambios. Volver a intentarlo en unos minutos." });
      }
      subidas = []; // ya son fotos del evento guardado
      res.json({ evento: actualizado });
    } catch (e) {
      await borrarFotosSubidas(fotos, subidas);
      next(e);
    }
  });

  // PATCH /api/events/:id/estado: muestra u oculta un evento en el sitio (solo administradores).
  // Ocultar no borra nada: el evento sigue en el panel y se puede volver a mostrar.
  router.patch("/:id/estado", ...soloAdmin, async (req, res, next) => {
    try {
      const { estado } = req.body || {};
      if (!ESTADOS_DE_VISIBILIDAD.includes(estado)) {
        return res.status(400).json({ error: "El estado tiene que ser «visible» u «oculto»." });
      }

      const actual = await eventos.buscarPorId(req.params.id);
      if (!actual) return res.status(404).json({ error: "El evento no existe." });
      if (actual.estado === "archivado") {
        return res.status(409).json({ error: "El evento está archivado: no se puede mostrar ni ocultar desde acá." });
      }

      res.json({ evento: await eventos.actualizar(actual.id, { estado }) });
    } catch (e) {
      next(e);
    }
  });

  // PATCH /api/events/:id/visible-siempre: un evento archivado por fecha vuelve a mostrarse en el sitio
  // (visibleSiempre: true) o vuelve al archivo (false). Solo administradores; el panel pide confirmación.
  // Un oculto no aparece por esta vía, salvo que el pedido diga expresamente { mostrar: true }: entonces se guardan
  // el estado visible y visibleSiempre en una sola actualización (sin quedar a medias si algo falla).
  router.patch("/:id/visible-siempre", ...soloAdmin, async (req, res, next) => {
    try {
      const { visibleSiempre, mostrar = false } = req.body || {};
      if (typeof visibleSiempre !== "boolean" || typeof mostrar !== "boolean") {
        return res.status(400).json({ error: "Falta indicar si el evento se muestra fuera de fecha." });
      }
      if (mostrar && !visibleSiempre) {
        return res.status(400).json({ error: "Para volver al archivo no se cambia el estado del evento." });
      }
      const actual = await eventos.buscarPorId(req.params.id);
      if (!actual) return res.status(404).json({ error: "El evento no existe." });
      if (actual.estado === "archivado") {
        return res.status(409).json({ error: "El evento está archivado con el estado anterior: no se puede cambiar desde acá." });
      }
      const cambios = mostrar ? { visibleSiempre, estado: "visible" } : { visibleSiempre };
      res.json({ evento: conArchivo(await eventos.actualizar(actual.id, cambios)) });
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

      // Lo archivado por fecha no se ve en el sitio (salvo que la administración lo haya elegido mostrar).
      const dia = hoy();
      res.json({ eventos: lista.filter((e) => eventoEnElSitio(e, dia)).map(paraElSitio) });
    } catch (e) {
      next(e);
    }
  });

  // GET /api/events/:id: Público. Detalle solo si está visible y no archivado por fecha (también con un enlace guardado).
  router.get("/:id", async (req, res, next) => {
    try {
      const evento = await eventos.buscarPorId(req.params.id);
      if (!evento || !eventoEnElSitio(evento, hoy())) {
        return res.status(404).json({ error: "Evento no encontrado." });
      }
      res.json({ evento: paraElSitio(evento) });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
