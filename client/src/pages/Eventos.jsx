import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { IMGS } from "../imagenes";
import { api } from "../api";

export default function Eventos() {
  const [vista, setVista] = useState("grilla");
  const [eventos, setEventos] = useState([]);

  useEffect(() => {
    let cancelado = false;
    api("/events")
      .then((data) => {
        const lista = data?.eventos || (Array.isArray(data) ? data : []);
        if (!cancelado && lista.length > 0) {
          setEventos(lista);
        }
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

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
              <h2>Eventos 2026</h2>
              <span className="raya" aria-hidden="true" />
              <p>
                Explorá las jornadas, muestras y encuentros gastronómicos que se realizaron este año
                en el instituto.
              </p>
            </div>
            <div
              role="group"
              aria-label="Cómo ver los eventos"
              className={"vista" + (vista === "lista" ? " es-lista" : "")}
            >
              <button
                type="button"
                aria-pressed={vista === "grilla"}
                onClick={() => setVista("grilla")}
              >
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
              <button
                type="button"
                aria-pressed={vista === "lista"}
                onClick={() => setVista("lista")}
              >
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
          </div>
          <ul className={"grilla-eventos" + (vista === "lista" ? " lista" : "")}>
            {eventos.length > 0 ? (
              eventos.map((post) => {
                const rawText = (post.caption || "").replace(/#[\p{L}\p{N}_]+/gu, "").trim();
                let titulo = post.titulo || post.parsed?.title || "";
                let resumen = post.resumen || post.parsed?.summary || "";

                if (!titulo || titulo.length > 70) {
                  const emojiMatch = rawText.match(/\s*(\p{Extended_Pictographic})\s*/u);
                  if (emojiMatch && emojiMatch.index > 5) {
                    titulo = rawText.slice(0, emojiMatch.index).trim();
                    resumen = rawText.slice(emojiMatch.index + emojiMatch[0].length).trim();
                  }
                }
                if (!titulo) titulo = rawText || "Evento institucional";
                if (resumen && resumen.length > 110) {
                  resumen = resumen.slice(0, 110).trim().replace(/[\s,;.]+$/, "") + "...";
                }

                const fecha = post.fechaEvento ? new Date(post.fechaEvento).toLocaleDateString("es-AR", { month: "long", year: "numeric" }) : (post.fechaFormateada || "Reciente");
                const cantidad = post.cantidadMedios || 1;
                const imagen =
                  post.fotoPrincipal ||
                  post.localImage ||
                  post.localThumbnail ||
                  IMGS.B_EVENTOS;

                return (
                  <li key={post.id}>
                    <Link className="tarjeta" to={`/evento?id=${post.id}`} state={{ post }}>
                      <span className="cant">
                        {post.isVideo ? (
                          "🎬 Video"
                        ) : (
                          <>
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <rect x="3" y="5" width="18" height="14" rx="2" />
                              <circle cx="9" cy="10" r="2" />
                              <path d="M21 16l-5-5-8 8" />
                            </svg>
                            {cantidad} {cantidad === 1 ? "foto" : "fotos"}
                          </>
                        )}
                      </span>
                      <img
                        src={imagen}
                        alt={`Foto del evento ${titulo}`}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = IMGS.B_EVENTOS;
                        }}
                      />
                      <div className="texto">
                        <time>{fecha}</time>
                        <h3>{titulo}</h3>
                        <p>{resumen}</p>
                        <span className="ver">
                          {post.isVideo ? "Ver el video" : "Ver las fotos"}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })
            ) : (
              <>
            <li>
              <Link className="tarjeta" to="/evento">
                <span className="cant">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="9" cy="10" r="2" />
                    <path d="M21 16l-5-5-8 8" />
                  </svg>
                  4 fotos
                </span>
                <img src={IMGS.VERDURAS} alt="Foto del evento Cierre del 1.° cuatrimestre" />
                <div className="texto">
                  <time>Julio 2026</time>
                  <h3>Cierre del 1.° cuatrimestre</h3>
                  <p>Muestra de las producciones del primer cuatrimestre.</p>
                  <span className="ver">Ver las fotos</span>
                </div>
              </Link>
            </li>
            <li>
              <Link className="tarjeta" to="/evento">
                <span className="cant">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="9" cy="10" r="2" />
                    <path d="M21 16l-5-5-8 8" />
                  </svg>
                  8 fotos
                </span>
                <img src={IMGS.MORRON} alt="Foto del evento Jornada de Gastronomía" />
                <div className="texto">
                  <time>Junio 2026</time>
                  <h3>Jornada de Gastronomía</h3>
                  <p>Jornada abierta con elaboraciones de los estudiantes.</p>
                  <span className="ver">Ver las fotos</span>
                </div>
              </Link>
            </li>
            <li>
              <Link className="tarjeta" to="/evento">
                <span className="cant">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="9" cy="10" r="2" />
                    <path d="M21 16l-5-5-8 8" />
                  </svg>
                  6 fotos
                </span>
                <img src={IMGS.PLATO} alt="Foto del evento Mateada Patria" />
                <div className="texto">
                  <time>Mayo 2026</time>
                  <h3>Mateada Patria</h3>
                  <p>Encuentro por el 25 de Mayo con estudiantes, docentes y familias.</p>
                  <span className="ver">Ver las fotos</span>
                </div>
              </Link>
            </li>
              </>
            )}
          </ul>
          <details className="archivo">
            <summary>
              Años anteriores{" "}
              <span className="flecha">
                <svg
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
              </span>
            </summary>
            <div className="lista">
              <Link to="/evento">
                <strong>Noche de los Museos</strong>
                <span>Noviembre 2025</span>
              </Link>
              <Link to="/evento">
                <strong>Colación de egresados</strong>
                <span>Diciembre 2024</span>
              </Link>
              <Link to="/evento">
                <strong>Jornada de Gastronomía</strong>
                <span>Octubre 2024</span>
              </Link>
              <Link to="/evento">
                <strong>Mateada Patria</strong>
                <span>Mayo 2024</span>
              </Link>
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}
