import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { IMGS } from "../imagenes";
import { api } from "../api";
import VisorFotos from "../components/VisorFotos.jsx";
import {
  IMAGEN_DE_REEMPLAZO,
  contenidoDeEvento,
  enlaceDeInstagram,
  esDeInstagram,
  galeriaDeEvento,
  hashtagsDeEvento,
  medioPrincipal,
  parrafosDe,
  textoDeFecha,
} from "../eventos.js";

const BAJADA_GENERAL = "Jornadas, muestras y encuentros que reflejan la experiencia real de la carrera y del instituto.";

const IconoInstagram = () => (
  <svg
    className="icono-ig"
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
);

// Publicación de Instagram incrustada. Se usa solo si el evento no tiene fotos ni videos propios
// (por ejemplo, un reel que Instagram no deja descargar). Se avisa que es contenido de Instagram:
// tocarlo puede abrir Instagram, a diferencia de las fotos propias, que se amplían en el visor.
function PublicacionIncrustada({ url }) {
  useEffect(() => {
    const procesar = () => window.instgrm?.Embeds?.process();
    if (window.instgrm) {
      procesar();
      return;
    }
    let script = document.getElementById("instagram-embed-script");
    if (!script) {
      script = document.createElement("script");
      script.id = "instagram-embed-script";
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      document.body.appendChild(script);
    }
    script.addEventListener("load", procesar);
    return () => script.removeEventListener("load", procesar);
  }, [url]);

  return (
    <figure className="publicacion-incrustada">
      <blockquote key={url} className="instagram-media" data-instgrm-permalink={url} data-instgrm-version="14">
        <p>Cargando la publicación de Instagram…</p>
      </blockquote>
      <figcaption>
        <IconoInstagram />
        Contenido de Instagram: al tocar la publicación se puede abrir Instagram.
      </figcaption>
    </figure>
  );
}

