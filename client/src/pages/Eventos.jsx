import { useState } from "react";
import { IMGS } from "../imagenes";
import { diaEnArgentina, eventosPorAnio } from "../eventos.js";
import useEventos from "../useEventos.js";
import TarjetaEvento from "../components/TarjetaEvento.jsx";

const cantidad = (n) => `${n} ${n === 1 ? "evento" : "eventos"}`;

// Galería de eventos: un bloque por año, con el más reciente abierto y los anteriores plegados.
// Plegar un año es solo una forma de mostrarlo: el archivado de eventos es otra cosa (#35).
// El bloque del año en curso (en Argentina) está siempre, abierto, aunque todavía no tenga eventos. Si está vacío,
// también se abre el año más reciente con eventos, para que la galería no parezca vacía el 1/1.
export default function Eventos() {
  const [vista, setVista] = useState("grilla");
  const { eventos, estado, reintentar } = useEventos();
  const anioActual = Number(diaEnArgentina().slice(0, 4));
  const grupos = eventosPorAnio(eventos, anioActual);
  const masRecienteConEventos = grupos.find((g) => g.eventos.length > 0)?.clave;
  const hayEventos = Boolean(masRecienteConEventos);

  return (
    <div className="pagina activa">
      <section className="banner velo-suave" style={{ "--foto": `url(${IMGS.B_EVENTOS})` }}>
        <div className="contenedor">
          <h1>Galería de eventos</h1>
          <span className="raya" aria-hidden="true" />
          <p>
            Jornadas, muestras y encuentros que reflejan la experiencia real de la carrera y del
            instituto.
          </p>
        </div>
      </section>
      <section className="seccion">
        <div className="contenedor">
          <div className="eventos-cab">
            <div className="cabecera">
              <h2>Eventos del instituto</h2>
              <span className="raya" aria-hidden="true" />
              <p>Jornadas, muestras y encuentros gastronómicos, del más reciente al más antiguo.</p>
            </div>
            {hayEventos && (
              <div
                role="group"
                aria-label="Cómo ver los eventos"
                className={"vista" + (vista === "lista" ? " es-lista" : "")}
              >
                <button type="button" aria-pressed={vista === "grilla"} onClick={() => setVista("grilla")}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                  <span>Cuadrícula</span>
                </button>
                <button type="button" aria-pressed={vista === "lista"} onClick={() => setVista("lista")}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="4" width="6" height="6" rx="1.5" />
                    <rect x="3" y="14" width="6" height="6" rx="1.5" />
                    <path d="M13 6h8M13 9h5M13 16h8M13 19h5" />
                  </svg>
                  <span>Lista</span>
                </button>
              </div>
            )}
          </div>

          {estado === "cargando" && (
            <p className="estado-vacio" role="status">
              Cargando eventos…
            </p>
          )}
          {estado === "error" && (
            <div className="estado-vacio" role="alert">
              <p>No se pudieron cargar los eventos.</p>
              <button type="button" className="boton boton-linea boton-chico" onClick={reintentar}>
                Reintentar
              </button>
            </div>
          )}
          {estado === "listo" &&
            grupos.map((grupo) => (
              <details
                className="anio-eventos"
                key={grupo.clave}
                open={grupo.clave === String(anioActual) || grupo.clave === masRecienteConEventos}
              >
                <summary>
                  <span className="anio">{grupo.titulo}</span>
                  {grupo.eventos.length > 0 && <span className="cuenta">{cantidad(grupo.eventos.length)}</span>}
                  <svg
                    className="flecha"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                {grupo.eventos.length === 0 ? (
                  <p className="estado-vacio">Todavía no hay eventos publicados de {grupo.titulo}.</p>
                ) : (
                  <ul className={"grilla-eventos" + (vista === "lista" ? " lista" : "")}>
                    {grupo.eventos.map((evento) => (
                      <li key={evento.id}>
                        <TarjetaEvento evento={evento} />
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            ))}
        </div>
      </section>
    </div>
  );
}
