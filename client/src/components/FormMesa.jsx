import { useEffect, useRef, useState } from "react";
import { MATERIAS_DEL_PLAN } from "../academica.js";

// Una mesa nueva: conserva el año y la fecha de la anterior ("Guardar y agregar otra").
const mesaVacia = ({ anioCarrera = "1", fecha = "" } = {}) => ({
  anioCarrera,
  fecha,
  hora: "",
  materia: "",
  aula: "",
  tribunal: "",
});

// Pasa una mesa guardada al formato del formulario (los selects trabajan con texto).
const aFormulario = (m) => ({
  anioCarrera: String(m.anioCarrera),
  fecha: m.fecha,
  hora: m.hora,
  materia: m.materia,
  aula: m.aula,
  tribunal: m.tribunal,
});

// Alta y edición de una mesa del llamado. Solo la materia y el año son obligatorios: lo demás se puede
// completar después y en el sitio figura "A confirmar". Las validaciones las hace el servidor: si algo no pasa,
// el mensaje se muestra sin perder lo escrito. Avisa al panel si hay cambios sin guardar y mientras guarda.
export default function FormMesa({ mesa, aulas, alGuardar, alTerminar, alCancelar, alCambiarSucio, alCambiarOcupado }) {
  const [inicial, setInicial] = useState(() => (mesa ? aFormulario(mesa) : mesaVacia()));
  const [form, setForm] = useState(inicial);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState("");
  const [guardando, setGuardando] = useState(false);
  const materiaRef = useRef(null);

  const sucio = JSON.stringify(form) !== JSON.stringify(inicial);
  useEffect(() => {
    alCambiarSucio(sucio);
  }, [sucio, alCambiarSucio]);
  useEffect(() => {
    alCambiarOcupado(guardando);
    return () => alCambiarOcupado(false);
  }, [guardando, alCambiarOcupado]);

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const guardar = async (yAgregarOtra) => {
    setError("");
    setGuardado("");
    setGuardando(true);
    try {
      const guardada = await alGuardar({ ...form, anioCarrera: Number(form.anioCarrera) });
      if (!yAgregarOtra) {
        setGuardando(false);
        return alTerminar();
      }
      const nueva = mesaVacia({ anioCarrera: form.anioCarrera, fecha: form.fecha });
      setInicial(nueva);
      setForm(nueva);
      setGuardado(`Se guardó la mesa de «${guardada.materia}». Se puede cargar la siguiente.`);
      materiaRef.current?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        guardar(false);
      }}
    >
      <p className={"aviso" + (guardado ? " visible" : "")} role="status">
        {guardado}
      </p>
      <div className="campo">
        <label htmlFor="m-materia">Materia</label>
        <input
          id="m-materia"
          ref={materiaRef}
          required
          maxLength={120}
          list="m-materias"
          value={form.materia}
          onChange={cambiar("materia")}
        />
        <datalist id="m-materias">
          {MATERIAS_DEL_PLAN.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <span className="ayuda">Al escribir aparecen las materias del plan de estudios.</span>
      </div>
      <div className="fila">
        <div className="campo">
          <label htmlFor="m-anio">Año de la carrera</label>
          <select id="m-anio" value={form.anioCarrera} onChange={cambiar("anioCarrera")}>
            <option value="1">1.º año</option>
            <option value="2">2.º año</option>
            <option value="3">3.º año</option>
          </select>
        </div>
        <div className="campo">
          <label htmlFor="m-fecha">Fecha (opcional)</label>
          <input id="m-fecha" type="date" value={form.fecha} onChange={cambiar("fecha")} />
        </div>
      </div>
      <div className="fila">
        <div className="campo">
          <label htmlFor="m-hora">Hora (opcional)</label>
          <input id="m-hora" type="time" value={form.hora} onChange={cambiar("hora")} />
        </div>
        <div className="campo">
          <label htmlFor="m-aula">Aula (opcional)</label>
          <input id="m-aula" maxLength={40} list="m-aulas" value={form.aula} onChange={cambiar("aula")} />
          <datalist id="m-aulas">
            {aulas.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>
      </div>
      <p className="ayuda-formulario">Si la fecha o la hora quedan vacías, en el sitio figura "A confirmar".</p>
      <div className="campo">
        <label htmlFor="m-tribunal">Mesa examinadora (opcional)</label>
        <input id="m-tribunal" maxLength={200} value={form.tribunal} onChange={cambiar("tribunal")} />
        <span className="ayuda">Por ejemplo: Aguilar, Sboro y Saldías.</span>
      </div>

      <p className={"aviso" + (error ? " visible error" : "")} role="alert">
        {error}
      </p>
      <div className="acciones">
        <button className="boton boton-verde" type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        {!mesa && (
          <button className="boton boton-linea" type="button" disabled={guardando} onClick={() => guardar(true)}>
            Guardar y agregar otra
          </button>
        )}
        <button className="boton boton-linea" type="button" disabled={guardando} onClick={alCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
