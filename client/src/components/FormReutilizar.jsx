import { useEffect, useState } from "react";
import { codigoPeriodo, textoPeriodo } from "../academica.js";

// Elige de qué período traer las materias. Sugiere el mismo cuatrimestre del año anterior;
// si no existe, el más reciente. Solo ofrece períodos con materias cargadas.
export default function FormReutilizar({ destino, periodos, alConfirmar, alCancelar, alCambiarOcupado }) {
  const opciones = periodos.filter((p) => p.materias > 0 && p.periodo !== codigoPeriodo(destino));
  const sugerido = codigoPeriodo({ cicloLectivo: destino.cicloLectivo - 1, cuatrimestre: destino.cuatrimestre });
  const [origen, setOrigen] = useState(
    () => (opciones.find((p) => p.periodo === sugerido) ?? opciones[0])?.periodo ?? "",
  );
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const elegido = opciones.find((p) => p.periodo === origen);

  // Mientras reutiliza, la ventana no se puede cerrar.
  useEffect(() => {
    alCambiarOcupado(enviando);
    return () => alCambiarOcupado(false);
  }, [enviando, alCambiarOcupado]);

  if (opciones.length === 0) {
    return (
      <>
        <p>No hay otros períodos con horarios cargados. Agregá las materias con "+ Agregar materia".</p>
        <div className="acciones">
          <button className="boton boton-linea" type="button" onClick={alCancelar}>
            Cerrar
          </button>
        </div>
      </>
    );
  }

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await alConfirmar(origen);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <form noValidate onSubmit={enviar}>
      <div className="campo">
        <label htmlFor="r-origen">Traer las materias del</label>
        <select id="r-origen" value={origen} onChange={(e) => setOrigen(e.target.value)}>
          {opciones.map((p) => (
            <option key={p.periodo} value={p.periodo}>
              {textoPeriodo(p)} ({p.materias} {p.materias === 1 ? "materia" : "materias"})
            </option>
          ))}
        </select>
      </div>
      <p>
        Se van a agregar al <strong>{textoPeriodo(destino)}</strong> las materias del {textoPeriodo(elegido)} que
        todavía no estén cargadas. Después podés corregirlas. <strong>No se publica nada.</strong>
      </p>
      <p className={"aviso" + (error ? " visible error" : "")} role="alert">
        {error}
      </p>
      <div className="acciones">
        <button className="boton boton-verde" type="submit" disabled={enviando}>
          {enviando ? "Reutilizando…" : "Reutilizar horarios"}
        </button>
        <button className="boton boton-linea" type="button" disabled={enviando} onClick={alCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}