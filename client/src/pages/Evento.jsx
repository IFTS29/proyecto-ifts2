import { useState, useEffect } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { IMGS } from "../imagenes";
import { api } from "../api";

function urlEmbedInstagram(url) {
  if (!url || typeof url !== "string" || !url.includes("instagram.com")) return null;
  return url.split("?")[0].replace(/\/$/, "") + "/";
}

function InstagramEmbed({ url, titulo }) {
  useEffect(() => {
    const procesar = () => {
      if (window.instgrm?.Embeds) {
        window.instgrm.Embeds.process();
      }
    };

    if (window.instgrm) {
      procesar();
    } else {
      const scriptId = "instagram-embed-script";
      let script = document.getElementById(scriptId);
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://www.instagram.com/embed.js";
        script.async = true;
        script.defer = true;
        script.onload = procesar;
        document.body.appendChild(script);
      } else {
        script.addEventListener("load", procesar);
      }
    }
  }, [url]);

  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%", minHeight: "480px" }}>
      <blockquote
        key={url}
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          background: "var(--blanco, #fff)",
          border: "1px solid var(--borde, #e5e7eb)",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
          margin: "0 auto",
          maxWidth: "540px",
          minWidth: "326px",
          padding: "0",
          width: "100%",
        }}
      >
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <p style={{ margin: "0 0 1rem", color: "var(--suave)" }}>Cargando publicación oficial de Instagram...</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--naranja)", fontWeight: "600" }}
          >
            Ver publicación en Instagram ↗
          </a>
        </div>
      </blockquote>
    </div>
  );
}

export default function Evento() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const postId = searchParams.get("id");

  const [post, setPost] = useState(location.state?.post || null);
  const [indiceFoto, setIndiceFoto] = useState(0);
  const [fotoFallback, setFotoFallback] = useState("PLATO");

  useEffect(() => {
    if (postId) {
      api(`/events/${postId}`)
        .then((data) => {
          if (data?.evento) setPost(data.evento);
        })
        .catch(() => {});
    }
  }, [postId]);

  // Si hay publicación de Instagram cargada
  if (post) {
    const rawText = (post.caption || "").replace(/#[\p{L}\p{N}_]+/gu, "").trim();
    let titulo = post.titulo || post.parsed?.title || "";
    let parrafos = post.descripcion
      ? post.descripcion.split(/\r?\n/).map((p) => p.trim()).filter(Boolean)
      : Array.isArray(post.parsed?.bodyParagraphs) && post.parsed.bodyParagraphs.length > 0
      ? post.parsed.bodyParagraphs
      : [];

    // Si el título es muy largo o contiene un emoji demarcador (ej. 💻, 🚀, 🎓), separarlo limpiamente del cuerpo
    if (!titulo || parrafos.length === 0 || titulo.length > 70) {
      const emojiMatch = rawText.match(/\s*(\p{Extended_Pictographic})\s*/u);
      if (emojiMatch && emojiMatch.index > 5) {
        titulo = rawText.slice(0, emojiMatch.index).trim();
        const resto = rawText.slice(emojiMatch.index + emojiMatch[0].length).trim();
        if (resto) parrafos = [resto];
      }
    }
    if (!titulo) titulo = rawText || "Evento institucional";
    if (parrafos.length === 0 && rawText && rawText !== titulo) {
      parrafos = [rawText];
    }

    const subtitulo = post.resumen || post.parsed?.summary || (parrafos[0] ? parrafos[0].slice(0, 110) + "..." : "");
    let fecha = post.fechaEvento
      ? new Date(post.fechaEvento).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
      : (post.fechaFormateada || "Reciente");
    const igUrl = post.videoUrl || post.permalink;
    const tieneInstagram = Boolean(urlEmbedInstagram(igUrl));
    const fotosReales = (Array.isArray(post.medios) ? post.medios : [])
      .filter((m) => m?.url && !m.url.includes("placeholder") && !urlEmbedInstagram(m.url));

    let items;
    if (fotosReales.length > 0) {
      items = fotosReales.map((m, idx) => ({
        id: m.id || String(idx + 1),
        mediaType: m.tipo || "IMAGE",
        url: m.url,
        thumbnailUrl: m.thumbnailUrl || m.url,
      }));
    } else if (tieneInstagram) {
      items = [
        {
          id: "instagram-embed",
          mediaType: "VIDEO",
          url: igUrl,
          thumbnailUrl: IMGS.B_EVENTOS,
        },
      ];
    } else if (post.videoUrl) {
      items = [
        {
          id: "video-manual",
          mediaType: "VIDEO",
          url: post.videoUrl,
          thumbnailUrl: IMGS.B_EVENTOS,
        },
      ];
    } else if (Array.isArray(post.medios) && post.medios.length > 0) {
      items = post.medios.map((m, idx) => ({
        id: m.id || String(idx + 1),
        mediaType: m.tipo || "IMAGE",
        url: m.url,
        thumbnailUrl: m.thumbnailUrl || m.url,
      }));
    } else if (Array.isArray(post.mediaItems) && post.mediaItems.length > 0) {
      items = post.mediaItems;
    } else {
      items = [
        {
          id: post.id || "1",
          mediaType: post.mediaType || (post.isVideo ? "VIDEO" : "IMAGE"),
          url: post.isVideo
            ? post.localVideo || post.videoUrl || IMGS.B_EVENTOS
            : post.fotoPrincipal || post.localImage || IMGS.B_EVENTOS,
          thumbnailUrl:
            post.localThumbnail ||
            post.fotoPrincipal ||
            post.localImage ||
            IMGS.B_EVENTOS,
        },
      ];
    }

    const medioActivo = items[indiceFoto] || items[0];
    const isActivoVideo = medioActivo.mediaType === "VIDEO";
    const cantidadTexto = tieneInstagram && fotosReales.length === 0
      ? "Instagram"
      : post.isVideo
      ? "Video"
      : `${items.length} ${items.length === 1 ? "foto" : "fotos"}`;

    const hashtagsTexto =
      Array.isArray(post.parsed?.hashtags) && post.parsed.hashtags.length > 0
        ? post.parsed.hashtags.join(" ")
        : "#ifts2eventos";

    // Banner institucional idéntico a develop: nunca usa un SVG/placeholder ni URL de Instagram como fondo
    const esFotoValida =
      items[0]?.url &&
      !urlEmbedInstagram(items[0].url) &&
      !items[0].url.endsWith(".mp4") &&
      !items[0].url.endsWith(".svg") &&
      !items[0].url.includes("placeholder");

    const fotoBanner = esFotoValida ? items[0].url : IMGS.B_EVENTOS;

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
                {urlEmbedInstagram(medioActivo.url) ? (
                  <InstagramEmbed url={urlEmbedInstagram(medioActivo.url)} titulo={titulo} />
                ) : isActivoVideo ? (
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
                    src={medioActivo.url || IMGS.B_EVENTOS}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = IMGS.B_EVENTOS;
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
                        src={item.thumbnailUrl || item.url || IMGS.B_EVENTOS}
                        alt={`Miniatura ${idx + 1}`}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = IMGS.B_EVENTOS;
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
                {post.origen === "instagram" ? (
                  <p>Esta publicación llegó al sitio con el hashtag {hashtagsTexto}.</p>
                ) : (
                  <p>Publicación institucional vinculada con Instagram.</p>
                )}
                {post.permalink || post.videoUrl ? (
                  <a
                    className="enlace"
                    href={post.permalink || post.videoUrl}
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
