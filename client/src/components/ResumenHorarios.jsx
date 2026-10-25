import { textoFechaHora, textoMaterias, textoPeriodo } from "../academica.js";

// Resumen de un período: estado de la publicación, cambios sin publicar y acciones.
// - Publicar (verde): el período no está publicado (primera vez o después de retirar).
// - Actualizar publicación (verde): está publicado y hay cambios guardados.
// - Retirar publicación (texto rojo): está publicado.
export default function ResumenHorarios({
  estado,
  ocupado,
  alAbrirTabla,
  alVerCambios,
  alVistaPrevia,
  alPublicar,
  alRetirar,
}) {
  const materias = estado.horarios.length;
  const hayCambios = estado.cambios.length > 0;

  return (
    <section className="caja resumen-horarios" aria-labelledby="titulo-resumen">
      <h2 id="titulo-resumen">Horarios de cursada · {textoPeriodo(estado)}</h2>

      <p className="estado-publicacion">
        {estado.publicado ? (
          <>
            <span className="etiqueta et-verde">Publicado</span>
            <span>Última publicación: {textoFechaHora(estado.publicadoEn)}</span>
          </>
        ) : (
          <>
            <span className="etiqueta et-gris">No publicado</span>
            <span>Los alumnos todavía no ven este período.</span>
          </>
        )}
      </p>

      {hayCambios && (
        <div className="aviso visible aviso-cambios" role="status">
          Hay cambios guardados sin publicar. Los alumnos todavía ven la versión anterior.{" "}
          <button className="enlace" type="button" onClick={alVerCambios}>
            Ver cambios ({estado.cambios.length})
          </button>
        </div>
      )}

      <button className="tarjeta-accion" type="button" onClick={alAbrirTabla}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span>
          <strong>Ver y editar horarios</strong>
          <span>{textoMaterias(materias)}</span>
        </span>
        <span className="flecha" aria-hidden="true">
          →
        </span>
      </button>

      <div className="acciones">
        <button
          className="boton boton-linea"
          type="button"
          disabled={materias === 0 || ocupado}
          onClick={alVistaPrevia}
        >
          Vista previa
        </button>
        {!estado.publicado && (
          <button className="boton boton-verde" type="button" disabled={materias === 0 || ocupado} onClick={alPublicar}>
            Publicar
          </button>
        )}
        {estado.publicado && hayCambios && (
          <button className="boton boton-verde" type="button" disabled={materias === 0 || ocupado} onClick={alPublicar}>
            Actualizar publicación
          </button>
        )}
        {estado.publicado && (
          <button className="boton-texto peligro" type="button" disabled={ocupado} onClick={alRetirar}>
            Retirar publicación
          </button>
        )}
      </div>
      {materias === 0 && !estado.publicado && <p className="ayuda">Para publicar, cargá al menos una materia.</p>}
      {materias === 0 && estado.publicado && (
        <p className="ayuda">No quedan materias guardadas. Para sacar el período del sitio, usá Retirar publicación.</p>
      )}
      {estado.publicado && !hayCambios && materias > 0 && (
        <p className="ayuda">La publicación está al día con lo guardado.</p>
      )}
    </section>
  );
}