// Pantallas sin evento: cargando, no encontrado o error de conexión (con «Reintentar»).
function SinEvento({ titulo, texto, children }) {
  return (
    <div className="pagina activa">
      <section className="banner velo-suave" style={{ "--foto": `url(${IMGS.B_EVENTOS})` }}>
        <div className="contenedor">
          <p className="migas">
            <Link to="/eventos">Galería de eventos</Link>
          </p>
          <h1>{titulo}</h1>
          <span className="raya" aria-hidden="true" />
        </div>
      </section>
      <section className="seccion">
        <div className="contenedor sin-evento">
          <p role={children ? "alert" : "status"}>{texto}</p>
          <div className="acciones">
            {children}
            <Link className="boton boton-verde" to="/eventos">
              Volver a eventos
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Evento() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  // Siempre se piden los datos al servidor, aunque se llegue desde una tarjeta: así no se muestra
  // un evento que se ocultó o se editó después. "estado": cargando, listo, no-encontrado o error.
  const [evento, setEvento] = useState(null);
  const [estado, setEstado] = useState(id ? "cargando" : "no-encontrado");
  const [intento, setIntento] = useState(0);
  const [indice, setIndice] = useState(null); // ítem de la galería elegido (null: el principal)
  const [visor, setVisor] = useState(null); // { fotos, desde } mientras el visor está abierto
  const [fallidas, setFallidas] = useState(() => new Set()); // fotos que no cargaron: no se ofrecen para ampliar
  const marcarFallida = (url) => setFallidas((actuales) => (actuales.has(url) ? actuales : new Set(actuales).add(url)));

  useEffect(() => {
    if (!id) {
      setEstado("no-encontrado");
      return;
    }
    let cancelado = false;
    setEstado("cargando");
    setIndice(null);
    api(`/events/${encodeURIComponent(id)}`)
      .then((datos) => {
        if (cancelado) return;
        if (datos?.evento) {
          setEvento(datos.evento);
          setEstado("listo");
        } else {
          setEstado("no-encontrado");
        }
      })
      .catch((error) => {
        if (!cancelado) setEstado(error.estado === 404 ? "no-encontrado" : "error");
      });
    return () => {
      cancelado = true;
    };
  }, [id, intento]);

  if (estado === "cargando") return <SinEvento titulo="Evento" texto="Cargando el evento…" />;
  if (estado === "no-encontrado") {
    return (
      <SinEvento
        titulo="No se encontró el evento"
        texto="El evento no existe o ya no está publicado. Los eventos vigentes están en la galería."
      />
    );
  }
  if (estado === "error") {
    return (
      <SinEvento titulo="Evento" texto="No se pudo cargar el evento.">
        <button type="button" className="boton boton-linea" onClick={() => setIntento((n) => n + 1)}>
          Reintentar
        </button>
      </SinEvento>
    );
  }

  const titulo = String(evento.titulo || "").trim() || "Evento institucional";
  const parrafos = parrafosDe(evento.descripcion || evento.resumen);
  const fecha = textoDeFecha(evento.fechaEvento, { conDia: true });
  const { etiqueta } = contenidoDeEvento(evento);
  const galeria = galeriaDeEvento(evento);
  const principal = medioPrincipal(evento);
  const activo = galeria[indice ?? principal.indice] || null;

  // Fotos que se pueden ampliar, en el orden de la galería, sin las que no cargaron.
  const fotosVisor = galeria.filter((item) => item.tipo === "foto" && !fallidas.has(item.url));
  const posicionEnVisor = activo ? fotosVisor.findIndex((foto) => foto.url === activo.url) : -1;
  const numeroDeFoto = (url) => galeria.filter((item) => item.tipo === "foto").findIndex((item) => item.url === url) + 1;
  const totalDeFotos = galeria.filter((item) => item.tipo === "foto").length;

  const deInstagram = esDeInstagram(evento);
  const enlace = enlaceDeInstagram(evento);
  const hashtags = hashtagsDeEvento(evento);

  const resumen = String(evento.resumen || "").trim();
  const bajada = resumen && resumen.toLowerCase() !== titulo.toLowerCase() ? resumen : BAJADA_GENERAL;

  let contenidoPrincipal;
  if (activo?.tipo === "video") {
    contenidoPrincipal = <video controls playsInline poster={activo.miniatura || undefined} src={activo.url} />;
  } else if (activo?.tipo === "foto" && posicionEnVisor >= 0) {
    const n = numeroDeFoto(activo.url);
    contenidoPrincipal = (
      <button
        type="button"
        className="ampliar"
        onClick={() => setVisor({ fotos: fotosVisor, desde: posicionEnVisor })}
        aria-label={`Ampliar la foto ${n} de ${totalDeFotos}`}
        title="Ampliar foto"
      >
        <img
          id="foto-principal"
          alt={`Foto ${n} de ${totalDeFotos} del evento «${titulo}»`}
          src={activo.url}
          onError={() => marcarFallida(activo.url)}
        />
        <span className="ampliar-icono" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5M11 8.5v5M8.5 11h5" />
          </svg>
        </span>
      </button>
    );
  } else if (!activo && principal.tipo === "instagram") {
    contenidoPrincipal = <PublicacionIncrustada url={principal.url} />;
  } else {
    // Sin fotos ni videos, o la foto elegida no cargó: imagen de reemplazo, sin visor.
    contenidoPrincipal = <img id="foto-principal" alt="" src={IMAGEN_DE_REEMPLAZO} />;
  }

  return (
    <div className="pagina activa">
      {/* El banner usa siempre la imagen institucional de eventos: las fotos de un evento no siempre sirven
          de fondo (tamaño, encuadre, colores) y ya se ven completas en la galería. */}
      <section className="banner velo-suave" style={{ "--foto": `url(${IMGS.B_EVENTOS})` }}>
        <div className="contenedor">
          <p className="migas">
            <Link to="/eventos">Galería de eventos</Link>
          </p>
          <h1>{titulo}</h1>
          <span className="raya" aria-hidden="true" />
          <p>{bajada}</p>
        </div>
      </section>
      <section className="seccion">
        <div className="contenedor detalle">
          <div className="galeria">
            <div className={"principal" + (!activo && principal.tipo === "instagram" ? " con-publicacion" : "")}>
              {contenidoPrincipal}
            </div>
            {galeria.length > 1 && (
              <div className="miniaturas">
                {galeria.map((item, i) => {
                  const nombre =
                    item.tipo === "foto"
                      ? `Ver la foto ${numeroDeFoto(item.url)} de ${totalDeFotos}`
                      : "Ver el video";
                  const miniatura = item.tipo === "foto" ? item.url : item.miniatura || IMAGEN_DE_REEMPLAZO;
                  return (
                    <button
                      key={item.url}
                      type="button"
                      aria-pressed={activo?.url === item.url}
                      aria-label={nombre}
                      onClick={() => setIndice(i)}
                    >
                      <img
                        src={fallidas.has(item.url) ? IMAGEN_DE_REEMPLAZO : miniatura}
                        alt=""
                        onError={(e) => {
                          if (item.tipo === "foto") marcarFallida(item.url);
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = IMAGEN_DE_REEMPLAZO;
                        }}
                      />
                      {item.tipo === "video" && <span className="marca-video">Video</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {visor && (
              <VisorFotos
                fotos={visor.fotos}
                inicio={visor.desde}
                titulo={titulo}
                alFallar={marcarFallida}
                alCerrar={(ultima) => {
                  setVisor(null);
                  // La galería queda en la última foto que se vio en el visor.
                  const enGaleria = galeria.findIndex((item) => item.url === visor.fotos[ultima].url);
                  if (enGaleria >= 0) setIndice(enGaleria);
                }}
              />
            )}
          </div>
          <div className="info-evento">
            <div className="meta">
              {fecha && <span className="etiqueta et-naranja">{fecha}</span>}
              {etiqueta && <span className="etiqueta et-gris">{etiqueta}</span>}
            </div>
            {parrafos.map((parrafo, i) => (
              <p key={i}>{parrafo}</p>
            ))}
            {deInstagram && (
              <div className="caja-ig">
                <strong>
                  <IconoInstagram />
                  Publicación de Instagram
                </strong>
                <p>
                  {evento.origen === "instagram"
                    ? "Esta publicación llegó al sitio desde Instagram."
                    : "Publicación vinculada con Instagram."}
                </p>
                {hashtags.length > 0 && <p className="hashtags">{hashtags.join(" ")}</p>}
                {enlace && (
                  <a className="enlace" href={enlace} target="_blank" rel="noopener noreferrer">
                    Ver la publicación en Instagram
                    <span className="solo-lectores"> (se abre en otra pestaña)</span>
                  </a>
                )}
              </div>
            )}
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
