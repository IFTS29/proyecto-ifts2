import { useEffect, useRef, useState } from "react";
import { TITULOS_DE_GRUPO } from "../contenido.js";
import { useFormularioDeContenido } from "./formularioContenido.js";

const MAX_PERSONAS = 12;
const PERSONA_NUEVA = { nombre: "", cargo: "", detalle: "", grupo: "autoridades" };

// Autoridades y tutoría: una lista de personas que se agregan, se quitan y se ordenan con las flechas.
// En el sitio se muestran por grupo (primero Autoridades y después Tutoría), en este orden.
export default function FormPersonas({ seccion, alGuardar, alCambiarSucio, alCambiarOcupado }) {
  // Cada fila lleva una clave propia para que React no mezcle los campos al subir, bajar o quitar.
  const proximaClave = useRef(0);
  const conClave = (persona) => ({ ...persona, clave: proximaClave.current++ });
  const [inicial] = useState(() => seccion.datos.personas);
  const [filas, setFilas] = useState(() => inicial.map(conClave));

  const personas = filas.map(({ clave, ...persona }) => persona);
  const { error, guardando, guardar } = useFormularioDeContenido({
    datos: { personas },
    inicial: { personas: inicial },
    alGuardar,
    alCambiarSucio,
    alCambiarOcupado,
  });

  const cambiar = (i, campo) => (e) =>
    setFilas(filas.map((f, j) => (j === i ? { ...f, [campo]: e.target.value } : f)));
  const quitar = (i) => setFilas(filas.filter((_, j) => j !== i));
  const mover = (i, paso) => {
    const otra = i + paso;
    const nuevas = [...filas];
    [nuevas[i], nuevas[otra]] = [nuevas[otra], nuevas[i]];
    setFilas(nuevas);
  };

  // Al agregar una persona, el foco va a su nombre.
  const [enfocar, setEnfocar] = useState(null);
  useEffect(() => {
    if (enfocar !== null) document.getElementById(`persona-nombre-${enfocar}`)?.focus();
  }, [enfocar]);
  const agregar = () => {
    const nueva = conClave(PERSONA_NUEVA);
    setFilas([...filas, nueva]);
    setEnfocar(nueva.clave);
  };

  return (
    <form noValidate onSubmit={guardar}>
      {/* Mientras se guarda no se puede editar: lo escrito se perdería al rearmar el formulario. */}
      <fieldset className="campos-formulario" disabled={guardando}>
        {filas.map((f, i) => (
          <fieldset className="fila-persona" key={f.clave}>
            <legend>Persona {i + 1}</legend>
            <div className="fila">
              <div className="campo">
                <label htmlFor={`persona-nombre-${f.clave}`}>Nombre</label>
                <input
                  id={`persona-nombre-${f.clave}`}
                  maxLength={80}
                  value={f.nombre}
                  onChange={cambiar(i, "nombre")}
                />
              </div>
              <div className="campo">
                <label htmlFor={`persona-cargo-${f.clave}`}>Cargo</label>
                <input id={`persona-cargo-${f.clave}`} maxLength={80} value={f.cargo} onChange={cambiar(i, "cargo")} />
              </div>
            </div>
            <div className="fila">
              <div className="campo">
                <label htmlFor={`persona-grupo-${f.clave}`}>Se muestra en</label>
                <select id={`persona-grupo-${f.clave}`} value={f.grupo} onChange={cambiar(i, "grupo")}>
                  {Object.entries(TITULOS_DE_GRUPO).map(([valor, titulo]) => (
                    <option key={valor} value={valor}>
                      {titulo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label htmlFor={`persona-detalle-${f.clave}`}>Aclaración (opcional)</label>
                <input
                  id={`persona-detalle-${f.clave}`}
                  maxLength={160}
                  value={f.detalle}
                  onChange={cambiar(i, "detalle")}
                />
              </div>
            </div>
            <div className="acciones-fila">
              <button
                className="boton-icono"
                type="button"
                aria-label={`Subir a la persona ${i + 1}`}
                title="Subir"
                disabled={guardando || i === 0}
                onClick={() => mover(i, -1)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
              <button
                className="boton-icono"
                type="button"
                aria-label={`Bajar a la persona ${i + 1}`}
                title="Bajar"
                disabled={guardando || i === filas.length - 1}
                onClick={() => mover(i, 1)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
              </button>
              <button
                className="boton-icono peligro"
                type="button"
                aria-label={`Quitar a la persona ${i + 1}`}
                title="Quitar"
                disabled={guardando || filas.length === 1}
                onClick={() => quitar(i)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                </svg>
              </button>
            </div>
        </fieldset>
      ))}
      <button
        className="boton boton-linea boton-chico"
        type="button"
        disabled={guardando || filas.length >= MAX_PERSONAS}
        onClick={agregar}
      >
        Agregar persona
      </button>
      <p className="ayuda-formulario">
        Hasta {MAX_PERSONAS} personas. En el sitio se muestran primero las autoridades y después la tutoría, en este
        orden.
      </p>
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
