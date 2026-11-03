import { useEffect, useId, useState } from "react";
import { useFormularioDeContenido } from "./formularioContenido.js";
import { useConfirmar } from "./Confirmacion.jsx";
import FilaPlegable from "./FilaPlegable.jsx";
import HistorialConvocatorias from "./HistorialConvocatorias.jsx";
import { filaDelError, useFilas } from "./useFilas.js";
import { QUITAR_CONVOCATORIA, prepararConvocatoria, quitarEtapa } from "../confirmaciones.js";
import { ENLACES } from "../enlaces.js";
import {
  aniosDeConvocatoria,
  etapaNueva,
  normalizarIngreso,
  partesDeConvocatoria,
  pideConfirmarConvocatoriaNueva,
  textoDeConvocatoria,
  textoDeRango,
  vaciarConvocatoria,
} from "../ingreso.js";

const MAX_ETAPAS = 6;
const CAMPOS_DE_ETAPA = ["nombre", "desde", "hasta", "detalle", "textoEnlace", "urlEnlace"];

// Sugerencias para los enlaces de las etapas (se pueden escribir otros).
const SUGERENCIAS_DE_TEXTO = ["SIU Guaraní", "Aula virtual"];
const SUGERENCIAS_DE_DIRECCION = [ENLACES.preinscripcion, ENLACES.siuAlumnos, ENLACES.aulasVirtuales];

// Resumen de la fila plegada: las fechas o «Sin fechas».
const fechasDe = (etapa) => (etapa.desde ? textoDeRango(etapa) : "Sin fechas");

