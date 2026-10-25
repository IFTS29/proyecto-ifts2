import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { textoPeriodo } from "../academica.js";
import HorariosPublicos from "./HorariosPublicos.jsx";

// Fecha en Argentina: "10 de marzo de 2027".
const textoFecha = (fechaIso) =>
  new Date(fechaIso).toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// Horarios de cursada de la página de Alumnos. Muestra solo lo publicado desde el panel,
// del período más reciente; si hay más de uno publicado, se puede elegir.
export default function HorariosDeCursada() {
  const [periodos, setPeriodos] = useState(null);
  const [elegido, setElegido] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/academic/vigente")
      .then(({ periodos: lista }) => {
        setPeriodos(lista);
        setElegido(lista[0]?.periodo ?? "");
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="aviso visible error">{error}</p>;
  if (!periodos) return <p>Cargando los horarios…</p>;

  const actual = periodos.find((p) => p.periodo === elegido);

  return (
    <div className="horarios-de-cursada">
      <h2>Horarios de cursada</h2>
      {!actual ? (
        <p>
          Todavía no hay horarios publicados. Ante cualquier duda, consultá en Bedelía desde{" "}
          <Link to="/contacto">Contacto</Link>.
        </p>
      ) : (
        <>
          <div className="vigente">
            <span className="etiqueta et-verde">Publicado</span>
            <strong>{textoPeriodo(actual)}</strong>
            <span style={{ color: "var(--suave)" }}>Actualizado el {textoFecha(actual.publicadoEn)}</span>
            {periodos.length > 1 && (
              <div className="campo campo-en-linea">
                <label htmlFor="al-periodo">Ver otro período</label>
                <select id="al-periodo" value={elegido} onChange={(e) => setElegido(e.target.value)}>
                  {periodos.map((p) => (
                    <option key={p.periodo} value={p.periodo}>
                      {textoPeriodo(p)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <HorariosPublicos
            key={actual.periodo}
            horarios={actual.horarios}
            accion={(turno) => (
              <div className="acciones">
                <a
                  className="boton boton-linea"
                  href={`/api/academic/vigente/horarios.pdf?periodo=${actual.periodo}${turno ? `&turno=${turno}` : ""}`}
                >
                  Descargar horarios (PDF)
                </a>
              </div>
            )}
          />
        </>
      )}
    </div>
  );
}