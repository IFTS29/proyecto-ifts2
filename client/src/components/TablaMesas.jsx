import { textoAnio, textoFechaDeMesa, textoHoraDeMesa } from "../mesas.js";

const vacio = (texto) => texto || "—";

// Tabla de edición de las mesas de un llamado (datos de trabajo), en el orden que les da el servidor:
// por fecha y hora (las que no tienen van al final), año y materia. La materia va primera, como en horarios.
// Mientras se procesa otra operación ("ocupado"), editar y eliminar quedan deshabilitados.
export default function TablaMesas({ mesas, ocupado, alEditar, alEliminar }) {
  return (
    <div className="tabla-caja">
      <table>
        <thead>
          <tr>
            <th scope="col">Materia</th>
            <th scope="col">Año</th>
            <th scope="col">Fecha</th>
            <th scope="col">Hora</th>
            <th scope="col">Mesa examinadora</th>
            <th scope="col">Aula</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {mesas.map((m) => (
            <tr key={m.id}>
              <th scope="row">{m.materia}</th>
              <td>{textoAnio(m.anioCarrera)}</td>
              <td className="sin-corte">{textoFechaDeMesa(m.fecha)}</td>
              <td className="sin-corte">{textoHoraDeMesa(m.hora)}</td>
              <td>{vacio(m.tribunal)}</td>
              <td>{vacio(m.aula)}</td>
              <td>
                <div className="acciones-fila">
                  <button
                    className="boton-icono"
                    type="button"
                    aria-label={`Editar la mesa de ${m.materia}`}
                    title="Editar"
                    disabled={ocupado}
                    onClick={() => alEditar(m)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                    </svg>
                  </button>
                  <button
                    className="boton-icono peligro"
                    type="button"
                    aria-label={`Eliminar la mesa de ${m.materia}`}
                    title="Eliminar"
                    disabled={ocupado}
                    onClick={() => alEliminar(m)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
