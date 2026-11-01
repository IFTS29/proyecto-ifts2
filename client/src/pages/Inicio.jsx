import { useRef, useEffect, useState } from "react";
import { api } from "../api";
import { Link } from "react-router-dom";
import { ENLACES, EXTERNO } from "../enlaces.js";

const EVENTOS_EN_INICIO = 8; // los más recientes

export default function Inicio() {
  const carRef = useRef(null);
  const pausa = useRef(false);
  const [eventos, setEventos] = useState([]);

  useEffect(() => {
    let cancelado = false;
    // Los mismos eventos que la galería: cargados a mano y llegados de Instagram, solo los visibles.
    // Así, lo que se edita u oculta desde el panel se ve igual en el inicio.
    api("/events")
      .then(({ eventos: lista = [] }) => {
        // El servidor los devuelve del más reciente al más antiguo.
        if (!cancelado) setEventos(lista.slice(0, EVENTOS_EN_INICIO));
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  const mover = (d) => {
    const c = carRef.current;
    if (!c) return;
    const li = c.querySelector("li");
    const paso = li ? li.getBoundingClientRect().width + 24 : 300;
    const max = c.scrollWidth - c.clientWidth - 4;
    if (d > 0 && c.scrollLeft >= max) {
      c.scrollTo({ left: 0 });
      return;
    }
    if (d < 0 && c.scrollLeft <= 0) {
      c.scrollTo({ left: max });
      return;
    }
    c.scrollBy({ left: d * paso });
  };

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (!pausa.current && !document.hidden) mover(1);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="pagina activa">
      <section className="portada" aria-labelledby="t-portada">
        <div className="contenedor">
          <p className="pastilla">Tecnicatura Superior en Emprendimientos Gastronómicos</p>
          <h1 id="t-portada">
            <span className="antes">No formamos solo cocineros.</span>
            <span className="lema">Formamos microempresarios gastronómicos</span>
          </h1>
          <span className="raya" aria-hidden="true" />
          <p className="bajada">
            Aprendé a cocinar y a gestionar tu propio emprendimiento en una carrera pública y
            gratuita.
          </p>
          <div className="acciones">
            <Link className="boton boton-naranja" to="/carrera">
              Conocé la carrera
            </Link>
            <Link className="boton boton-claro" to="/carrera#plan-estudios">
              Ver plan de estudios
            </Link>
          </div>
          <ul className="chips">
            <li>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              3 años
            </li>
            <li>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Gratuita
            </li>
            <li>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="5" />
                <path d="M8.5 12.5L7 22l5-3 5 3-1.5-9.5" />
              </svg>
              Título oficial nacional
            </li>
            <li>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
              Lunes a viernes, 18 a 22 h
            </li>
          </ul>
        </div>
      </section>
      <section className="busqueda" aria-labelledby="t-buscar">
        <div className="contenedor">
          <h2 id="t-buscar">¿Qué estás buscando?</h2>
          <div className="perfiles">
            <div className="perfil">
              <div className="perfil-cab">
                <span className="icono ic-naranja">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6l-5 3.6 1.9-5.8L4 8.8h6.1z" />
                  </svg>
                </span>
                <div>
                  <h3>Quiero estudiar</h3>
                  <p>Para quienes piensan inscribirse</p>
                </div>
              </div>
              <ul className="enlaces">
                <li>
                  <Link to="/carrera">
                    <span>
                      <strong>La carrera</strong>
                      <span>Qué vas a aprender y perfil del egresado</span>
                    </span>
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
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </span>
                  </Link>
                </li>
                <li>
                  <Link to="/carrera#plan-estudios">
                    <span>
                      <strong>Plan de estudios</strong>
                      <span>Materias y correlatividades</span>
                    </span>
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
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </span>
                  </Link>
                </li>
                <li>
                  <Link to="/ingreso">
                    <span>
                      <strong>Cómo inscribirte</strong>
                      <span>Requisitos y preinscripción</span>
                    </span>
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
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </span>
                  </Link>
                </li>
              </ul>
              <p className="nota-perfil">
                Requisito de ingreso: secundario completo. La carrera es gratuita y el título tiene
                validez nacional.
              </p>
            </div>
            <div className="perfil">
              <div className="perfil-cab">
                <span className="icono ic-verde">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M22 10L12 5 2 10l10 5 10-5z" />
                    <path d="M6 12v5c3 2 9 2 12 0v-5" />
                  </svg>
                </span>
                <div>
                  <h3>Ya soy alumno</h3>
                  <p>Información del cuatrimestre y plataformas</p>
                </div>
              </div>
              <ul className="enlaces dos-col">
                <li>
                  <Link to="/alumnos">
                    <span>
                      <strong>Horarios de cursada</strong>
                      <span>2.° cuatrimestre 2026</span>
                    </span>
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
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </span>
                  </Link>
                </li>
                <li>
                  <Link to="/alumnos">
                    <span>
                      <strong>Mesas de examen</strong>
                      <span>Fechas del turno vigente</span>
                    </span>
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
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </span>
                  </Link>
                </li>
                <li>
                  <a href={ENLACES.siuAlumnos} {...EXTERNO}>
                    <span>
                      <strong>SIU Guaraní</strong>
                      <span>Inscripción a materias y exámenes</span>
                      <span className="externo">
                        Sitio externo<span className="solo-lectores">, se abre en otra pestaña</span>
                      </span>
                    </span>
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
                        <path d="M7 17L17 7M9 7h8v8" />
                      </svg>
                    </span>
                  </a>
                </li>
                <li>
                  <a href={ENLACES.aulasVirtuales} {...EXTERNO}>
                    <span>
                      <strong>Aulas virtuales</strong>
                      <span>Campus Moodle</span>
                      <span className="externo">
                        Sitio externo<span className="solo-lectores">, se abre en otra pestaña</span>
                      </span>
                    </span>
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
                        <path d="M7 17L17 7M9 7h8v8" />
                      </svg>
                    </span>
                  </a>
                </li>
                <li>
                  <a href={ENLACES.miArgentina} {...EXTERNO}>
                    <span>
                      <strong>Mi Argentina</strong>
                      <span>Título digital para egresados</span>
                      <span className="externo">
                        Sitio externo<span className="solo-lectores">, se abre en otra pestaña</span>
                      </span>
                    </span>
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
                        <path d="M7 17L17 7M9 7h8v8" />
                      </svg>
                    </span>
                  </a>
                </li>
                <li>
                  <Link to="/contacto">
                    <span>
                      <strong>Consultas a Bedelía</strong>
                      <span>Formulario de contacto</span>
                    </span>
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
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <section className="seccion" aria-labelledby="t-ident">
        <div className="contenedor">
          <div className="cabecera">
            <h2 id="t-ident">La cocina es el punto de partida. El negocio, el destino.</h2>
            <span className="raya" aria-hidden="true" />
            <p>
              En tres años combinás talleres de producción con materias de gestión, para diseñar y
              llevar adelante tu propio emprendimiento gastronómico.
            </p>
          </div>
          <div className="ecuacion">
            <div className="bloque cocina">
              <h3>En la cocina</h3>
              <p className="sub">Talleres de producción gastronómica</p>
              <ul>
                <li>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Carnes, vegetales, cereales y huevos
                </li>
                <li>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Panadería, pastelería y repostería
                </li>
                <li>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Buffet, catering y bebidas
                </li>
                <li>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Cocina nacional e internacional
                </li>
              </ul>
            </div>
            <div className="signo" aria-hidden="true">
              +
            </div>
            <div className="bloque negocio">
              <h3>En el negocio</h3>
              <p className="sub">Gestión y administración gastronómica</p>
              <ul>
                <li>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Microempresa y contabilidad
                </li>
                <li>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Comercialización, compras y stock
                </li>
                <li>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Organización de eventos
                </li>
                <li>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Conducción de equipos de trabajo
                </li>
              </ul>
            </div>
            <div className="signo" aria-hidden="true">
              =
            </div>
            <div className="bloque resultado">
              <span className="etiqueta">Práctica Profesional 3</span>
              <h3>Tu propio emprendimiento</h3>
              <p>En el último año diseñás tu emprendimiento gastronómico con todo lo aprendido.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="franja" aria-labelledby="t-ficha">
        <div className="contenedor">
          <div>
            <h2 id="t-ficha">Técnico/a Superior en Emprendimientos Gastronómicos</h2>
            <div className="acciones">
              <Link className="boton boton-naranja" to="/carrera#plan-estudios">
                Ver plan de estudios
              </Link>
            </div>
          </div>
          <dl>
            <div>
              <dt>Duración</dt>
              <dd>3 años</dd>
            </div>
            <div>
              <dt>Carga horaria</dt>
              <dd>2758 horas cátedra</dd>
            </div>
            <div>
              <dt>Requisito</dt>
              <dd>Secundario completo</dd>
            </div>
            <div>
              <dt>Modalidad</dt>
              <dd>Presencial, turno noche</dd>
            </div>
          </dl>
        </div>
      </section>
      <section className="seccion" aria-labelledby="t-ev">
        <div className="contenedor">
          <div className="eventos-cab">
            <div className="cabecera">
              <h2 id="t-ev">Lo que pasa en el instituto</h2>
              <span className="raya" aria-hidden="true" />
              <p>Jornadas, prácticas y eventos de nuestros estudiantes.</p>
            </div>
            <div className="controles">
              <button type="button" aria-label="Ver eventos anteriores" onClick={() => mover(-1)}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
              <button type="button" aria-label="Ver más eventos" onClick={() => mover(1)}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
          <ul
            className="carrusel"
            id="carrusel"
            ref={carRef}
            onMouseEnter={() => (pausa.current = true)}
            onMouseLeave={() => (pausa.current = false)}
            onFocus={() => (pausa.current = true)}
            onBlur={() => (pausa.current = false)}
          >
            {eventos.length > 0 ? (
              eventos.map((post) => {
                const titulo = post.titulo || "Evento institucional";
                const resumen = post.resumen || "";
                const fecha = post.fechaEvento
                  ? new Date(post.fechaEvento).toLocaleDateString("es-AR", { month: "long", year: "numeric" })
                  : "Reciente";
                const esVideo = post.tipoMedio === "VIDEO";
                const cantidad = post.cantidadMedios || 1;
                const imagen =
                  post.fotoPrincipal ||
                  post.localImage ||
                  post.localThumbnail ||
                  "/media/instagram/placeholder.svg";

                return (
                  <li key={post.id}>
                    <Link className="tarjeta" to={`/evento?id=${post.id}`} state={{ post }}>
                      <span className="cant">
                        {esVideo ? (
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
                          e.currentTarget.src = "/media/instagram/placeholder.svg";
                        }}
                      />
                      <div className="texto">
                        <time>{fecha}</time>
                        <h3>{titulo}</h3>
                        <p>{resumen}</p>
                        <span className="ver">
                          {esVideo ? "Ver el video" : "Ver las fotos"}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })
            ) : (
              <li>
                <p style={{ color: "var(--suave)" }}>Todavía no hay eventos publicados.</p>
              </li>
            )}
          </ul>
          <div className="pie-carrusel">
            <p>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
              </svg>
              Las novedades también se publican en nuestro Instagram:{" "}
              <a className="enlace" href={ENLACES.instagram} {...EXTERNO}>
                @ifts_2_ok<span className="solo-lectores"> (se abre en otra pestaña)</span>
              </a>
            </p>
            <Link className="boton boton-verde" to="/eventos">
              Ver todos los eventos
            </Link>
          </div>
        </div>
      </section>
      <section className="llamado" aria-labelledby="t-llam">
        <div className="contenedor">
          <div>
            <h2 id="t-llam">¿Querés estudiar con nosotros?</h2>
            <p>Escribinos tu consulta y te responde Bedelía.</p>
            <div className="acciones">
              <Link className="boton boton-naranja" to="/ingreso">
                Cómo inscribirte
              </Link>
              <Link className="boton boton-claro" to="/contacto">
                Enviar una consulta
              </Link>
            </div>
          </div>
          <div className="datos-contacto">
            <div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <p>
                <strong>Cañada de Gómez 3850</strong>
                <span>Villa Lugano, Ciudad de Buenos Aires</span>
              </p>
            </div>
            <div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              <p>
                <strong>Lunes a viernes, de 18 a 22 h</strong>
                <span>Cursada presencial</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
