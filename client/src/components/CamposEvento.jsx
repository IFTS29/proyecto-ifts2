// Título, fecha, resumen y descripción de un evento. Los usan el formulario de alta y el de edición.
// "valores" viene de valoresDeEvento (eventos.js); "alCambiar(campo, valor)" actualiza uno.
export default function CamposEvento({ valores, alCambiar, deshabilitado = false }) {
  const cambiar = (campo) => (e) => alCambiar(campo, e.target.value);

  return (
    <>
      <div className="campo">
        <label htmlFor="e-tit">Título del evento</label>
        <input
          id="e-tit"
          value={valores.titulo}
          onChange={cambiar("titulo")}
          placeholder="Ej: Jornada de Gastronomía 2026"
          required
          disabled={deshabilitado}
        />
      </div>
      <div className="fila" style={{ alignItems: "start" }}>
        <div className="campo">
          <label htmlFor="e-fecha">Fecha del evento</label>
          <input
            id="e-fecha"
            type="date"
            value={valores.fecha}
            onChange={cambiar("fecha")}
            required
            disabled={deshabilitado}
          />
          <span className="ayuda">Cuándo se realizó o se realizará la actividad.</span>
        </div>
        <div className="campo">
          <label htmlFor="e-resumen">Resumen (opcional)</label>
          <input id="e-resumen" value={valores.resumen} onChange={cambiar("resumen")} disabled={deshabilitado} />
          <span className="ayuda">Una línea que se muestra en la tarjeta de la galería.</span>
        </div>
      </div>
      <div className="campo">
        <label htmlFor="e-desc">Descripción</label>
        <textarea
          id="e-desc"
          value={valores.descripcion}
          onChange={cambiar("descripcion")}
          rows={4}
          placeholder="Escribí una descripción detallada de la jornada o muestra..."
          required
          disabled={deshabilitado}
        />
      </div>
    </>
  );
}
