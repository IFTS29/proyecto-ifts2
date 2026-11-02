import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { IMGS } from "../imagenes";
import { ENLACES, EXTERNO } from "../enlaces.js";
import { DOCUMENTOS } from "../documentos.js";
import { almacenContenido, useContenidoInstitucional } from "../contenido.js";
import {
  FECHAS_A_CONFIRMAR,
  cronogramaDe,
  esConvocatoriaAnterior,
  estadoDePreinscripcion,
  videoDeYoutube,
} from "../ingreso.js";
import Documento from "../components/Documento.jsx";

// Solo «Preinscripción abierta» se destaca (en verde). Los demás estados son informativos, en gris: el naranja
// se leía como un aviso de error.
const ETIQUETA_DE_ESTADO = {
  "sin-convocatoria": "et-gris",
  proxima: "et-gris",
  abierta: "et-verde",
  finalizada: "et-gris",
};

const Flecha = () => (
  <svg
    className="icono-externo"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M7 17L17 7M9 7h8v8" />
  </svg>
);

const EnlaceExterno = ({ href, clase, children }) => (
  <a className={clase} href={href} {...EXTERNO}>
    {children}
    <span className="solo-lectores"> (se abre en otra pestaña)</span>
    <Flecha />
  </a>
);

// Enlace de una etapa (por ejemplo, el aula virtual del curso). Solo direcciones https, como valida el servidor.
const enlaceDe = (paso) =>
  paso.textoEnlace && /^https:\/\//.test(paso.urlEnlace ?? "")
    ? { texto: paso.textoEnlace, url: paso.urlEnlace }
    : null;

