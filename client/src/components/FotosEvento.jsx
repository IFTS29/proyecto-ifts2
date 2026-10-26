import { MAXIMO_DE_FOTOS, TIPOS_DE_FOTO } from "../fotos.js";

// Fotos de un evento en el formulario de alta y en el de edición: miniaturas, portada, quitar y agregar.
// "fotos" es una lista de { id, url, nombre? }. La portada es siempre la primera foto.
// Con "conPortada" en false (eventos de video, cuya portada es la imagen del video) no se elige portada.
// "nota" se muestra debajo de las miniaturas (por ejemplo, para volver a poner las fotos quitadas).
export default function FotosEvento({
  fotos,
  alAgregar,
  alQuitar,
  alElegirPortada,
  conPortada = true,
  preparando = false,
  deshabilitado = false,
  nota = null,
}) {
  const lleno = fotos.length >= MAXIMO_DE_FOTOS;
  // Mientras se preparan fotos nuevas no se cambia la galería: así no se mezclan dos cambios a la vez.
  const bloqueado = deshabilitado || preparando;
  const sinAgregar = bloqueado || lleno;

  const elegirArchivos = (e) => {
    const archivos = Array.from(e.target.files || []);
    e.target.value = ""; // permite volver a elegir el mismo archivo después de quitarlo
    if (archivos.length) alAgregar(archivos);
  };

  return (
    <div className="campo">
      <div className="fotos-cabecera">
        <span className="etiqueta-campo">Fotos</span>
        <span className="ayuda">
          {fotos.length} de {MAXIMO_DE_FOTOS} fotos
        </span>
      </div>

      {fotos.length > 0 && (
        <ul className="galeria-edicion">
          {fotos.map((foto, i) => (
            <li key={foto.id}>
              <div className="foto-galeria">
                <img src={foto.url} alt={foto.nombre || `Foto ${i + 1} del evento`} />
                {conPortada && i === 0 && <span className="etiqueta-portada">Portada</span>}
                <button
                  type="button"
                  className="foto-quitar"
                  onClick={() => alQuitar(foto.id)}
                  disabled={bloqueado}
                  aria-label={`Quitar foto ${i + 1}`}
                  title="Quitar foto"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              {conPortada && i > 0 && (
                <button
                  type="button"
                  className="boton-texto foto-portada"
                  onClick={() => alElegirPortada(foto.id)}
                  disabled={bloqueado}
                >
                  Usar como portada
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {nota}

      <input
        id="e-archivos"
        type="file"
        multiple
        accept={TIPOS_DE_FOTO.join(",")}
        onChange={elegirArchivos}
        disabled={sinAgregar}
        className="solo-lectores"
      />
      <label htmlFor="e-archivos" className="zona-fotos" aria-disabled={sinAgregar}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
        </svg>
        <strong>{lleno ? "Llegaste al máximo de fotos" : "Agregar fotos"}</strong>
        <span>
          {preparando
            ? "Preparando las fotos…"
            : lleno
            ? `Un evento puede tener hasta ${MAXIMO_DE_FOTOS} fotos. Quitá alguna para agregar otra.`
            : "Seleccioná una o varias imágenes JPG, PNG o WebP. Se preparan automáticamente antes de subirlas."}
        </span>
      </label>
    </div>
  );
}
