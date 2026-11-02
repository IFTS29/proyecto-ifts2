// Fila plegable del panel: cabecera con número, título y resumen (botón para desplegar) y, aparte, las flechas
// para ordenar y el tacho. El tacho está separado del botón de desplegar para no quitar una fila por error,
// y el formulario pide confirmación antes de quitarla.

const Icono = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d={d} />
  </svg>
);

export default function FilaPlegable({
  id,
  numero,
  titulo,
  resumen,
  nombre,
  abierta,
  alternar,
  esPrimera,
  esUltima,
  mover,
  quitar,
  error,
  children,
}) {
  return (
    <li className={"fila-plegable" + (abierta ? " abierta" : "") + (error ? " con-error" : "")}>
      <div className="fila-plegable-cab">
        <button
          type="button"
          className="fila-plegable-boton"
          aria-expanded={abierta}
          aria-controls={id}
          onClick={alternar}
        >
          <span className="fila-num" aria-hidden="true">
            {numero}
          </span>
          <span className="fila-plegable-texto">
            <strong>{titulo}</strong>
            {resumen && <small>{resumen}</small>}
          </span>
          <span className="fila-plegable-flecha">
            <Icono d="M6 9l6 6 6-6" />
          </span>
        </button>
        <div className="acciones-fila">
          <button
            className="boton-icono"
            type="button"
            aria-label={`Subir ${nombre}`}
            title="Subir"
            disabled={esPrimera}
            onClick={() => mover(-1)}
          >
            <Icono d="M12 19V5M5 12l7-7 7 7" />
          </button>
          <button
            className="boton-icono"
            type="button"
            aria-label={`Bajar ${nombre}`}
            title="Bajar"
            disabled={esUltima}
            onClick={() => mover(1)}
          >
            <Icono d="M12 5v14M19 12l-7 7-7-7" />
          </button>
          <button
            className="boton-icono peligro"
            type="button"
            aria-label={`Quitar ${nombre}`}
            title="Quitar"
            onClick={quitar}
          >
            <Icono d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
          </button>
        </div>
      </div>
      <div id={id} className="fila-plegable-cuerpo" hidden={!abierta}>
        {children}
        {error && (
          <p className="error-fila">{error}</p>
        )}
      </div>
    </li>
  );
}
