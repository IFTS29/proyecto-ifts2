import { Router } from "express";
import { autenticar, requiereRol } from "../middleware/auth.js";
import {
  NOMBRE_TURNO,
  TURNOS,
  claveDeHorario,
  codigoPeriodo,
  compararConPublicado,
  copiaParaPublicar,
  leerPeriodo,
  ordenarHorarios,
  textoPeriodo,
  validarHorario,
} from "../services/academica.js";
import { pdfHorarios, textoFecha } from "../services/academica.pdf.js";

// "Turno mañana" → "turno-manana", para el nombre del archivo.
const paraArchivo = (valor) =>
  valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function enviarPdf(res, contenido, nombre) {
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${nombre}.pdf"`,
  });
  res.send(contenido);
}

const PERIODO_INVALIDO = "Indicá el período, por ejemplo 2027-1.";

// Información académica: horarios de cursada.
// Cada período tiene dos niveles:
// - los datos de trabajo ("horarios"), que carga y corrige Bedelía desde el panel;
// - la copia publicada ("publicacionesHorarios"), que es lo único que ven los alumnos.
// Guardar cambia solo los datos de trabajo. Publicar o actualizar reemplaza la copia por lo último guardado.
export function crearRutasAcademica({ config, usuarios, horarios, publicacionesHorarios }) {
  const router = Router();
  // La dirección sale de la configuración del servidor, nunca de la petición (ver config.js).
  const urlContacto = `${config.sitioUrl}/contacto`;

  // Datos de trabajo, publicación y cambios pendientes de un período.
  async function estadoDelPeriodo(periodo) {
    const [trabajo, publicacion] = await Promise.all([
      horarios.listar({ cicloLectivo: periodo.cicloLectivo, cuatrimestre: periodo.cuatrimestre }),
      publicacionesHorarios.buscar(periodo),
    ]);
    const publicado = Boolean(publicacion?.publicado);
    // Los cambios solo importan si el período está publicado: si no, Publicar toma todo lo guardado.
    const cambios = publicado ? compararConPublicado(trabajo, publicacion.horarios) : [];
    return {
      periodo: codigoPeriodo(periodo),
      ...periodo,
      horarios: ordenarHorarios(trabajo),
      publicado,
      publicadoEn: publicacion?.publicadoEn ?? null,
      cambios,
    };
  }

  // ---------- Rutas públicas: solo lo publicado ----------

  // Los períodos publicados, del más reciente al más antiguo, con sus horarios.
  router.get("/vigente", async (req, res, next) => {
    try {
      const publicados = (await publicacionesHorarios.listar())
        .filter((p) => p.publicado)
        .sort((a, b) => b.cicloLectivo - a.cicloLectivo || b.cuatrimestre - a.cuatrimestre)
        .map((p) => ({
          periodo: codigoPeriodo(p),
          cicloLectivo: p.cicloLectivo,
          cuatrimestre: p.cuatrimestre,
          publicadoEn: p.publicadoEn,
          horarios: ordenarHorarios(p.horarios),
        }));
      res.json({ periodos: publicados });
    } catch (e) {
      next(e);
    }
  });

  // PDF de lo publicado: /vigente/horarios.pdf?periodo=2027-1
  // Con &turno=noche incluye solo ese turno, igual que el filtro de la página de Alumnos.
  router.get("/vigente/horarios.pdf", async (req, res, next) => {
    try {
      const periodo = leerPeriodo(req.query.periodo);
      if (!periodo) return res.status(400).json({ error: PERIODO_INVALIDO });
      const turno = req.query.turno ? String(req.query.turno) : "";
      if (turno && !TURNOS.includes(turno)) return res.status(400).json({ error: "El turno no es válido." });

      const publicacion = await publicacionesHorarios.buscar(periodo);
      const lista = publicacion?.publicado
        ? publicacion.horarios.filter((h) => !turno || h.turno === turno)
        : [];
      if (lista.length === 0) {
        const delTurno = turno ? ` del turno ${NOMBRE_TURNO[turno]}` : "";
        return res.status(404).json({ error: `No hay horarios publicados${delTurno} del ${textoPeriodo(periodo)}.` });
      }
      const pdf = await pdfHorarios({
        horarios: ordenarHorarios(lista),
        periodo,
        urlContacto,
        fecha: textoFecha(publicacion.publicadoEn),
      });
      const sufijoTurno = turno ? `-${paraArchivo(`turno ${NOMBRE_TURNO[turno]}`)}` : "";
      enviarPdf(res, pdf, `horarios-${periodo.cuatrimestre}-cuatrimestre-${periodo.cicloLectivo}${sufijoTurno}`);
    } catch (e) {
      next(e);
    }
  });

  // ---------- Rutas del panel: perfiles Administrador y Bedelía ----------

  router.use(autenticar({ config, usuarios }), requiereRol("admin", "bedelia"));

  // Para el selector de período: los que tienen datos de trabajo o una publicación,
  // del más reciente al más antiguo.
  router.get("/periodos", async (req, res, next) => {
    try {
      const [trabajo, publicaciones] = await Promise.all([horarios.listar(), publicacionesHorarios.listar()]);
      const codigos = new Set([...trabajo, ...publicaciones].map(codigoPeriodo));
      const periodos = [...codigos]
        .map(leerPeriodo)
        .sort((a, b) => b.cicloLectivo - a.cicloLectivo || b.cuatrimestre - a.cuatrimestre)
        .map((periodo) => {
          const delPeriodo = trabajo.filter((h) => codigoPeriodo(h) === codigoPeriodo(periodo));
          const publicacion = publicaciones.find((p) => codigoPeriodo(p) === codigoPeriodo(periodo));
          const publicado = Boolean(publicacion?.publicado);
          return {
            periodo: codigoPeriodo(periodo),
            ...periodo,
            materias: delPeriodo.length,
            publicado,
            hayCambios: publicado && compararConPublicado(delPeriodo, publicacion.horarios).length > 0,
          };
        });
      res.json({ periodos });
    } catch (e) {
      next(e);
    }
  });

  // Resumen y tabla de un período: datos de trabajo, estado de la publicación y lista de cambios sin publicar.
  router.get("/periodos/:periodo", async (req, res, next) => {
    try {
      const periodo = leerPeriodo(req.params.periodo);
      if (!periodo) return res.status(400).json({ error: PERIODO_INVALIDO });
      res.json(await estadoDelPeriodo(periodo));
    } catch (e) {
      next(e);
    }
  });

  // Agrega una materia a los datos de trabajo. No cambia lo publicado.
  router.post("/horarios", async (req, res, next) => {
    try {
      const { datos, error } = validarHorario(req.body);
      if (error) return res.status(400).json({ error });
      res.status(201).json({ horario: await horarios.crear({ ...datos, origenId: "" }) });
    } catch (e) {
      next(e);
    }
  });

  // Corrige una materia. El período y el origen no cambian: se toman del registro guardado.
  router.put("/horarios/:id", async (req, res, next) => {
    try {
      const actual = await horarios.buscarPorId(req.params.id);
      if (!actual) return res.status(404).json({ error: "El horario no existe." });

      const { cicloLectivo, cuatrimestre } = actual;
      const { datos, error } = validarHorario({ ...req.body, cicloLectivo, cuatrimestre });
      if (error) return res.status(400).json({ error });
      res.json({ horario: await horarios.actualizar(actual.id, datos) });
    } catch (e) {
      next(e);
    }
  });

  // La quita de los datos de trabajo (el panel pide confirmación antes).
  // Si estaba publicada, los alumnos la siguen viendo hasta que se actualice la publicación.
  router.delete("/horarios/:id", async (req, res, next) => {
    try {
      if (!(await horarios.eliminar(req.params.id))) return res.status(404).json({ error: "El horario no existe." });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });

  // Trae las materias de otro período a los datos de trabajo de este. No publica nada.
  // No duplica: saltea las que ya se trajeron antes (por origenId, aunque se les haya cambiado el nombre)
  // y las cargadas a mano con los mismos datos (ver claveDeHorario).
  // Si se corta a mitad de camino, repetirla completa lo que falta.
  router.post("/periodos/:periodo/reutilizar", async (req, res, next) => {
    try {
      const destino = leerPeriodo(req.params.periodo);
      const origen = leerPeriodo(req.body?.origen);
      if (!destino || !origen) return res.status(400).json({ error: "Elegí el período del que querés reutilizar." });
      if (codigoPeriodo(origen) === codigoPeriodo(destino)) {
        return res.status(400).json({ error: "Elegí un período distinto del actual." });
      }

      const aTraer = await horarios.listar(origen);
      if (aTraer.length === 0) {
        return res.status(404).json({ error: `El ${textoPeriodo(origen)} no tiene horarios cargados.` });
      }

      const yaEstan = await horarios.listar(destino);
      const origenes = new Set(yaEstan.map((h) => h.origenId).filter(Boolean));
      const claves = new Set(yaEstan.map(claveDeHorario));
      let agregadas = 0;
      for (const { id, actualizadoEn, origenId, ...datos } of aTraer) {
        if (origenes.has(id) || claves.has(claveDeHorario(datos))) continue;
        await horarios.crear({ ...datos, ...destino, origenId: id });
        agregadas++;
      }
      res.status(agregadas ? 201 : 200).json({ agregadas, yaEstaban: aTraer.length - agregadas });
    } catch (e) {
      next(e);
    }
  });

  // Publica el período o actualiza la publicación (es la misma operación): copia lo último guardado.
  router.post("/periodos/:periodo/publicar", async (req, res, next) => {
    try {
      const periodo = leerPeriodo(req.params.periodo);
      if (!periodo) return res.status(400).json({ error: PERIODO_INVALIDO });

      const trabajo = await horarios.listar(periodo);
      if (trabajo.length === 0) {
        return res.status(400).json({ error: `El ${textoPeriodo(periodo)} no tiene horarios cargados para publicar.` });
      }
      await publicacionesHorarios.guardar(periodo, {
        publicado: true,
        publicadoEn: new Date(),
        horarios: trabajo.map(copiaParaPublicar),
      });
      res.json(await estadoDelPeriodo(periodo));
    } catch (e) {
      next(e);
    }
  });

  // Retira la publicación: los alumnos dejan de verlo. No borra los datos de trabajo ni la copia.
  router.post("/periodos/:periodo/retirar", async (req, res, next) => {
    try {
      const periodo = leerPeriodo(req.params.periodo);
      if (!periodo) return res.status(400).json({ error: PERIODO_INVALIDO });

      if (!(await publicacionesHorarios.retirar(periodo))) {
        return res.status(409).json({ error: `El ${textoPeriodo(periodo)} no está publicado.` });
      }
      res.json(await estadoDelPeriodo(periodo));
    } catch (e) {
      next(e);
    }
  });

  // PDF de los datos de trabajo, con la marca "Vista previa — Versión de trabajo".
  // Exige sesión: el panel lo baja con el token y lo ofrece como descarga.
  router.get("/periodos/:periodo/vista-previa.pdf", async (req, res, next) => {
    try {
      const periodo = leerPeriodo(req.params.periodo);
      if (!periodo) return res.status(400).json({ error: PERIODO_INVALIDO });

      const trabajo = await horarios.listar(periodo);
      if (trabajo.length === 0) {
        return res.status(404).json({ error: `El ${textoPeriodo(periodo)} no tiene horarios cargados.` });
      }
      const pdf = await pdfHorarios({ horarios: ordenarHorarios(trabajo), periodo, urlContacto, vistaPrevia: true });
      enviarPdf(res, pdf, `vista-previa-horarios-${periodo.cuatrimestre}-cuatrimestre-${periodo.cicloLectivo}`);
    } catch (e) {
      next(e);
    }
  });

  return router;
}