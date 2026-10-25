import { useState, useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { IMGS } from "../imagenes";
import { api } from "../api";

export default function Evento() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const postId = searchParams.get("id");

  const [post, setPost] = useState(location.state?.post || null);
  const [indiceFoto, setIndiceFoto] = useState(0);
  const [fotoFallback, setFotoFallback] = useState("PLATO");

  useEffect(() => {
    if (!post && postId) {
      api("/instagram/feed")
        .then((data) => {
          if (Array.isArray(data)) {
            const encontrado = data.find((p) => String(p.id) === String(postId));
            if (encontrado) setPost(encontrado);
          }
        })
        .catch(() => {});
    }
  }, [post, postId]);

  // Si hay publicación de Instagram cargada
  if (post) {
    const titulo = post.parsed?.title || post.caption || "Evento institucional";
    const subtitulo = post.parsed?.summary || "";
    const fecha = post.fechaFormateada || "Reciente";
    const items =
      Array.isArray(post.mediaItems) && post.mediaItems.length > 0
        ? post.mediaItems
        : [
            {
              id: post.id,
              mediaType: post.mediaType || (post.isVideo ? "VIDEO" : "IMAGE"),
              url: post.isVideo
                ? post.localVideo || "/media/instagram/placeholder.svg"
                : post.fotoPrincipal || post.localImage || "/media/instagram/placeholder.svg",
              thumbnailUrl:
                post.localThumbnail ||
                post.fotoPrincipal ||
                post.localImage ||
                "/media/instagram/placeholder.svg",
            },
          ];

    const medioActivo = items[indiceFoto] || items[0];
    const isActivoVideo = medioActivo.mediaType === "VIDEO";
    const cantidadTexto = post.isVideo
      ? "Video"
      : `${items.length} ${items.length === 1 ? "foto" : "fotos"}`;

    const hashtagsTexto =
      Array.isArray(post.parsed?.hashtags) && post.parsed.hashtags.length > 0
        ? post.parsed.hashtags.join(" ")
        : "#ifts2eventos";

    const parrafos =
      Array.isArray(post.parsed?.bodyParagraphs) && post.parsed.bodyParagraphs.length > 0
        ? post.parsed.bodyParagraphs
        : [subtitulo || post.caption || ""];

    // Banner institucional idéntico a develop (evita que el placeholder SVG colisione con el texto)
    const tieneFotoPropia =
      items[0]?.url &&
      !items[0].url.endsWith(".mp4") &&
      !items[0].url.includes("placeholder.svg");

    const fotoBanner = tieneFotoPropia ? items[0].url : IMGS.B_EVENTOS;

    const esSubtituloDistinto =
      subtitulo &&
      subtitulo.trim().toLowerCase() !== titulo.trim().toLowerCase() &&
      !titulo.trim().toLowerCase().startsWith(subtitulo.replace(/\.\.\.$/, "").trim().toLowerCase());

    const bajadaBanner = esSubtituloDistinto
      ? subtitulo
      : "Jornadas, muestras y encuentros que reflejan la experiencia real de la carrera y del instituto.";

    return (
      <div className="pagina activa">
        <section className="banner velo-suave" style={{ "--foto": `url(${fotoBanner})` }}>
          <div className="contenedor">
            <p className="migas">
              <Link to="/eventos">Galería de eventos</Link>
            </p>
            <h1>{titulo}</h1>
            <span className="raya" aria-hidden="true" />
            <p>{bajadaBanner}</p>
          </div>
        </section>
        <section className="seccion">
          <div className="contenedor detalle">
            <div className="galeria">
              <div className="principal">
                {isActivoVideo ? (
                  <video
                    controls
                    playsInline
                    poster={medioActivo.thumbnailUrl}
                    src={medioActivo.url}
                    style={{ width: "100%", borderRadius: "8px" }}
                  />
                ) : (
                  <img
                    id="foto-principal"
                    alt={`Foto del evento ${titulo}`}
                    src={medioActivo.url || "/media/instagram/placeholder.svg"}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/media/instagram/placeholder.svg";
                    }}
                  />
                )}
              </div>
              {items.length > 1 && (
                <div className="miniaturas">
                  {items.map((item, idx) => (
                    <button
                      key={item.id || idx}
                      type="button"
                      aria-pressed={indiceFoto === idx}
                      onClick={() => setIndiceFoto(idx)}
                    >
                      <img
                        src={item.thumbnailUrl || item.url}
                        alt={`Miniatura ${idx + 1}`}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/media/instagram/placeholder.svg";
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="info-evento">
              <div className="meta">
                <span className="etiqueta et-naranja">{fecha}</span>
                <span className="etiqueta et-gris">{cantidadTexto}</span>
              </div>
              <h2>{titulo}</h2>
              {parrafos.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
              <div className="caja-ig">
                <strong style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <svg
                    width="22"
                    height="22"
                    style={{ color: "var(--naranja)" }}
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
                  Publicado desde Instagram
                </strong>
                <p>Esta publicación llegó al sitio con el hashtag {hashtagsTexto}.</p>
                {post.permalink ? (
                  <a
                    className="enlace"
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver la publicación en Instagram ↗
                  </a>
                ) : (
                  <Link className="enlace" to="/eventos">
                    Ver más eventos
                  </Link>
                )}
              </div>
              <div className="acciones">
                <Link className="boton boton-linea" to="/eventos">
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
                  Volver a eventos
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Fallback estático cuando no hay evento dinámico seleccionado
  return (
    <div className="pagina activa">
      <section className="banner" style={{ "--foto": `url(${IMGS.PLATO})` }}>
        <div className="contenedor">
          <p className="migas">
            <Link to="/eventos">Galería de eventos</Link>
          </p>
          <h1>Mateada Patria</h1>
          <span className="raya" aria-hidden="true" />
          <p>Encuentro por el 25 de Mayo con estudiantes, docentes y familias.</p>
        </div>
      </section>
      <section className="seccion">
        <div className="contenedor detalle">
          <div className="galeria">
            <div className="principal">
              <img id="foto-principal" alt="Foto principal del evento" src={IMGS[fotoFallback]} />
            </div>
            <div className="miniaturas">
              <button
                type="button"
                aria-pressed={fotoFallback === "PLATO"}
                onClick={() => setFotoFallback("PLATO")}
              >
                <img src={IMGS.PLATO} alt="Foto 1 del evento" />
              </button>
              <button
                type="button"
                aria-pressed={fotoFallback === "VERDURAS"}
                onClick={() => setFotoFallback("VERDURAS")}
              >
                <img src={IMGS.VERDURAS} alt="Foto 2 del evento" />
              </button>
              <button
                type="button"
                aria-pressed={fotoFallback === "MORRON"}
                onClick={() => setFotoFallback("MORRON")}
              >
                <img src={IMGS.MORRON} alt="Foto 3 del evento" />
              </button>
              <button
                type="button"
                aria-pressed={fotoFallback === "ESTUDIO"}
                onClick={() => setFotoFallback("ESTUDIO")}
              >
                <img src={IMGS.ESTUDIO} alt="Foto 4 del evento" />
              </button>
              <button
                type="button"
                aria-pressed={fotoFallback === "HERO"}
                onClick={() => setFotoFallback("HERO")}
              >
                <img src={IMGS.HERO} alt="Foto 5 del evento" />
              </button>
            </div>
          </div>
          <div className="info-evento">
            <div className="meta">
              <span className="etiqueta et-naranja">Mayo 2026</span>
              <span className="etiqueta et-gris">6 fotos</span>
            </div>
            <h2>Mateada Patria</h2>
            <p>
              Para celebrar el 25 de Mayo, estudiantes de todos los años prepararon pastelitos,
              tortas fritas y mate cocido para compartir con docentes, familias y vecinos del
              barrio.
            </p>
            <p>
              Fue también una práctica real de organización de eventos: planificación de compras,
              producción y atención del público.
            </p>
            <div className="caja-ig">
              <strong style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <svg
                  width="22"
                  height="22"
                  style={{ color: "var(--naranja)" }}
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
                Publicado desde Instagram
              </strong>
              <p>Esta publicación llegó al sitio con el hashtag #IFTSEventos.</p>
              <Link className="enlace" to="/evento">
                Ver la publicación en Instagram
              </Link>
            </div>
            <div className="acciones">
              <Link className="boton boton-linea" to="/eventos">
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
                Volver a eventos
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
