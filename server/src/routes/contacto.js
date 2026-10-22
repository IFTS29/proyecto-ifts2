import { Router } from "express";
import { validarConsulta } from "../services/contacto.js";

// Formulario de contacto público: valida la consulta y la envía por correo (no guarda nada en la base).
export function crearRutasContacto({ correo }) {
  const router = Router();

  router.post("/", async (req, res) => {
    // Honeypot: "sitioWeb" es un campo oculto que una persona no ve ni completa.
    // Si viene lleno es un robot: se responde como si estuviera todo bien, pero no se envía nada.
    if (req.body?.sitioWeb) {
      return res.json({ mensaje: "Tu consulta fue enviada." });
    }

    const { error, consulta } = validarConsulta(req.body);
    if (error) return res.status(400).json({ error });

    try {
      await correo.enviarConsulta(consulta);
      res.json({ mensaje: "Tu consulta fue enviada." });
    } catch (e) {
      console.error("Error al enviar la consulta:", e.message);
      res.status(502).json({
        error: "No pudimos enviar tu consulta. Probá de nuevo en unos minutos.",
      });
    }
  });

  return router;
}
