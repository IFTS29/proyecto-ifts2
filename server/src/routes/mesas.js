import { Router } from "express";
import { autenticar, requiereRol } from "../middleware/auth.js";
import {
  compararLlamado,
  copiaParaPublicar,
  llamadosPublicados,
  ordenarMesas,
  validarLlamado,
  validarMesa,
} from "../services/mesas.js";
import { pdfMesas, textoFecha } from "../services/academica.pdf.js";
import { enviarPdf, paraArchivo } from "./pdf.js";

const NO_EXISTE = "El llamado no existe.";

// El índice único de MongoDB (nombreClave) frena un nombre repetido que llegó al mismo tiempo que otro:
// es un conflicto de datos (409), no un error interno.
const esNombreDuplicado = (error) => error?.code === 11000;
const NOMBRE_DUPLICADO = "Ya existe un llamado con ese nombre.";

// Información académica: mesas de examen, organizadas por llamado.
// Cada llamado tiene dos niveles, como los horarios:
// - los datos de trabajo (el llamado y sus "mesas"), que carga y corrige Bedelía;
// - la copia publicada (llamado.publicacion), que es lo único que ven los alumnos.
// Guardar cambia solo los datos de trabajo. Publicar o actualizar reemplaza la copia por lo último guardado.
// Se monta antes que las rutas de horarios: por eso cada ruta del panel pide la sesión por su cuenta,
// en lugar de un router.use que también alcanzaría a las rutas públicas de horarios.
export function crearRutasMesas({ config, usuarios, llamados, mesas }) {
  const router = Router();
  const urlContacto = `${config.sitioUrl}/contacto`;
  const panel = [autenticar({ config, usuarios }), requiereRol("admin", "bedelia")];

  // Datos de trabajo, publicación y cambios pendientes de un llamado.
  async function estadoDelLlamado(llamado) {
    const deTrabajo = await mesas.listar({ llamadoId: llamado.id });
    const { publicacion } = llamado;
    const publicado = Boolean(publicacion?.publicado);
    return {
      id: llamado.id,
      nombre: llamado.nombre,
      desde: llamado.desde,
      hasta: llamado.hasta,
      aviso: llamado.aviso,
      mesas: ordenarMesas(deTrabajo),
      publicado,
      publicadoEn: publicacion ? new Date(publicacion.publicadoEn).toISOString() : null,
      // Si existe la copia, se publicó alguna vez: aunque se haya retirado, ya no se puede eliminar.
      sePublico: Boolean(publicacion),
      // Los cambios solo importan si está publicado: si no, Publicar toma todo lo guardado.
      cambios: publicado ? compararLlamado(llamado, deTrabajo, publicacion) : [],
    };
  }

  // Devuelve un mensaje de error si ya hay otro llamado con el mismo nombre (sin contar mayúsculas ni espacios).
  async function nombreRepetido(nombreClave, idPropio) {
    const todos = await llamados.listar();
    const otro = todos.find((l) => l.nombreClave === nombreClave && l.id !== idPropio);
    return otro ? `Ya existe un llamado con el nombre "${otro.nombre}".` : "";
  }

  // ---------- Ruta pública ----------

  // PDF de un llamado publicado: /vigente/mesas.pdf?llamado=<id>. Sale de la copia publicada.
  // Un llamado publicado sin mesas (un anuncio) también tiene PDF, con sus fechas y el aviso.
  router.get("/vigente/mesas.pdf", async (req, res, next) => {
    try {
      if (!req.query.llamado) return res.status(400).json({ error: "Falta indicar el llamado." });
      const llamado = await llamados.buscarPorId(String(req.query.llamado));
      const [publicado] = llamado ? llamadosPublicados([llamado]) : [];
      if (!publicado) return res.status(404).json({ error: "El llamado no está publicado." });

      const pdf = await pdfMesas({
        llamado: publicado,
        mesas: publicado.mesas,
        urlContacto,
        fecha: textoFecha(publicado.publicadoEn),
      });
      enviarPdf(res, pdf, `mesas-${paraArchivo(publicado.nombre)}`);
    } catch (e) {
      next(e);
    }
  });

  // ---------- Rutas del panel: perfiles Administrador y Bedelía ----------

  // Para el selector: todos los llamados, del más reciente al más antiguo (por fecha de inicio y nombre).
  router.get("/llamados", ...panel, async (req, res, next) => {
    try {
      const [todos, todasLasMesas] = await Promise.all([llamados.listar(), mesas.listar()]);
      const lista = todos
        .sort((a, b) => (b.desde || "").localeCompare(a.desde || "") || a.nombre.localeCompare(b.nombre, "es"))
        .map((l) => {
          const delLlamado = todasLasMesas.filter((m) => m.llamadoId === l.id);
          const publicado = Boolean(l.publicacion?.publicado);
          return {
            id: l.id,
            nombre: l.nombre,
            desde: l.desde,
            hasta: l.hasta,
            mesas: delLlamado.length,
            publicado,
            sePublico: Boolean(l.publicacion),
            hayCambios: publicado && compararLlamado(l, delLlamado, l.publicacion).length > 0,
          };
        });
      res.json({ llamados: lista });
    } catch (e) {
      next(e);
    }
  });

  router.post("/llamados", ...panel, async (req, res, next) => {
    try {
      const { datos, error } = validarLlamado(req.body);
      if (error) return res.status(400).json({ error });
      const repetido = await nombreRepetido(datos.nombreClave);
      if (repetido) return res.status(409).json({ error: repetido });
      const llamado = await llamados.crear({ ...datos, publicacion: null });
      res.status(201).json({ llamado: await estadoDelLlamado(llamado) });
    } catch (e) {
      if (esNombreDuplicado(e)) return res.status(409).json({ error: NOMBRE_DUPLICADO });
      next(e);
    }
  });

  router.get("/llamados/:id", ...panel, async (req, res, next) => {
    try {
      const llamado = await llamados.buscarPorId(req.params.id);
      if (!llamado) return res.status(404).json({ error: NO_EXISTE });
      res.json({ llamado: await estadoDelLlamado(llamado) });
    } catch (e) {
      next(e);
    }
  });

  // Corrige el nombre, las fechas generales o el aviso. No cambia lo publicado.
  router.put("/llamados/:id", ...panel, async (req, res, next) => {
    try {
      const actual = await llamados.buscarPorId(req.params.id);
      if (!actual) return res.status(404).json({ error: NO_EXISTE });
      const { datos, error } = validarLlamado(req.body);
      if (error) return res.status(400).json({ error });
      const repetido = await nombreRepetido(datos.nombreClave, actual.id);
      if (repetido) return res.status(409).json({ error: repetido });
      res.json({ llamado: await estadoDelLlamado(await llamados.actualizar(actual.id, datos)) });
    } catch (e) {
      if (esNombreDuplicado(e)) return res.status(409).json({ error: NOMBRE_DUPLICADO });
      next(e);
    }
  });

  // Solo se elimina un llamado que nunca se publicó (por ejemplo, uno creado por error), junto con sus mesas.
  // Uno publicado se conserva aunque se haya retirado: los alumnos pudieron haberlo consultado.
  router.delete("/llamados/:id", ...panel, async (req, res, next) => {
    try {
      const llamado = await llamados.buscarPorId(req.params.id);
      if (!llamado) return res.status(404).json({ error: NO_EXISTE });
      if (llamado.publicacion) {
        return res.status(409).json({ error: "Este llamado ya se publicó: se conserva aunque se haya retirado." });
      }
      // Primero las mesas y al final el llamado: si algo falla en el medio, el llamado sigue en el panel
      // y se puede volver a eliminar. Nunca quedan mesas sin su llamado.
      for (const mesa of await mesas.listar({ llamadoId: llamado.id })) await mesas.eliminar(mesa.id);
      await llamados.eliminar(llamado.id);
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

  // Agrega una mesa a los datos de trabajo del llamado. No cambia lo publicado.
  router.post("/llamados/:id/mesas", ...panel, async (req, res, next) => {
    try {
      const llamado = await llamados.buscarPorId(req.params.id);
      if (!llamado) return res.status(404).json({ error: NO_EXISTE });
      const { datos, error } = validarMesa(req.body);
      if (error) return res.status(400).json({ error });
      res.status(201).json({ mesa: await mesas.crear({ ...datos, llamadoId: llamado.id }) });
    } catch (e) {
      next(e);
    }
  });

  // Corrige una mesa. El llamado no cambia: se toma del registro guardado.
  router.put("/mesas/:id", ...panel, async (req, res, next) => {
    try {
      const actual = await mesas.buscarPorId(req.params.id);
      if (!actual) return res.status(404).json({ error: "La mesa no existe." });
      const { datos, error } = validarMesa(req.body);
      if (error) return res.status(400).json({ error });
      res.json({ mesa: await mesas.actualizar(actual.id, datos) });
    } catch (e) {
      next(e);
    }
  });

  // La quita de los datos de trabajo (el panel pide confirmación antes).
  // Si estaba publicada, los alumnos la siguen viendo hasta que se actualice la publicación.
  router.delete("/mesas/:id", ...panel, async (req, res, next) => {
    try {
      if (!(await mesas.eliminar(req.params.id))) return res.status(404).json({ error: "La mesa no existe." });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

  // Publica el llamado o actualiza la publicación (es la misma operación): copia lo último guardado,
  // en una sola escritura. Se puede publicar sin mesas, como anuncio.
  router.post("/llamados/:id/publicar", ...panel, async (req, res, next) => {
    try {
      const llamado = await llamados.buscarPorId(req.params.id);
      if (!llamado) return res.status(404).json({ error: NO_EXISTE });
      const deTrabajo = await mesas.listar({ llamadoId: llamado.id });
      const actualizado = await llamados.actualizar(llamado.id, {
        publicacion: copiaParaPublicar(llamado, ordenarMesas(deTrabajo)),
      });
      res.json({ llamado: await estadoDelLlamado(actualizado) });
    } catch (e) {
      next(e);
    }
  });

  // Retira la publicación: los alumnos dejan de verlo. Conserva los datos de trabajo y la copia.
  router.post("/llamados/:id/retirar", ...panel, async (req, res, next) => {
    try {
      const llamado = await llamados.buscarPorId(req.params.id);
      if (!llamado) return res.status(404).json({ error: NO_EXISTE });
      if (!llamado.publicacion?.publicado) {
        return res.status(409).json({ error: `El llamado ${llamado.nombre} no está publicado.` });
      }
      const actualizado = await llamados.actualizar(llamado.id, {
        publicacion: { ...llamado.publicacion, publicado: false },
      });
      res.json({ llamado: await estadoDelLlamado(actualizado) });
    } catch (e) {
      next(e);
    }
  });

  // PDF de los datos de trabajo, con la marca "Vista previa — Versión de trabajo".
  // Exige sesión: el panel lo baja con el token y lo ofrece como descarga.
  router.get("/llamados/:id/vista-previa.pdf", ...panel, async (req, res, next) => {
    try {
      const llamado = await llamados.buscarPorId(req.params.id);
      if (!llamado) return res.status(404).json({ error: NO_EXISTE });
      const deTrabajo = ordenarMesas(await mesas.listar({ llamadoId: llamado.id }));
      const pdf = await pdfMesas({ llamado, mesas: deTrabajo, urlContacto, vistaPrevia: true });
      enviarPdf(res, pdf, `vista-previa-mesas-${paraArchivo(llamado.nombre)}`);
    } catch (e) {
      next(e);
    }
  });

  return router;
}
