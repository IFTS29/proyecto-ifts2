import { useEffect, useRef, useState } from "react";
import { useFormularioDeContenido } from "./formularioContenido.js";
import { useConfirmar } from "./Confirmacion.jsx";
import { QUITAR_CONVOCATORIA } from "../confirmaciones.js";

const MAX_ETAPAS = 6;
const MAX_PREGUNTAS = 10;
const ETAPA_NUEVA = { nombre: "", desde: "", hasta: "", detalle: "" };
const PREGUNTA_NUEVA = { pregunta: "", respuesta: "" };
const SIN_PREINSCRIPCION = { desde: "", hasta: "", detalle: "" };

// Lista de filas que se agregan, se quitan y se ordenan con las flechas. Cada fila lleva una clave propia
// para que React no mezcle los campos al moverlas. "prefijo" arma los id para llevar el foco a la fila nueva.
function useFilas(iniciales, prefijo) {
  const proxima = useRef(0);
  const conClave = (fila) => ({ ...fila, clave: proxima.current++ });
  const [filas, setFilas] = useState(() => iniciales.map(conClave));
  const [enfocar, setEnfocar] = useState(null);
  useEffect(() => {
    if (enfocar !== null) document.getElementById(`${prefijo}-${enfocar}`)?.focus();
  }, [enfocar, prefijo]);

  return {
    filas,
    valores: filas.map(({ clave, ...fila }) => fila),
    cambiar: (i, campo) => (e) => setFilas(filas.map((f, j) => (j === i ? { ...f, [campo]: e.target.value } : f))),
    quitar: (i) => setFilas(filas.filter((_, j) => j !== i)),
    mover: (i, paso) => {
      const nuevas = [...filas];
      [nuevas[i], nuevas[i + paso]] = [nuevas[i + paso], nuevas[i]];
      setFilas(nuevas);
    },
    vaciar: () => setFilas([]),
    agregar: (vacia) => {
      const nueva = conClave(vacia);
      setFilas([...filas, nueva]);
      setEnfocar(nueva.clave);
    },
  };
}

const Icono = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d={d} />
  </svg>
);

// Subir, bajar y quitar una fila. "nombre" completa la etiqueta para lectores de pantalla («la etapa 2»).
function AccionesDeFila({ i, total, nombre, deshabilitado, mover, quitar }) {
  return (
    <div className="acciones-fila">
      <button
        className="boton-icono"
        type="button"
        aria-label={`Subir ${nombre}`}
        title="Subir"
        disabled={deshabilitado || i === 0}
        onClick={() => mover(i, -1)}
      >
        <Icono d="M12 19V5M5 12l7-7 7 7" />
      </button>
      <button
        className="boton-icono"
        type="button"
        aria-label={`Bajar ${nombre}`}
        title="Bajar"
        disabled={deshabilitado || i === total - 1}
        onClick={() => mover(i, 1)}
      >
        <Icono d="M12 5v14M19 12l-7 7-7-7" />
      </button>
      <button
        className="boton-icono peligro"
        type="button"
        aria-label={`Quitar ${nombre}`}
        title="Quitar"
        disabled={deshabilitado}
        onClick={() => quitar(i)}
      >
        <Icono d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
      </button>
    </div>
  );
}

