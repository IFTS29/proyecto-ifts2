import { avisoDelLlamado, textoAnio, textoFechaDeMesa, textoFechasDelLlamado, textoHoraDeMesa } from "../mesas.js";

// Un llamado de mesas de examen tal como lo ven los alumnos: nombre, fechas generales, aviso y tabla.
// Un llamado sin mesas (un anuncio) no muestra la tabla. Lo que falta se muestra "A confirmar".
// Lo usan la página de Alumnos (lo publicado) y la vista previa del panel (los datos de trabajo).
// "accion" (opcional) va debajo, por ejemplo el enlace al PDF.
// En Alumnos, un turno que ya terminó sigue a la vista con «Turno finalizado» ("finalizado" lo calcula el servidor).
// La vista previa del panel no lo recibe.
export default function LlamadoPublico({ llamado, accion }) {
  const fechas = textoFechasDelLlamado(llamado);
  const aviso = avisoDelLlamado(llamado);
  const conTribunal = llamado.mesas.some((m) => m.tribunal);
  const conAula = llamado.mesas.some((m) => m.aula);

  return (
    <article className="llamado-publico">
      <h3>{llamado.nombre}</h3>
      {llamado.finalizado && (
        <div className="estado-terminado">
          <span className="etiqueta et-gris">Turno finalizado</span>
        </div>
      )}
      {fechas && <p className="fechas-llamado">{fechas}</p>}
      {aviso && <p className="aviso-llamado">{aviso}</p>}
      {llamado.mesas.length > 0 && (
        <div className="tabla-caja">
          <table>
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Hora</th>
                <th scope="col">Año</th>
                <th scope="col">Materia</th>
                {conTribunal && <th scope="col">Mesa examinadora</th>}
                {conAula && <th scope="col">Aula</th>}
              </tr>
            </thead>
            <tbody>
              {llamado.mesas.map((m) => (
                <tr key={m.id}>
                  <td className="sin-corte">{textoFechaDeMesa(m.fecha)}</td>
                  <td className="sin-corte">{textoHoraDeMesa(m.hora)}</td>
                  <td>{textoAnio(m.anioCarrera)}</td>
                  <td>{m.materia}</td>
                  {conTribunal && <td>{m.tribunal || "A confirmar"}</td>}
                  {conAula && <td className={m.aula ? undefined : "sin-corte"}>{m.aula || "A confirmar"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {accion}
    </article>
  );
}
