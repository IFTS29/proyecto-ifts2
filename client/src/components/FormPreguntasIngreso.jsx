import { useEffect, useId, useState } from "react";
import { useFormularioDeContenido } from "./formularioContenido.js";
import { useConfirmar } from "./Confirmacion.jsx";
import FilaPlegable from "./FilaPlegable.jsx";
import { filaDelError, useFilas } from "./useFilas.js";
import { quitarPregunta } from "../confirmaciones.js";

const MAX_PREGUNTAS = 10;
const PREGUNTA_NUEVA = { pregunta: "", respuesta: "" };

// Preguntas frecuentes de Ingreso. Casi no cambian entre convocatorias, así que se guardan aparte: guardar
// las preguntas no toca la convocatoria, y al revés. Cada pregunta va plegada; al tocarla se edita.
export default function FormPreguntasIngreso({ seccion, alGuardar, alCambiarSucio, alCambiarOcupado }) {
  const id = useId();
  const [inicial] = useState(() => ({
    preguntas: (seccion.datos.preguntas ?? []).map((p) => ({
      pregunta: p.pregunta ?? "",
      respuesta: p.respuesta ?? "",
    })),
  }));
  const preguntas = useFilas(inicial.preguntas, `${id}-pregunta`);

  const { error, guardando, guardar } = useFormularioDeContenido({
    datos: { preguntas: preguntas.valores },
    inicial,
    alGuardar,
    alCambiarSucio,
    alCambiarOcupado,
  });

  const conError = filaDelError(error, "Pregunta", preguntas.filas, ["pregunta", "respuesta"]);
  const { abrir } = preguntas;
  useEffect(() => {
    if (conError !== null) abrir(conError);
  }, [conError, abrir]);

  const confirmar = useConfirmar();
  const quitar = async (i) => {
    if (await confirmar(quitarPregunta(preguntas.filas[i].pregunta.trim()))) preguntas.quitar(i);
  };

  return (
    <form noValidate onSubmit={guardar}>
      <fieldset className="campos-formulario" disabled={guardando}>
        <p className="ayuda-formulario">
          Se muestran en la página de Ingreso, en este orden. Conviene que las respuestas sean generales y no
          dependan de una convocatoria: las fechas van en «Ingreso: convocatoria».
        </p>
        {preguntas.filas.length === 0 ? (
          <p className="lista-vacia">No hay preguntas cargadas. La sección no se muestra en el sitio.</p>
        ) : (
          <ol className="filas-plegables">
            {preguntas.filas.map((f, i) => (
              <FilaPlegable
                key={f.clave}
                id={`${id}-fila-${f.clave}`}
                numero={i + 1}
                titulo={f.pregunta.trim() || "Pregunta sin completar"}
                nombre={`la pregunta ${i + 1}`}
                abierta={preguntas.estaAbierta(f.clave)}
                alternar={() => preguntas.alternar(f.clave)}
                esPrimera={i === 0}
                esUltima={i === preguntas.filas.length - 1}
                mover={(paso) => preguntas.mover(i, paso)}
                quitar={() => quitar(i)}
                error={conError === f.clave ? error : ""}
              >
                <div className="campo">
                  <label htmlFor={`${id}-pregunta-${f.clave}`}>Pregunta</label>
                  <input
                    id={`${id}-pregunta-${f.clave}`}
                    maxLength={150}
                    value={f.pregunta}
                    onChange={preguntas.cambiar(i, "pregunta")}
                  />
                </div>
                <div className="campo">
                  <label htmlFor={`${id}-respuesta-${f.clave}`}>Respuesta</label>
                  <textarea
                    id={`${id}-respuesta-${f.clave}`}
                    rows={4}
                    maxLength={600}
                    value={f.respuesta}
                    onChange={preguntas.cambiar(i, "respuesta")}
                  />
                </div>
              </FilaPlegable>
            ))}
          </ol>
        )}
        <button
          className="boton boton-linea boton-chico"
          type="button"
          disabled={preguntas.filas.length >= MAX_PREGUNTAS}
          onClick={() => preguntas.agregar(PREGUNTA_NUEVA)}
        >
          Agregar pregunta
        </button>
        <p className="ayuda-formulario">Hasta {MAX_PREGUNTAS} preguntas.</p>
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