// Ingreso: la convocatoria (cuatrimestre y año, preinscripción, etapas, video y correo de consultas). Las preguntas
// frecuentes se editan en su propia sección. Se ve en /ingreso en cuanto se guarda.
export default function FormIngreso({ seccion, alGuardar, alCambiarSucio, alCambiarOcupado }) {
  const id = useId();
  const [inicial] = useState(() => normalizarIngreso(seccion.datos));
  const guardada = partesDeConvocatoria(inicial.convocatoria);
  const [cuatrimestre, setCuatrimestre] = useState(guardada.cuatrimestre);
  const [anio, setAnio] = useState(guardada.anio);
  const [pre, setPre] = useState(inicial.preinscripcion);
  const [video, setVideo] = useState(inicial.video);
  const [correo, setCorreo] = useState(inicial.correo);
  const etapas = useFilas(inicial.etapas, `${id}-etapa-nombre`);
  const anios = aniosDeConvocatoria(undefined, guardada.anio);
  // Una convocatoria guardada antes a mano, con otro formato: se avisa para elegirla de nuevo.
  const formatoViejo = inicial.convocatoria && !guardada.anio ? inicial.convocatoria : "";

  const datos = {
    convocatoria: textoDeConvocatoria(cuatrimestre, anio),
    preinscripcion: pre,
    etapas: etapas.valores,
    video,
    correo,
  };
  const { error, guardando, guardar } = useFormularioDeContenido({
    datos,
    inicial,
    alGuardar,
    alCambiarSucio,
    alCambiarOcupado,
    validar: () =>
      Boolean(cuatrimestre) !== Boolean(anio) ? "Elegir el cuatrimestre y el año de la convocatoria." : "",
  });
  const cambiarPre = (campo) => (e) => setPre({ ...pre, [campo]: e.target.value });

  // Si el error es de una etapa plegada, se despliega para mostrarlo junto a sus campos.
  const etapaConError = filaDelError(error, "Etapa", etapas.filas, CAMPOS_DE_ETAPA);
  const { abrir } = etapas;
  useEffect(() => {
    if (etapaConError !== null) abrir(etapaConError);
  }, [etapaConError, abrir]);
  const errorDePre = /^Preinscripción: /.test(error);

  const confirmar = useConfirmar();
  // Vacía fechas, video y enlaces en el formulario; se publica al guardar.
  const vaciar = () => {
    const vacia = vaciarConvocatoria(datos);
    setPre(vacia.preinscripcion);
    setVideo(vacia.video);
    etapas.reemplazar(vacia.etapas);
  };

  // Pasar a otra convocatoria con fechas, video o enlaces cargados prepara una nueva, previa confirmación, durante
  // toda la edición. Si se cancela, los desplegables vuelven a lo que tenían.
  const elegirConvocatoria = async (nuevoCuatrimestre, nuevoAnio) => {
    const actual = datos.convocatoria || inicial.convocatoria;
    const nueva = textoDeConvocatoria(nuevoCuatrimestre, nuevoAnio);
    if (pideConfirmarConvocatoriaNueva({ actual: datos.convocatoria, guardada: inicial.convocatoria, nueva, datos })) {
      if (!(await confirmar(prepararConvocatoria(actual, nueva)))) return;
      vaciar();
    }
    setCuatrimestre(nuevoCuatrimestre);
    setAnio(nuevoAnio);
  };

  const quitar = async (i) => {
    if (await confirmar(quitarEtapa(etapas.filas[i].nombre.trim()))) etapas.quitar(i);
  };

  // Vacía cuatrimestre, año, fechas, video y enlaces; conserva nombres y aclaraciones. Se publica al guardar.
  const hayConvocatoria = Boolean(
    cuatrimestre || anio || video || [pre, ...etapas.valores].some((e) => e.desde || e.hasta),
  );
  const quitarConvocatoria = async () => {
    if (!(await confirmar(QUITAR_CONVOCATORIA))) return;
    setCuatrimestre("");
    setAnio("");
    vaciar();
  };

  return (
    <form noValidate onSubmit={guardar}>
      {/* Mientras se guarda no se puede editar: lo escrito se perdería al rearmar el formulario. */}
      <fieldset className="campos-formulario" disabled={guardando}>
        <section className="bloque-formulario" aria-labelledby={`${id}-t-conv`}>
          <h3 id={`${id}-t-conv`} className="subtitulo-formulario">
            Convocatoria
          </h3>
          <div className="fila">
            <div className="campo">
              <label htmlFor={`${id}-cuatrimestre`}>Cuatrimestre</label>
              <select
                id={`${id}-cuatrimestre`}
                value={cuatrimestre}
                onChange={(e) => elegirConvocatoria(e.target.value, anio)}
              >
                <option value="">Sin elegir</option>
                <option value="1">1.º cuatrimestre</option>
                <option value="2">2.º cuatrimestre</option>
              </select>
            </div>
            <div className="campo">
              <label htmlFor={`${id}-anio`}>Año</label>
              <select id={`${id}-anio`} value={anio} onChange={(e) => elegirConvocatoria(cuatrimestre, e.target.value)}>
                <option value="">Sin elegir</option>
                {anios.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {formatoViejo && (
            <p className="ayuda-formulario aviso-formato">
              La convocatoria guardada («{formatoViejo}») no tiene el formato de los desplegables: elegir el
              cuatrimestre y el año.
            </p>
          )}
          <p className="ayuda-formulario">
            Sin cuatrimestre ni año, el sitio muestra «Fechas a confirmar» y las etapas quedan como modelo para la
            próxima convocatoria. Cuando pasan todas las fechas cargadas, el sitio la muestra como convocatoria
            anterior, de referencia, hasta que se cargue una nueva. Al elegir otro cuatrimestre o año, se borran las
            fechas, el video y los enlaces de la convocatoria guardada.
          </p>
          {hayConvocatoria && (
            <button
              className="boton boton-linea boton-chico boton-cancelar quitar-convocatoria"
              type="button"
              onClick={quitarConvocatoria}
            >
              Quitar convocatoria
            </button>
          )}
        </section>

        <section className={"bloque-formulario" + (errorDePre ? " con-error" : "")} aria-labelledby={`${id}-t-pre`}>
          <h3 id={`${id}-t-pre`} className="subtitulo-formulario">
            Preinscripción
          </h3>
          <div className="fila">
            <div className="campo">
              <label htmlFor={`${id}-pre-desde`}>Desde</label>
              <input id={`${id}-pre-desde`} type="date" value={pre.desde} onChange={cambiarPre("desde")} />
            </div>
            <div className="campo">
              <label htmlFor={`${id}-pre-hasta`}>Hasta</label>
              <input id={`${id}-pre-hasta`} type="date" value={pre.hasta} onChange={cambiarPre("hasta")} />
            </div>
          </div>
          <div className="campo">
            <label htmlFor={`${id}-pre-detalle`}>Aclaración (opcional)</label>
            <textarea
              id={`${id}-pre-detalle`}
              rows={2}
              maxLength={300}
              value={pre.detalle}
              onChange={cambiarPre("detalle")}
            />
          </div>
          <p className="ayuda-formulario">
            Con estas fechas el sitio indica si la preinscripción es próxima, está abierta o finalizó. Mientras
            está abierta, el sitio muestra el enlace a la preinscripción en SIU Guaraní.
          </p>
          {errorDePre && <p className="error-fila">{error}</p>}
        </section>

        <section className="bloque-formulario" aria-labelledby={`${id}-t-etapas`}>
          <h3 id={`${id}-t-etapas`} className="subtitulo-formulario">
            Otras etapas
          </h3>
          {etapas.filas.length === 0 ? (
            <p className="lista-vacia">No hay etapas cargadas.</p>
          ) : (
            <ol className="filas-plegables">
              {etapas.filas.map((f, i) => (
                <FilaPlegable
                  key={f.clave}
                  id={`${id}-etapa-${f.clave}`}
                  numero={i + 1}
                  titulo={f.nombre.trim() || "Etapa sin nombre"}
                  resumen={fechasDe(f)}
                  nombre={`la etapa ${i + 1}`}
                  abierta={etapas.estaAbierta(f.clave)}
                  alternar={() => etapas.alternar(f.clave)}
                  esPrimera={i === 0}
                  esUltima={i === etapas.filas.length - 1}
                  mover={(paso) => etapas.mover(i, paso)}
                  quitar={() => quitar(i)}
                  error={etapaConError === f.clave ? error : ""}
                >
                  <div className="campo">
                    <label htmlFor={`${id}-etapa-nombre-${f.clave}`}>Nombre</label>
                    <input
                      id={`${id}-etapa-nombre-${f.clave}`}
                      maxLength={60}
                      value={f.nombre}
                      onChange={etapas.cambiar(i, "nombre")}
                    />
                  </div>
                  <div className="fila">
                    <div className="campo">
                      <label htmlFor={`${id}-etapa-desde-${f.clave}`}>Desde</label>
                      <input
                        id={`${id}-etapa-desde-${f.clave}`}
                        type="date"
                        value={f.desde}
                        onChange={etapas.cambiar(i, "desde")}
                      />
                    </div>
                    <div className="campo">
                      <label htmlFor={`${id}-etapa-hasta-${f.clave}`}>Hasta (opcional)</label>
                      <input
                        id={`${id}-etapa-hasta-${f.clave}`}
                        type="date"
                        value={f.hasta}
                        onChange={etapas.cambiar(i, "hasta")}
                      />
                    </div>
                  </div>
                  <p className="ayuda-formulario">Sin fecha de cierre, el sitio muestra «A partir del…».</p>
                  <div className="campo">
                    <label htmlFor={`${id}-etapa-detalle-${f.clave}`}>Aclaración (opcional)</label>
                    <textarea
                      id={`${id}-etapa-detalle-${f.clave}`}
                      rows={2}
                      maxLength={300}
                      value={f.detalle}
                      onChange={etapas.cambiar(i, "detalle")}
                    />
                  </div>
                  <div className="fila">
                    <div className="campo">
                      <label htmlFor={`${id}-etapa-texto-${f.clave}`}>Texto del enlace (opcional)</label>
                      <input
                        id={`${id}-etapa-texto-${f.clave}`}
                        maxLength={60}
                        list={`${id}-textos`}
                        value={f.textoEnlace}
                        onChange={etapas.cambiar(i, "textoEnlace")}
                      />
                    </div>
                    <div className="campo">
                      <label htmlFor={`${id}-etapa-url-${f.clave}`}>Dirección del enlace</label>
                      <input
                        id={`${id}-etapa-url-${f.clave}`}
                        type="url"
                        maxLength={300}
                        placeholder="https://"
                        list={`${id}-direcciones`}
                        value={f.urlEnlace}
                        onChange={etapas.cambiar(i, "urlEnlace")}
                      />
                    </div>
                  </div>
                  <p className="ayuda-formulario">
                    Por ejemplo, el aula virtual del curso de ingreso. Se muestra debajo de la etapa mientras la
                    convocatoria está vigente y se borra al preparar la próxima.
                  </p>
                </FilaPlegable>
              ))}
            </ol>
          )}
          <datalist id={`${id}-textos`}>
            {SUGERENCIAS_DE_TEXTO.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <datalist id={`${id}-direcciones`}>
            {SUGERENCIAS_DE_DIRECCION.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          <button
            className="boton boton-linea boton-chico"
            type="button"
            disabled={etapas.filas.length >= MAX_ETAPAS}
            onClick={() => etapas.agregar(etapaNueva())}
          >
            Agregar etapa
          </button>
          <p className="ayuda-formulario">
            Hasta {MAX_ETAPAS} etapas además de la preinscripción. En el sitio se muestran en este orden.
          </p>
        </section>

        <section className="bloque-formulario" aria-labelledby={`${id}-t-video`}>
          <h3 id={`${id}-t-video`} className="subtitulo-formulario">
            Video (opcional)
          </h3>
          <div className="campo">
            <label htmlFor={`${id}-video`}>Dirección del video de YouTube</label>
            <input
              id={`${id}-video`}
              type="url"
              maxLength={300}
              placeholder="https://www.youtube.com/watch?v=…"
              value={video}
              onChange={(e) => setVideo(e.target.value)}
            />
            <span className="ayuda">
              Se muestra debajo de las etapas, con un enlace para verlo en YouTube. Si queda vacío, no se muestra.
            </span>
          </div>
        </section>

        <section className="bloque-formulario" aria-labelledby={`${id}-t-correo`}>
          <h3 id={`${id}-t-correo`} className="subtitulo-formulario">
            Correo de consultas
          </h3>
          <div className="campo">
            <label htmlFor={`${id}-correo`}>Correo de consultas del preingreso (opcional)</label>
            <input
              id={`${id}-correo`}
              type="email"
              maxLength={150}
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
            <span className="ayuda">Si queda vacío, no se muestra en el sitio.</span>
          </div>
        </section>
      </fieldset>

      {/* Fuera del fieldset: es de consulta y no se guarda con el formulario. */}
      <HistorialConvocatorias />

      <p className={"aviso" + (error ? " visible error" : "")} role="alert">
        {error}
      </p>
      <div className="acciones">
        <button className="boton boton-verde" type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
