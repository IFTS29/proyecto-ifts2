import { avisoDelLlamado, textoAnio, textoFechaDeMesa, textoFechasDelLlamado, textoHoraDeMesa } from "../mesas.js";

// Un llamado de mesas de examen tal como lo ven los alumnos: nombre, fechas generales, aviso y tabla.
// Un llamado sin mesas (un anuncio) no muestra la tabla. Lo que falta se muestra "A confirmar".
// Lo usan la página de Alumnos (lo publicado) y la vista previa del panel (los datos de trabajo).
// "accion" (opcional) va debajo, por ejemplo el enlace al PDF.
// En Alumnos, un turno que ya terminó sigue a la vista con «Turno finalizado» ("finalizado" lo calcula el servidor).
// La vista previa del panel no lo recibe.
// En el celular cada mesa se muestra como una ficha (fecha y hora arriba, la materia y el resto debajo), sin
// desplazar la tabla a los costados (H-95). Los encabezados siguen en la tabla, ocultos solo a la vista, y los roles
// explícitos conservan la tabla para los lectores de pantalla aunque el CSS cambie cómo se dibuja.
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
          <table role="table">
            <thead role="rowgroup">
              <tr role="row">
                <th role="columnheader" scope="col">
                  Fecha
                </th>
                <th role="columnheader" scope="col">
                  Hora
                </th>
                <th role="columnheader" scope="col" className="col-anio">
                  Año
                </th>
                <th role="columnheader" scope="col">
                  Materia
                </th>
                {conTribunal && (
                  <th role="columnheader" scope="col">
                    Mesa examinadora
                  </th>
                )}
                {conAula && (
                  <th role="columnheader" scope="col">
                    Aula
                  </th>
                )}
              </tr>
            </thead>
            <tbody role="rowgroup">
              {llamado.mesas.map((m) => (
                // Sin fecha ni hora, la ficha del celular dice una sola vez «Fecha y hora a confirmar». Es solo
                // visual: los lectores de pantalla siguen leyendo las celdas Fecha y Hora por separado.
                <tr role="row" key={m.id} className={!m.fecha && !m.hora ? "sin-fecha-ni-hora" : undefined}>
                  <td role="cell" className="col-fecha sin-corte">
                    <span className="dato-celda">{textoFechaDeMesa(m.fecha)}</span>
                    {!m.fecha && !m.hora && (
                      <span className="fecha-hora-movil" aria-hidden="true">
                        Fecha y hora a confirmar
                      </span>
                    )}
                  </td>
                  <td role="cell" className="col-hora sin-corte">
                    {textoHoraDeMesa(m.hora)}
                  </td>
                  <td role="cell" className="col-anio">
                    {textoAnio(m.anioCarrera)}
                  </td>
                  <td role="cell" className="col-materia">
                    {m.materia}
                    {/* Solo a la vista en el celular: los lectores de pantalla ya leen la columna Año. */}
                    <span className="anio-movil" aria-hidden="true">
                      {textoAnio(m.anioCarrera)} año
                    </span>
                  </td>
                  {conTribunal && (
                    <td role="cell" className="col-detalle" data-etiqueta="Mesa examinadora">
                      {m.tribunal || "A confirmar"}
                    </td>
                  )}
                  {conAula && (
                    <td role="cell" className={"col-detalle" + (m.aula ? "" : " sin-corte")} data-etiqueta="Aula">
                      {m.aula || "A confirmar"}
                    </td>
                  )}
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
