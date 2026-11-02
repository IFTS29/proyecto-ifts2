import { Link } from "react-router-dom";
import { IMAGEN_DE_REEMPLAZO, datosDeTarjeta } from "../eventos.js";

const ICONOS = {
  fotos: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M21 16l-5-5-8 8" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M10 9.5v5l4.5-2.5z" />
    </>
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" />
    </>
  ),
};

// Tarjeta de un evento en el carrusel del Inicio y en la galería de Eventos.
// Todo lo que muestra sale de datosDeTarjeta (eventos.js), así las dos páginas coinciden.
export default function TarjetaEvento({ evento }) {
  const { titulo, resumen, fecha, imagen, tipo, etiqueta, accion } = datosDeTarjeta(evento);
  return (
    <Link
      className={"tarjeta" + (imagen === IMAGEN_DE_REEMPLAZO ? " sin-foto" : "")}
      to={`/evento?id=${encodeURIComponent(evento.id)}`}
    >
      {etiqueta && (
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
            {ICONOS[tipo]}
          </svg>
          {etiqueta}
        </span>
      )}
      <img
        src={imagen}
        alt=""
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = IMAGEN_DE_REEMPLAZO;
        }}
      />
      <div className="texto">
        {fecha && <time dateTime={String(evento.fechaEvento)}>{fecha}</time>}
        <h3>{titulo}</h3>
        {resumen && <p>{resumen}</p>}
        <span className="ver">{accion}</span>
      </div>
    </Link>
  );
}
