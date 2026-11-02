import { Router } from "express";
import { autenticar, requiereRol } from "../middleware/auth.js";
import { SECCIONES, preguntasGuardadasAntes, seccionPublica, validarSeccion } from "../services/contenido.js";

// Contenido institucional (#36): lo lee el sitio público y lo edita Administración desde el panel.
export function crearRutasContenido({ config, usuarios, contenido }) {
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
        const anteriores = preguntasGuardadasAntes(new Map((await contenido.listar()).map((r) => [r.clave, r])));
        if (anteriores) {
          await contenido.guardar("ingresoPreguntas", {
            datos: anteriores.datos,
            actualizadoPor: req.usuario.nombre,
          });
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
