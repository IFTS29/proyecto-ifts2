import { Router } from "express";
import { autenticar, requiereRol } from "../middleware/auth.js";
import { SECCIONES, seccionPublica, validarSeccion } from "../services/contenido.js";

// Contenido institucional (#36): lo lee el sitio público y lo edita Administración desde el panel.
export function crearRutasContenido({ config, usuarios, contenido }) {
  const router = Router();

  // Público: las tres secciones. Sin caché, para que un cambio guardado se vea enseguida.
  router.get("/", async (req, res, next) => {
    try {
      const guardadas = new Map((await contenido.listar()).map((r) => [r.clave, r]));
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
      const guardada = await contenido.guardar(clave, { datos, actualizadoPor: req.usuario.nombre });
      res.json(seccionPublica(clave, guardada));
    } catch (e) {
      next(e);
    }
  });

  return router;
}
