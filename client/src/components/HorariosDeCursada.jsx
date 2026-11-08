import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { textoFecha, textoPeriodo } from "../academica.js";
import HorariosPublicos from "./HorariosPublicos.jsx";

// Horarios de cursada de la página de Alumnos. Muestra solo lo publicado desde el panel,
// del período más reciente; si hay más de uno publicado, se puede elegir.
// Un período cuyo cuatrimestre ya terminó se sigue mostrando como referencia, marcado como «Período anterior»
// ("anterior" lo calcula el servidor con la fecha de Argentina).
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
          Todavía no hay horarios publicados. Para consultar por los horarios, utilizar el{" "}
          <Link to="/contacto">formulario de contacto</Link>.
        </p>
      ) : (
        <>
          <div className="vigente">
            {actual.anterior ? (
              <span className="etiqueta et-gris">Período anterior</span>
            ) : (
              <span className="etiqueta et-verde">Publicado</span>
            )}
            <strong>{textoPeriodo(actual)}</strong>
            <span className="texto-vigente">Actualizado el {textoFecha(actual.publicadoEn)}</span>
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
          {actual.anterior && (
            <p className="aviso-referencia">Estos horarios se mantienen disponibles como referencia.</p>
          )}
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