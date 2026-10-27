import { useEffect, useRef, useState } from "react";
import { indiceVecino } from "../eventos.js";

const IMAGEN_DE_REEMPLAZO = "/media/instagram/placeholder.svg";

// Visor de fotos a pantalla completa, sobre <dialog> (foco atrapado y Escape del navegador).
// "fotos" es una lista de { url }; "inicio", la posición con la que se abre.
// Se cierra con la X, con Escape o tocando el fondo; "alCerrar" recibe la posición de la última foto vista.
// "alFallar" recibe el enlace de una foto que no cargó, para no volver a ofrecerla.
export default function VisorFotos({ fotos, inicio, titulo, alCerrar, alFallar }) {
  const ref = useRef(null);
  const botonCerrar = useRef(null);
  const [indice, setIndice] = useState(inicio);
  const total = fotos.length;
  const varias = total > 1;

  useEffect(() => {
    ref.current.showModal();
    botonCerrar.current?.focus();
  }, []);

  // Al cerrar el <dialog>, el navegador devuelve el foco a la foto que abrió el visor.
  const cerrar = () => {
    ref.current.close();
    alCerrar(indice);
  };
  const mover = (paso) => setIndice((actual) => indiceVecino(actual, total, paso));

  const alTeclear = (e) => {
    if (!varias) return;
    if (e.key === "ArrowLeft") mover(-1);
    if (e.key === "ArrowRight") mover(1);
  };

  // Un clic en el fondo cierra; un clic en la foto o en los botones, no (son otros elementos).
  return (
    <dialog
      ref={ref}
      className="visor"
      aria-label={`Fotos del evento «${titulo}»`}
      onCancel={(e) => {
        e.preventDefault();
        cerrar();
      }}
      onKeyDown={alTeclear}
      onClick={(e) => e.target === e.currentTarget && cerrar()}
    >
      <img
        className="visor-foto"
        src={fotos[indice].url}
        alt={`Foto ${indice + 1} de ${total} del evento «${titulo}»`}
        onError={(e) => {
          alFallar?.(fotos[indice].url);
          e.currentTarget.onerror = null;
          e.currentTarget.src = IMAGEN_DE_REEMPLAZO;
        }}
      />
      <button ref={botonCerrar} type="button" className="visor-boton visor-cerrar" onClick={cerrar} aria-label="Cerrar" title="Cerrar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      {varias && (
        <>
          <button type="button" className="visor-boton visor-anterior" onClick={() => mover(-1)} aria-label="Foto anterior" title="Foto anterior">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button type="button" className="visor-boton visor-siguiente" onClick={() => mover(1)} aria-label="Foto siguiente" title="Foto siguiente">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
          <p className="visor-posicion" aria-live="polite">
            {indice + 1} de {total}
          </p>
        </>
      )}
    </dialog>
  );
}
