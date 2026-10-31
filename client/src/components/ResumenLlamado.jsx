import { textoFechaHora } from "../academica.js";
import { textoFechasDelLlamado, textoMesas } from "../mesas.js";

// Resumen de un llamado: sus datos, el estado de la publicación, los cambios sin publicar y las acciones.
// - Publicar (verde): el llamado no está publicado. Se puede publicar sin mesas, como anuncio.
// - Actualizar publicación (verde): está publicado y hay cambios guardados.
// - Retirar publicación (texto rojo): está publicado.
// - Eliminar llamado (texto rojo): solo si nunca se publicó. El servidor también lo controla.
export default function ResumenLlamado({
  llamado,
  ocupado,
  alEditarDatos,
  alAbrirTabla,
  alVerCambios,
  alVistaPrevia,
  alPublicar,
  alRetirar,
  alEliminar,
}) {
  const mesas = llamado.mesas.length;
  const hayCambios = llamado.cambios.length > 0;
  const fechas = textoFechasDelLlamado(llamado);

  return (
    <section className="caja resumen-horarios" aria-labelledby="titulo-llamado">
      <h2 id="titulo-llamado">Mesas de examen · {llamado.nombre}</h2>

      <dl className="datos-llamado">
        <div>
          <dt>Período de exámenes</dt>
          <dd>{fechas || "Sin fechas generales"}</dd>
        </div>
        <div>
          <dt>Aviso para los alumnos</dt>
          <dd>{llamado.aviso || "Sin aviso"}</dd>
        </div>
      </dl>
      <button className="boton-texto" type="button" disabled={ocupado} onClick={alEditarDatos}>
        Editar datos del llamado
      </button>

      <p className="estado-publicacion">
        {llamado.publicado ? (
          <>
            <span className="etiqueta et-verde">Publicado</span>
            <span>Última publicación: {textoFechaHora(llamado.publicadoEn)}</span>
          </>
        ) : (
          <>
            <span className="etiqueta et-gris">No publicado</span>
            <span>
              {llamado.sePublico
                ? "Se retiró la publicación: los alumnos no lo ven. El llamado se conserva."
                : "Los alumnos todavía no ven este llamado."}
            </span>
          </>
        )}
      </p>

      {hayCambios && (
        <div className="aviso visible aviso-cambios" role="status">
          Hay cambios guardados sin publicar. Los alumnos todavía ven la versión anterior.{" "}
          <button className="enlace" type="button" onClick={alVerCambios}>
            Ver cambios ({llamado.cambios.length})
          </button>
        </div>
      )}

      <button className="tarjeta-accion" type="button" disabled={ocupado} onClick={alAbrirTabla}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        <span>
          <strong>Ver y editar mesas</strong>
          <span>{textoMesas(mesas)}</span>
        </span>
        <span className="flecha" aria-hidden="true">
          →
        </span>
      </button>

      <div className="acciones">
        <button className="boton boton-linea" type="button" disabled={ocupado} onClick={alVistaPrevia}>
          Vista previa
        </button>
        {llamado.publicado && (
          <a
            className="boton boton-linea"
            href={`/api/academic/vigente/mesas.pdf?llamado=${encodeURIComponent(llamado.id)}`}
            download
          >
            PDF publicado
          </a>
        )}
        {!llamado.publicado && (
          <button className="boton boton-verde" type="button" disabled={ocupado} onClick={alPublicar}>
            Publicar
          </button>
        )}
        {llamado.publicado && hayCambios && (
          <button className="boton boton-verde" type="button" disabled={ocupado} onClick={alPublicar}>
            Actualizar publicación
          </button>
        )}
        {llamado.publicado && (
          <button className="boton-texto peligro" type="button" disabled={ocupado} onClick={alRetirar}>
            Retirar publicación
          </button>
        )}
        {!llamado.sePublico && (
          <button className="boton-texto peligro" type="button" disabled={ocupado} onClick={alEliminar}>
            Eliminar llamado
          </button>
        )}
      </div>
      {mesas === 0 && !llamado.publicado && (
        <p className="ayuda">Sin mesas, el llamado se publica como anuncio: con sus fechas y el aviso.</p>
      )}
      {llamado.publicado && !hayCambios && <p className="ayuda">La publicación está al día con lo guardado.</p>}
    </section>
  );
}
