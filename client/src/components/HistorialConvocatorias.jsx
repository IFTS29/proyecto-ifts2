import { useEffect, useState } from "react";
import { api } from "../api.js";
import { EXTERNO } from "../enlaces.js";
import { pasosDelHistorial, textoGuardadaEl } from "../ingreso.js";

// Convocatorias de ingreso anteriores, solo de consulta (#35). Se guardan solas en el servidor cuando se carga una
// convocatoria nueva o se quita la que estaba. Acá no se editan, no se restauran ni se borran.
export default function HistorialConvocatorias() {
  const [estado, setEstado] = useState({ cargando: true, error: "", convocatorias: [] });

  useEffect(() => {
    let vigente = true;
    api("/content/ingreso/historial")
      .then((res) => vigente && setEstado({ cargando: false, error: "", convocatorias: res.convocatorias ?? [] }))
      .catch(() =>
        vigente &&
        setEstado({ cargando: false, error: "No se pudieron cargar las convocatorias anteriores.", convocatorias: [] }),
      );
    return () => {
      vigente = false;
    };
  }, []);

  const { cargando, error, convocatorias } = estado;
  return (
    <section className="bloque-formulario historial-convocatorias" aria-labelledby="titulo-historial">
      <h3 id="titulo-historial" className="subtitulo-formulario">
        Convocatorias anteriores
      </h3>
      <p className="ayuda-formulario">
        Al guardar una nueva convocatoria o quitar la actual, la anterior se conserva aquí para su consulta.
      </p>
      {cargando && <p className="lista-vacia">Cargando…</p>}
      {error && <p className="error-fila">{error}</p>}
      {!cargando && !error && convocatorias.length === 0 && (
        <p className="lista-vacia">Todavía no hay convocatorias anteriores.</p>
      )}
      {convocatorias.length > 0 && (
        <ul className="filas-plegables">
          {convocatorias.map((c) => (
            <li key={c.convocatoria} className="fila-plegable">
              <details className="convocatoria-anterior-panel">
                <summary className="fila-plegable-boton">
                  <span className="fila-plegable-texto">
                    <strong>{c.convocatoria}</strong>
                    <small>{textoGuardadaEl(c.guardadaEn)}</small>
                  </span>
                </summary>
                <div className="fila-plegable-cuerpo">
                  <ol className="pasos-historial">
                    {pasosDelHistorial(c.datos).map((paso, i) => (
                      <li key={`${paso.nombre}-${i}`}>
                        <strong>{paso.nombre}</strong>
                        <span>{paso.fechas}</span>
                        {paso.detalle && <span className="detalle">{paso.detalle}</span>}
                        {paso.textoEnlace && paso.urlEnlace && (
                          <a className="enlace" href={paso.urlEnlace} {...EXTERNO}>
                            {paso.textoEnlace}
                            <span className="solo-lectores"> (se abre en otra pestaña)</span>
                          </a>
                        )}
                      </li>
                    ))}
                  </ol>
                  {c.datos.video && (
                    <p className="ayuda-formulario">
                      Video:{" "}
                      <a className="enlace" href={c.datos.video} {...EXTERNO}>
                        {c.datos.video}
                        <span className="solo-lectores"> (se abre en otra pestaña)</span>
                      </a>
                    </p>
                  )}
                  {c.datos.correo && <p className="ayuda-formulario">Correo de consultas: {c.datos.correo}</p>}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
