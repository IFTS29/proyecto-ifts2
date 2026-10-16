import { Router } from "express";
import jwt from "jsonwebtoken";
import { comparar, HASH_FALSO } from "../services/passwords.js";
import { autenticar } from "../middleware/auth.js";
import { claveDeLogin, MSJ_BLOQUEO } from "../services/limitador.js";

export function crearRutasAuth({ config, usuarios, limitadorLogin }) {
  const router = Router();

  router.post("/login", limitadorLogin, async (req, res, next) => {
    try {
      const mail = String(req.body?.mail || "").trim().toLowerCase();
      const password = String(req.body?.password || "");
      const usuario = mail ? await usuarios.buscarPorMail(mail) : null;
      const coincide = await comparar(password, usuario ? usuario.passwordHash : HASH_FALSO);

      if (!usuario || !coincide) {
        // req.rateLimit lo completa el limitador: cuántos intentos fallidos quedan antes del bloqueo.
        const quedan = req.rateLimit.remaining;
        if (quedan <= 0) return res.status(429).json({ error: MSJ_BLOQUEO });
        const texto = quedan === 1 ? "queda 1 intento." : `quedan ${quedan} intentos.`;
        return res.status(401).json({ error: `Usuario o contraseña incorrectos. Te ${texto}` });
      }

      limitadorLogin.resetKey(claveDeLogin(req));
      const token = jwt.sign({ sub: usuario.id, rol: usuario.rol }, config.jwtSecret, {
        expiresIn: config.jwtDuracion,
      });
      res.json({
        token,
        usuario: { id: usuario.id, nombre: usuario.nombre, mail: usuario.mail, rol: usuario.rol },
      });
    } catch (e) {
      next(e);
    }
  });

  router.get("/yo", autenticar({ config, usuarios }), (req, res) => {
    res.json({ usuario: req.usuario });
  });

  return router;
}
