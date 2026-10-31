import { useEffect, useState } from "react";
import { AVISO_POR_DEFECTO } from "../mesas.js";

const aFormulario = (llamado) => ({
  nombre: llamado?.nombre ?? "",
  desde: llamado?.desde ?? "",
  hasta: llamado?.hasta ?? "",
  aviso: llamado?.aviso ?? "",
});

// Alta y edición de los datos de un llamado. Solo el nombre es obligatorio.
// Siempre se mandan los cuatro campos: el servidor reemplaza los datos del llamado completos,
// así una fecha que se borra queda vacía.
export default function FormLlamado({ llamado, alGuardar, alTerminar, alCancelar, alCambiarSucio, alCambiarOcupado }) {
  const [inicial] = useState(() => aFormulario(llamado));
  const [form, setForm] = useState(inicial);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const sucio = JSON.stringify(form) !== JSON.stringify(inicial);
  useEffect(() => {
    alCambiarSucio(sucio);
  }, [sucio, alCambiarSucio]);
  useEffect(() => {
    alCambiarOcupado(guardando);
    return () => alCambiarOcupado(false);
  }, [guardando, alCambiarOcupado]);

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      await alGuardar(form);
      setGuardando(false);
      alTerminar();
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  return (
    <form noValidate onSubmit={guardar}>
      <div className="campo">
        <label htmlFor="l-nombre">Nombre del llamado</label>
        <input id="l-nombre" required maxLength={60} value={form.nombre} onChange={cambiar("nombre")} />
        <span className="ayuda">Por ejemplo: Febrero 2027.</span>
      </div>
      <div className="fila">
        <div className="campo">
          <label htmlFor="l-desde">Inicio (opcional)</label>
          <input id="l-desde" type="date" value={form.desde} onChange={cambiar("desde")} />
        </div>
        <div className="campo">
          <label htmlFor="l-hasta">Cierre (opcional)</label>
          <input id="l-hasta" type="date" value={form.hasta} onChange={cambiar("hasta")} />
        </div>
      </div>
      <div className="campo">
        <label htmlFor="l-aviso">Aviso para los alumnos (opcional)</label>
        <textarea id="l-aviso" maxLength={300} value={form.aviso} onChange={cambiar("aviso")} />
        <span className="ayuda">
          Por ejemplo, cómo inscribirse. Si el llamado se publica sin mesas y sin aviso, se muestra: «{AVISO_POR_DEFECTO}»
        </span>
      </div>

      <p className={"aviso" + (error ? " visible error" : "")} role="alert">
        {error}
      </p>
      <div className="acciones">
        <button className="boton boton-verde" type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button className="boton boton-linea" type="button" disabled={guardando} onClick={alCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
