import { Router } from "express";
import { autenticar, requiereRol } from "../middleware/auth.js";
import {
  SECCIONES,
  copiaParaElHistorial,
  ordenarHistorial,
  pasaAlHistorial,
  preguntasGuardadasAntes,
  seccionPublica,
  validarSeccion,
} from "../services/contenido.js";

// Contenido institucional (#36): lo lee el sitio público y lo edita Administración desde el panel.
export function crearRutasContenido({ config, usuarios, contenido, convocatoriasAnteriores }) {
  const router = Router();

  // Público: todas las secciones. Sin caché, para que un cambio guardado se vea enseguida.
  router.get("/", async (req, res, next) => {
    try {
      const guardadas = new Map((await contenido.listar()).map((r) => [r.clave, r]));
      // Las preguntas guardadas antes dentro de «ingreso» siguen valiendo hasta que se guarde la sección nueva.
      const anteriores = preguntasGuardadasAntes(guardadas);
      if (anteriores) guardadas.set("ingresoPreguntas", anteriores);
      const respuesta = Object.fromEntries(
        SECCIONES.map((clave) => [clave, seccionPublica(clave, guardadas.get(clave))]),
      );
      res.set("Cache-Control", "no-store").json(respuesta);
    } catch (e) {
      next(e);
    }
  });

  // Panel: historial de convocatorias de ingreso, solo de consulta, de la más reciente a la más antigua.
  // Solo Administración (es quien edita Ingreso).
  // Nunca incluye la convocatoria vigente: si la copia al historial se guardó pero después falló guardar la
  // convocatoria nueva, la vigente sigue siendo la anterior y no aparece repetida como «anterior». Cuando se la
  // reemplace de verdad, su copia se actualiza con la última versión.
  router.get("/ingreso/historial", autenticar({ config, usuarios }), requiereRol("admin"), async (req, res, next) => {
    try {
      const [historial, guardadas] = await Promise.all([convocatoriasAnteriores.listar(), contenido.listar()]);
      const vigente = guardadas.find((r) => r.clave === "ingreso")?.datos?.convocatoria || null;
      const anteriores = historial.filter((c) => c.convocatoria !== vigente);
      res.json({ convocatorias: ordenarHistorial(anteriores) });
    } catch (e) {
      next(e);
    }
  });

  // Panel: reemplaza una sección completa. Solo Administración (Bedelía recibe 403).
  // Quién guardó sale de la sesión, nunca de lo que manda el navegador.
  router.put("/:clave", autenticar({ config, usuarios }), requiereRol("admin"), async (req, res, next) => {
    try {
      const { clave } = req.params;
      if (!SECCIONES.includes(clave)) return res.status(404).json({ error: "La sección no existe." });
      const { datos, error } = validarSeccion(clave, req.body?.datos);
      if (error) return res.status(400).json({ error });
      // Al guardar la convocatoria por primera vez con este formato, las preguntas que estaban adentro pasan
      // antes a su propia sección. Si esa escritura falla, no se guarda nada y la convocatoria queda como estaba.
      if (clave === "ingreso") {
        const guardadas = new Map((await contenido.listar()).map((r) => [r.clave, r]));
        const anteriores = preguntasGuardadasAntes(guardadas);
        if (anteriores) {
          await contenido.guardar("ingresoPreguntas", {
            datos: anteriores.datos,
            actualizadoPor: req.usuario.nombre,
          });
        }
        // La convocatoria que se reemplaza pasa al historial antes de guardar la nueva. Si esa copia falla, no se
        // guarda nada y la convocatoria queda como estaba.
        const convocatoriaGuardada = guardadas.get("ingreso")?.datos;
        if (pasaAlHistorial(convocatoriaGuardada, datos)) {
          await convocatoriasAnteriores.guardar(
            convocatoriaGuardada.convocatoria,
            copiaParaElHistorial(convocatoriaGuardada),
          );
        }
      }
      const guardada = await contenido.guardar(clave, { datos, actualizadoPor: req.usuario.nombre });
      res.json(seccionPublica(clave, guardada));
    } catch (e) {
      next(e);
    }
  });

  return router;
}