// Ingreso: la convocatoria vigente (nombre, preinscripción y demás etapas), las preguntas frecuentes y el
// correo de consultas. Se ve en /ingreso en cuanto se guarda.
export default function FormIngreso({ seccion, alGuardar, alCambiarSucio, alCambiarOcupado }) {
  const [inicial] = useState(() => seccion.datos);
  const [convocatoria, setConvocatoria] = useState(inicial.convocatoria);
  const [pre, setPre] = useState(inicial.preinscripcion);
  const [correo, setCorreo] = useState(inicial.correo);
  const etapas = useFilas(inicial.etapas, "etapa-nombre");
  const preguntas = useFilas(inicial.preguntas, "pregunta-texto");

  const { error, guardando, guardar } = useFormularioDeContenido({
    datos: { convocatoria, preinscripcion: pre, etapas: etapas.valores, preguntas: preguntas.valores, correo },
    inicial,
    alGuardar,
    alCambiarSucio,
    alCambiarOcupado,
  });
  const cambiarPre = (campo) => (e) => setPre({ ...pre, [campo]: e.target.value });

  // Retirar la convocatoria de una vez (el servidor no acepta fechas sin nombre de convocatoria).
  // Solo cambia el formulario: se publica al guardar, como el resto de los cambios.
  const confirmar = useConfirmar();
  const hayConvocatoria = Boolean(convocatoria || pre.desde || pre.hasta || pre.detalle || etapas.filas.length);
  const quitarConvocatoria = async () => {
    if (!(await confirmar(QUITAR_CONVOCATORIA))) return;
    setConvocatoria("");
    setPre(SIN_PREINSCRIPCION);
    etapas.vaciar();
  };

  return (
    <form noValidate onSubmit={guardar}>
      {/* Mientras se guarda no se puede editar: lo escrito se perdería al rearmar el formulario. */}
      <fieldset className="campos-formulario" disabled={guardando}>
        <div className="campo">
          <label htmlFor="i-convocatoria">Convocatoria</label>
          <input
            id="i-convocatoria"
            maxLength={60}
            value={convocatoria}
            onChange={(e) => setConvocatoria(e.target.value)}
          />
          <span className="ayuda">
            Por ejemplo: 1.º cuatrimestre 2027. Si queda vacía, el sitio muestra «Fechas a confirmar». Cuando pasan
            todas las fechas cargadas, el sitio la muestra como convocatoria anterior, de referencia, hasta que se
            cargue una nueva.
          </span>
        </div>

        <fieldset className="fila-persona">
          <legend>Preinscripción</legend>
          <div className="fila">
            <div className="campo">
              <label htmlFor="i-pre-desde">Desde</label>
              <input id="i-pre-desde" type="date" value={pre.desde} onChange={cambiarPre("desde")} />
            </div>
            <div className="campo">
              <label htmlFor="i-pre-hasta">Hasta</label>
              <input id="i-pre-hasta" type="date" value={pre.hasta} onChange={cambiarPre("hasta")} />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="i-pre-detalle">Aclaración (opcional)</label>
            <textarea id="i-pre-detalle" rows={2} maxLength={300} value={pre.detalle} onChange={cambiarPre("detalle")} />
          </div>
          <p className="ayuda-formulario">
            Con estas fechas el sitio indica si la preinscripción es próxima, está abierta o finalizó.
          </p>
        </fieldset>

        <h3 className="subtitulo-formulario">Otras etapas</h3>
        {etapas.filas.map((f, i) => (
          <fieldset className="fila-persona" key={f.clave}>
            <legend>Etapa {i + 1}</legend>
            <div className="campo">
              <label htmlFor={`etapa-nombre-${f.clave}`}>Nombre</label>
              <input
                id={`etapa-nombre-${f.clave}`}
                maxLength={60}
                value={f.nombre}
                onChange={etapas.cambiar(i, "nombre")}
              />
            </div>
            <div className="fila">
              <div className="campo">
                <label htmlFor={`etapa-desde-${f.clave}`}>Desde</label>
                <input id={`etapa-desde-${f.clave}`} type="date" value={f.desde} onChange={etapas.cambiar(i, "desde")} />
              </div>
              <div className="campo">
                <label htmlFor={`etapa-hasta-${f.clave}`}>Hasta (opcional)</label>
                <input id={`etapa-hasta-${f.clave}`} type="date" value={f.hasta} onChange={etapas.cambiar(i, "hasta")} />
              </div>
            </div>
            <p className="ayuda-formulario">Sin fecha de cierre, el sitio muestra «A partir del…».</p>
            <div className="campo">
              <label htmlFor={`etapa-detalle-${f.clave}`}>Aclaración (opcional)</label>
              <textarea
                id={`etapa-detalle-${f.clave}`}
                rows={2}
                maxLength={300}
                value={f.detalle}
                onChange={etapas.cambiar(i, "detalle")}
              />
            </div>
            <AccionesDeFila
              i={i}
              total={etapas.filas.length}
              nombre={`la etapa ${i + 1}`}
              deshabilitado={guardando}
              mover={etapas.mover}
              quitar={etapas.quitar}
            />
          </fieldset>
        ))}
        <button
          className="boton boton-linea boton-chico"
          type="button"
          disabled={guardando || etapas.filas.length >= MAX_ETAPAS}
          onClick={() => etapas.agregar(ETAPA_NUEVA)}
        >
          Agregar etapa
        </button>
        <p className="ayuda-formulario">
          Hasta {MAX_ETAPAS} etapas además de la preinscripción (curso, examen, confirmación de vacantes, inicio de
          clases). En el sitio se muestran en este orden.
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

        <h3 className="subtitulo-formulario">Preguntas frecuentes</h3>
        {preguntas.filas.map((f, i) => (
          <fieldset className="fila-persona" key={f.clave}>
            <legend>Pregunta {i + 1}</legend>
            <div className="campo">
              <label htmlFor={`pregunta-texto-${f.clave}`}>Pregunta</label>
              <input
                id={`pregunta-texto-${f.clave}`}
                maxLength={150}
                value={f.pregunta}
                onChange={preguntas.cambiar(i, "pregunta")}
              />
            </div>
            <div className="campo">
              <label htmlFor={`pregunta-respuesta-${f.clave}`}>Respuesta</label>
              <textarea
                id={`pregunta-respuesta-${f.clave}`}
                rows={3}
                maxLength={600}
                value={f.respuesta}
                onChange={preguntas.cambiar(i, "respuesta")}
              />
            </div>
            <AccionesDeFila
              i={i}
              total={preguntas.filas.length}
              nombre={`la pregunta ${i + 1}`}
              deshabilitado={guardando}
              mover={preguntas.mover}
              quitar={preguntas.quitar}
            />
          </fieldset>
        ))}
        <button
          className="boton boton-linea boton-chico"
          type="button"
          disabled={guardando || preguntas.filas.length >= MAX_PREGUNTAS}
          onClick={() => preguntas.agregar(PREGUNTA_NUEVA)}
        >
          Agregar pregunta
        </button>
        <p className="ayuda-formulario">Hasta {MAX_PREGUNTAS} preguntas.</p>

        <div className="campo">
          <label htmlFor="i-correo">Correo de consultas del preingreso (opcional)</label>
          <input id="i-correo" type="email" maxLength={150} value={correo} onChange={(e) => setCorreo(e.target.value)} />
          <span className="ayuda">Si queda vacío, no se muestra en el sitio.</span>
        </div>
      </fieldset>

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
