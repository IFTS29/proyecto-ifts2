import { useEffect, useRef, useState } from "react";
import { DIAS, MATERIAS_DEL_PLAN, TURNOS, nombreDia } from "../academica.js";

// Una materia nueva: conserva el año y el turno de la anterior ("Guardar y agregar otra").
const materiaVacia = ({ anioCarrera = "1", turno = "noche" } = {}) => ({
  anioCarrera,
  turno,
  materia: "",
  profesor: "",
  aula: "",
  dias: [{ dia: "lunes", desde: "18:00", hasta: "20:00" }],
});

// Pasa una materia guardada al formato del formulario (los selects trabajan con texto).
const aFormulario = (h) => ({
  anioCarrera: String(h.anioCarrera),
  turno: h.turno,
  materia: h.materia,
  profesor: h.profesor,
  aula: h.aula,
  dias: h.dias.map((f) => ({ ...f })),
});

// Alta y edición de una materia del período (el período lo fija el panel). Las validaciones las hace el servidor:
// si algo no pasa, el mensaje se muestra sin perder lo escrito. Le avisa al panel si hay cambios sin guardar
// y mientras guarda, para que no se cierre en esos casos sin preguntar.
export default function FormHorario({
  periodo,
  horario,
  aulas,
  alGuardar,
  alTerminar,
  alCancelar,
  alCambiarSucio,
  alCambiarOcupado,
}) {
  const [inicial, setInicial] = useState(() => (horario ? aFormulario(horario) : materiaVacia()));
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

  const cambiarDia = (posicion, campo) => (e) =>
    setForm({
      ...form,
      dias: form.dias.map((f, i) => (i === posicion ? { ...f, [campo]: e.target.value } : f)),
    });

  // El día nuevo propone el siguiente al último, con el mismo horario. Se puede repetir un día con otra franja.
  const agregarDia = () => {
    const ultimo = form.dias.at(-1);
    const siguiente = DIAS[(DIAS.findIndex((d) => d.valor === ultimo.dia) + 1) % DIAS.length].valor;
    setForm({ ...form, dias: [...form.dias, { ...ultimo, dia: siguiente }] });
  };

  const quitarDia = (posicion) => setForm({ ...form, dias: form.dias.filter((_, i) => i !== posicion) });

  const guardar = async (yAgregarOtra) => {
    setError("");
    setGuardado("");
    setGuardando(true);
    try {
      const datos = { ...form, ...periodo, anioCarrera: Number(form.anioCarrera) };
      const materia = await alGuardar(datos);
      if (!yAgregarOtra) {
        setGuardando(false);
        return alTerminar();
      }
      const nueva = materiaVacia({ anioCarrera: form.anioCarrera, turno: form.turno });
      setInicial(nueva);
      setForm(nueva);
      setGuardado(`Se guardó «${materia.materia}». Podés cargar la siguiente.`);
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
      <div className="fila">
        <div className="campo">
          <label htmlFor="h-anio">Año de la carrera</label>
          <select id="h-anio" value={form.anioCarrera} onChange={cambiar("anioCarrera")}>
            <option value="1">1.° año</option>
            <option value="2">2.° año</option>
            <option value="3">3.° año</option>
          </select>
        </div>
        <div className="campo">
          <label htmlFor="h-turno">Turno</label>
          <select id="h-turno" value={form.turno} onChange={cambiar("turno")}>
            {TURNOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.texto}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="campo">
        <label htmlFor="h-materia">Materia</label>
        <input
          id="h-materia"
          ref={materiaRef}
          required
          maxLength={120}
          list="h-materias"
          value={form.materia}
          onChange={cambiar("materia")}
        />
        <datalist id="h-materias">
          {MATERIAS_DEL_PLAN.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <span className="ayuda">Al escribir aparecen las materias del plan de estudios.</span>
      </div>
      <div className="fila">
        <div className="campo">
          <label htmlFor="h-profesor">Docente (opcional)</label>
          <input id="h-profesor" maxLength={120} value={form.profesor} onChange={cambiar("profesor")} />
          <span className="ayuda">Si queda vacío, en el sitio figura "A designar".</span>
        </div>
        <div className="campo">
          <label htmlFor="h-aula">Aula (opcional)</label>
          <input id="h-aula" maxLength={40} list="h-aulas" value={form.aula} onChange={cambiar("aula")} />
          <datalist id="h-aulas">
            {aulas.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
          <span className="ayuda">Por ejemplo: Aula 2 o Cocina 1.</span>
        </div>
      </div>

      <fieldset className="dias-cursada">
        <legend>Días y horarios</legend>
        {form.dias.map((franja, i) => (
          <div className="dia-cursada" key={i}>
            <div className="campo">
              <label htmlFor={`h-dia-${i}`}>Día</label>
              <select id={`h-dia-${i}`} value={franja.dia} onChange={cambiarDia(i, "dia")}>
                {DIAS.map((d) => (
                  <option key={d.valor} value={d.valor}>
                    {d.texto}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor={`h-desde-${i}`}>Desde</label>
              <input id={`h-desde-${i}`} type="time" required value={franja.desde} onChange={cambiarDia(i, "desde")} />
            </div>
            <div className="campo">
              <label htmlFor={`h-hasta-${i}`}>Hasta</label>
              <input id={`h-hasta-${i}`} type="time" required value={franja.hasta} onChange={cambiarDia(i, "hasta")} />
            </div>
            {form.dias.length > 1 && (
              <button
                className="boton boton-linea boton-chico"
                type="button"
                aria-label={`Quitar ${nombreDia(franja.dia).toLowerCase()} de ${franja.desde} a ${franja.hasta}`}
                onClick={() => quitarDia(i)}
              >
                Quitar
              </button>
            )}
          </div>
        ))}
        <button className="boton boton-linea boton-chico" type="button" onClick={agregarDia}>
          Agregar otro día u horario
        </button>
      </fieldset>

      <p className={"aviso" + (error ? " visible error" : "")} role="alert">
        {error}
      </p>
      <div className="acciones">
        <button className="boton boton-verde" type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        {!horario && (
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