import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

// Eventos visibles del sitio (Inicio y Eventos). "estado" es "cargando", "listo" o "error", para no mostrar
// «no hay eventos» cuando en realidad falló la conexión. "reintentar" vuelve a pedirlos.
export default function useEventos() {
  const [eventos, setEventos] = useState([]);
  const [estado, setEstado] = useState("cargando");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setEstado("cargando");
    api("/events")
      .then((datos) => {
        if (cancelado) return;
        setEventos(Array.isArray(datos?.eventos) ? datos.eventos : []);
        setEstado("listo");
      })
      .catch(() => {
        if (!cancelado) setEstado("error");
      });
    return () => {
      cancelado = true;
    };
  }, [intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);
  return { eventos, estado, reintentar };
}
