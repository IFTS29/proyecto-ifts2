import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { textoFechaHora } from "../academica.js";
import LlamadoPublico from "./LlamadoPublico.jsx";

// Mesas de examen de la página de Alumnos. Muestra solo los llamados publicados desde el panel (la copia
// publicada, nunca los datos de trabajo), del más reciente al más antiguo, cada uno con su PDF.
// Un llamado publicado sin mesas es un anuncio: se ve con sus fechas y el aviso, sin tabla.
export default function MesasDeExamen() {
  const [llamados, setLlamados] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/academic/vigente")
      .then(({ llamados: lista }) => setLlamados(lista ?? []))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <section className="mesas-de-examen" aria-labelledby="titulo-mesas-examen">
      <h2 id="titulo-mesas-examen">Mesas de examen</h2>
      {error && <p className="aviso visible error">{error}</p>}
      {!error && !llamados && <p>Cargando las mesas de examen…</p>}
      {llamados && llamados.length === 0 && (
        <p>
          Todavía no hay mesas de examen publicadas. Para consultas, escribir a Bedelía desde{" "}
          <Link to="/contacto">Contacto</Link>.
        </p>
      )}
      {llamados?.map((llamado) => (
        <LlamadoPublico
          key={llamado.id}
          llamado={llamado}
          accion={
            <div className="acciones">
              <a
                className="boton boton-linea"
                href={`/api/academic/vigente/mesas.pdf?llamado=${encodeURIComponent(llamado.id)}`}
                download
              >
                Descargar mesas de {llamado.nombre} (PDF)
              </a>
              <span className="actualizado">Actualizado el {textoFechaHora(llamado.publicadoEn)}</span>
            </div>
          }
        />
      ))}
    </section>
  );
}