// Lista de etapas con sus fechas. Las que están en curso se marcan (en la convocatoria anterior no hay ninguna,
// porque ya pasaron todas sus fechas). Los enlaces de las etapas se muestran solo en la convocatoria vigente:
// en la anterior no se invita a entrar a un aula o a una inscripción que ya pasó.
function Cronograma({ pasos, conEnlaces = false }) {
  return (
    <ol className="cronograma">
      {pasos.map((paso, i) => (
        <li key={`${paso.nombre}-${i}`} className={paso.enCurso ? "en-curso" : undefined}>
          <span className="paso-num">{i + 1}</span>
          {paso.enCurso && <span className="etiqueta et-verde marca-en-curso">En curso</span>}
          <h3>{paso.nombre}</h3>
          <p className="paso-fecha">{paso.fechas}</p>
          {paso.detalle && <p>{paso.detalle}</p>}
          {conEnlaces && enlaceDe(paso) && (
            <p className="paso-enlace">
              <EnlaceExterno href={enlaceDe(paso).url} clase="enlace">
                {enlaceDe(paso).texto}
              </EnlaceExterno>
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

// Video de YouTube de la convocatoria, debajo de las etapas. Sin video, no se muestra nada.
function Video({ direccion }) {
  const video = videoDeYoutube(direccion);
  if (!video) return null;
  return (
    <div className="video-ingreso">
      <h3>Video sobre el ingreso</h3>
      <div className="video-marco">
        <iframe
          src={video.insertar}
          title="Video sobre el ingreso"
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <EnlaceExterno href={video.ver} clase="enlace">
        Ver en YouTube
      </EnlaceExterno>
    </div>
  );
}

// Ingreso: la convocatoria y sus fechas salen de la sección «ingreso» del contenido institucional, y las
// preguntas frecuentes de «ingresoPreguntas». Las dos se editan desde el panel, cada una con su guardado.
// - Sin convocatoria cargada: «Próxima convocatoria» con las fechas a confirmar.
// - Convocatoria con alguna fecha por delante: arriba, con el estado de la preinscripción y las etapas en curso.
// - Convocatoria con todas sus fechas pasadas: arriba, la próxima (a confirmar); debajo, la anterior como
//   referencia, para que la página tenga información todo el año. Se reemplaza al cargar la nueva.
export default function Ingreso() {
  const { estado, contenido } = useContenidoInstitucional();
  const ingreso = contenido?.ingreso?.datos;
  const preinscripcion = estadoDePreinscripcion(ingreso);
  const pasos = cronogramaDe(ingreso);
  const preguntas = contenido?.ingresoPreguntas?.datos?.preguntas ?? [];
  const anterior = esConvocatoriaAnterior(ingreso);
  const actual = Boolean(ingreso?.convocatoria) && !anterior;
  // Mientras la preinscripción está abierta, su paso lleva el enlace a SIU Guaraní.
  const pasosActuales =
    actual && preinscripcion.tipo === "abierta"
      ? pasos.map((paso, i) =>
          i === 0
            ? { ...paso, textoEnlace: "SIU Guaraní", urlEnlace: ENLACES.preinscripcion }
            : paso,
        )
      : pasos;

  // «Ver cómo queda en el sitio» del panel lleva a /ingreso#preguntas: se baja cuando las preguntas ya cargaron.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === "#preguntas" && preguntas.length > 0) document.getElementById("preguntas")?.scrollIntoView();
  }, [hash, preguntas.length]);

  return (
    <div className="pagina activa">
      <section className="banner velo-fuerte" style={{ "--foto": `url(${IMGS.B_PLAN})` }}>
        <div className="contenedor">
          <h1>Ingreso</h1>
          <span className="raya" aria-hidden="true" />
          <p>Cómo inscribirse en la Tecnicatura Superior en Emprendimientos Gastronómicos.</p>
        </div>
      </section>
      <section className="seccion">
        <div className="contenedor">
          <div className="cabecera">
            <h2>
              {actual ? (
                <>
                  Ingreso: <span>{ingreso.convocatoria}</span>
                </>
              ) : (
                "Próxima convocatoria"
              )}
            </h2>
            <span className="raya" aria-hidden="true" />
            <p>
              El preingreso a las carreras de Técnica Superior lo organiza la Agencia de Habilidades para el Futuro
              del Gobierno de la Ciudad.
            </p>
          </div>

          {estado === "cargando" && !contenido && (
            <p className="estado-vacio" role="status">
              Cargando la información de ingreso…
            </p>
          )}
          {estado === "error" && (
            <div className="estado-vacio" role="alert">
              <p>No se pudo cargar la información de ingreso.</p>
              <button type="button" className="boton boton-linea boton-chico" onClick={() => almacenContenido.cargar()}>
                Reintentar
              </button>
            </div>
          )}

          {ingreso && (
            <>
              {actual ? (
                <>
                  <div className="vigente">
                    <span className={`etiqueta ${ETIQUETA_DE_ESTADO[preinscripcion.tipo]}`}>
                      {preinscripcion.etiqueta}
                    </span>
                    {preinscripcion.texto && <span className="texto-vigente">{preinscripcion.texto}</span>}
                  </div>
                  {preinscripcion.tipo === "finalizada" && (
                    <p className="aviso-convocatoria">
                      Las fechas de la próxima convocatoria las publica la Agencia de Habilidades para el Futuro.
                    </p>
                  )}
                  <Cronograma pasos={pasosActuales} conEnlaces />
                </>
              ) : (
                <>
                  <div className="vigente">
                    <span className={`etiqueta ${ETIQUETA_DE_ESTADO[FECHAS_A_CONFIRMAR.tipo]}`}>
                      {FECHAS_A_CONFIRMAR.etiqueta}
                    </span>
                  </div>
                  <p className="aviso-convocatoria">
                    Las fechas de la próxima convocatoria las publica la Agencia de Habilidades para el Futuro.
                  </p>
                </>
              )}

              <div className="acciones">
                {actual && preinscripcion.tipo === "abierta" && (
                  <EnlaceExterno href={ENLACES.preinscripcion} clase="boton boton-naranja">
                    Ir a la preinscripción
                  </EnlaceExterno>
                )}
                <EnlaceExterno href={ENLACES.ingresoOficial} clase="boton boton-linea">
                  Ver carreras y fechas en el sitio oficial
                </EnlaceExterno>
              </div>
              {/* Debajo de los botones, para no alejar «Ir a la preinscripción» de las etapas. */}
              {actual && <Video direccion={ingreso.video} />}

              {anterior && (
                <div className="convocatoria-anterior">
                  <h2>
                    Convocatoria anterior: <span>{ingreso.convocatoria}</span>
                  </h2>
                  <div className="vigente">
                    <span className={`etiqueta ${ETIQUETA_DE_ESTADO.finalizada}`}>{preinscripcion.etiqueta}</span>
                    <span className="texto-vigente">{preinscripcion.texto}</span>
                  </div>
                  <p className="aviso-convocatoria">
                    Sirve como referencia de las etapas del ingreso. Las fechas y condiciones de la próxima
                    convocatoria pueden cambiar.
                  </p>
                  <Cronograma pasos={pasos} />
                  <Video direccion={ingreso.video} />
                </div>
              )}
            </>
          )}
        </div>
      </section>
      <section className="seccion seccion-alt">
        <div className={"contenedor" + (preguntas.length > 0 ? " dos" : "")}>
          {preguntas.length > 0 && (
            <div id="preguntas">
              <div className="cabecera">
                <h2>Preguntas frecuentes</h2>
                <span className="raya" aria-hidden="true" />
              </div>
              {preguntas.map((p, i) => (
                <details className="faq" key={i}>
                  <summary>
                    {p.pregunta}
                    <span className="flecha">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </summary>
                  <p>{p.respuesta}</p>
                </details>
              ))}
            </div>
          )}
          <aside className="material">
            <img src="/img/img-47d91167.jpg" alt="" />
            <div className="material-cuerpo">
              <span className="etiqueta et-verde">Material de preingreso</span>
              <Documento doc={DOCUMENTOS.guiaPreingreso} />
              <p className="nota-material">
                {ingreso?.correo && (
                  <>
                    Consultas sobre el preingreso: <a href={`mailto:${ingreso.correo}`}>{ingreso.correo}</a>
                    <br />
                  </>
                )}
                Consultas sobre el instituto: <Link to="/contacto">formulario de contacto de Bedelía</Link>
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
