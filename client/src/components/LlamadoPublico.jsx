import { useState } from "react";
import { OPCIONES_DE_ANIO, TODOS_LOS_ANIOS, anioInicial } from "../academica.js";
import { avisoDelLlamado, textoFechaDeMesa, textoFechasDelLlamado, textoHoraDeMesa } from "../mesas.js";

// Un llamado de mesas de examen tal como lo ven los alumnos: nombre, fechas generales, aviso y tabla.
// Un llamado sin mesas (un anuncio) no muestra la tabla. Lo que falta se muestra "A confirmar".
// Lo usan la página de Alumnos (lo publicado) y la vista previa del panel (los datos de trabajo).
// "accion" (opcional) va debajo, por ejemplo el enlace al PDF. "actualizado" (opcional) es la fecha de la última
// publicación, en el encabezado del llamado; la vista previa del panel no la recibe.
// En Alumnos, un turno que ya terminó sigue a la vista con «Turno finalizado» ("finalizado" lo calcula el servidor).
// La vista previa del panel no lo recibe.
// Como en los horarios, un botón por año de la carrera y «Todos los años»: al entrar se ve el primer año con mesas.
// Con «Todos los años», cada año va en su propio <tbody>, encabezado por una fila con su nombre; dentro de cada año,
// las mesas siguen ordenadas por fecha y hora. El PDF del llamado tiene siempre todas las mesas.
// En el celular cada mesa se muestra como una ficha (fecha y hora arriba, la materia y el resto debajo), sin
// desplazar la tabla a los costados (H-95). Los encabezados siguen en la tabla, ocultos solo a la vista, y los roles
// explícitos conservan la tabla para los lectores de pantalla aunque el CSS cambie cómo se dibuja.

export default function LlamadoPublico({ llamado, accion, actualizado }) {
  const [anio, setAnio] = useState(() => anioInicial(llamado.mesas));
  const fechas = textoFechasDelLlamado(llamado);
  const aviso = avisoDelLlamado(llamado);
  const conTribunal = llamado.mesas.some((m) => m.tribunal);
  const conAula = llamado.mesas.some((m) => m.aula);
  const columnas = 3 + conTribunal + conAula;
  const porAnio = anio === TODOS_LOS_ANIOS;
  const visibles = porAnio ? llamado.mesas : llamado.mesas.filter((m) => m.anioCarrera === anio);
  // Grupos de filas: uno por año con «Todos los años», o uno solo con el año elegido.
  const grupos = porAnio
    ? OPCIONES_DE_ANIO.filter((o) => o.valor !== TODOS_LOS_ANIOS)
        .map((o) => ({ anio: o.valor, mesas: visibles.filter((m) => m.anioCarrera === o.valor) }))
        .filter((g) => g.mesas.length > 0)
    : visibles.length > 0
      ? [{ anio, mesas: visibles }]
      : [];

  return (
    <article className="llamado-publico">
      <h3>{llamado.nombre}</h3>
      {llamado.finalizado && (
        <div className="estado-terminado">
          <span className="etiqueta et-gris">Turno finalizado</span>
        </div>
      )}
      {fechas && <p className="fechas-llamado">{fechas}</p>}
      {actualizado && <p className="actualizado-llamado">{actualizado}</p>}
      {aviso && <p className="aviso-llamado">{aviso}</p>}
      {llamado.mesas.length > 0 && (
        <>
          <div className="pestanas" role="group" aria-label="Año de la carrera">
            {OPCIONES_DE_ANIO.map((o) => (
              <button key={o.valor} type="button" aria-pressed={anio === o.valor} onClick={() => setAnio(o.valor)}>
                {o.texto}
              </button>
            ))}
          </div>
          {/* La "key" con el año vuelve a crear la caja al cambiar de año: la tabla empieza otra vez desde arriba,
              aunque antes se haya desplazado por dentro. */}
          <div className="tabla-caja" key={anio}>
            <table role="table">
              <thead role="rowgroup">
                <tr role="row">
                  <th role="columnheader" scope="col">
                    Fecha
                  </th>
                  <th role="columnheader" scope="col">
                    Hora
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
              {grupos.map((g) => (
                <tbody role="rowgroup" key={g.anio}>
                  {porAnio && (
                    <tr role="row" className="fila-anio">
                      <th role="rowheader" scope="rowgroup" colSpan={columnas}>
                        {g.anio}.º año
                      </th>
                    </tr>
                  )}
                  {g.mesas.map((m) => (
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
                      <td role="cell" className="col-materia">
                        {m.materia}
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
              ))}
              {grupos.length === 0 && (
                <tbody role="rowgroup">
                  <tr role="row">
                    <td role="cell" colSpan={columnas}>
                      No hay mesas de {anio}.º año en este llamado.
                    </td>
                  </tr>
                </tbody>
              )}
            </table>
          </div>
        </>
      )}
      {accion}
    </article>
  );
}
