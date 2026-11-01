import { useEffect, useState } from "react";
import { useFormularioDeContenido } from "./formularioContenido.js";

const MAX_PARRAFOS = 6;
const LARGO = 1000;

// Perfil del egresado: párrafos de texto, sin formato. Los párrafos vacíos se descartan al guardar.
export default function FormPerfil({ seccion, alGuardar, alCambiarSucio, alCambiarOcupado }) {
  const [inicial] = useState(() => seccion.datos.parrafos);
  const [parrafos, setParrafos] = useState(inicial);
  const { error, guardando, guardar } = useFormularioDeContenido({
    datos: { parrafos },
    inicial: { parrafos: inicial },
    alGuardar,
    alCambiarSucio,
    alCambiarOcupado,
  });

  const cambiar = (i) => (e) => setParrafos(parrafos.map((p, j) => (j === i ? e.target.value : p)));
  const quitar = (i) => setParrafos(parrafos.filter((_, j) => j !== i));

  // Al agregar un párrafo, el foco va al campo nuevo.
  const [enfocar, setEnfocar] = useState(null);
  useEffect(() => {
    if (enfocar !== null) document.getElementById(`perfil-${enfocar}`)?.focus();
  }, [enfocar]);
  const agregar = () => {
    setParrafos([...parrafos, ""]);
    setEnfocar(parrafos.length);
  };

  return (
    <form noValidate onSubmit={guardar}>
      {/* Mientras se guarda no se puede editar: lo escrito se perdería al rearmar el formulario. */}
      <fieldset className="campos-formulario" disabled={guardando}>
        {parrafos.map((parrafo, i) => (
          <div className="campo" key={i}>
            <div className="campo-con-accion">
              <label htmlFor={`perfil-${i}`}>Párrafo {i + 1}</label>
              <button
                className="boton-icono peligro"
                type="button"
                aria-label={`Quitar el párrafo ${i + 1}`}
                title="Quitar"
                disabled={guardando || parrafos.length === 1}
                onClick={() => quitar(i)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                </svg>
              </button>
            </div>
            <textarea id={`perfil-${i}`} maxLength={LARGO} value={parrafo} onChange={cambiar(i)} />
          </div>
        ))}
        <button
          className="boton boton-linea boton-chico"
          type="button"
          disabled={guardando || parrafos.length >= MAX_PARRAFOS}
          onClick={agregar}
        >
          Agregar párrafo
        </button>
        <p className="ayuda-formulario">Hasta {MAX_PARRAFOS} párrafos. El texto se muestra tal cual, sin formato.</p>
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
