import { crearApp } from "../server/src/app.js";
import { leerConfig } from "../server/src/config.js";
import { prepararDatos } from "../server/src/arranque.js";

// Arma la función que recibe las peticiones en Vercel.
// Cada instancia prepara la app una sola vez. Si MongoDB no está disponible, responde 503
// y lo vuelve a intentar en la próxima petición, en lugar de seguir en memoria.
export function crearHandler({ preparar = prepararDatos } = {}) {
  let preparacion = null;

  const obtenerApp = () => {
    if (!preparacion) {
      preparacion = (async () => {
        const config = leerConfig();
        const { usuarios } = await preparar(config);
        return crearApp({ config, usuarios });
      })().catch((err) => {
        preparacion = null;
        throw err;
      });
    }
    return preparacion;
  };

  return async function handler(req, res) {
    // En Vercel, si la URL llega sin /api: se agrega para que coincida con las rutas de Express.
    if (req.url && !req.url.startsWith("/api")) {
      req.url = `/api${req.url}`;
    }

    let app;
    try {
      app = await obtenerApp();
    } catch (err) {
      console.error(err.message);
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      const error = "El servicio no está disponible en este momento. Probá de nuevo en unos minutos.";
      res.end(JSON.stringify({ error }));
      return;
    }
    return app(req, res);
  };
}

export default crearHandler();