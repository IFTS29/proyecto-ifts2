import { useState } from "react";
import {
  OPCIONES_DE_ANIO,
  TODOS_LOS_ANIOS,
  anioInicial,
  filasDeHorarios,
  nombreDia,
  nombreTurno,
  textoFranja,
  textoSinMaterias,
  turnosDisponibles,
} from "../academica.js";

// Horarios de un período tal como los ven los alumnos: un botón por año de la carrera y «Todos los años»
// (como la hoja «Unificado» del instituto), y una fila por día de cursada, ordenadas por día y hora.
// Con «Todos los años» se suma la columna Año. En el celular cada fila se muestra como una ficha (día y horario
// arriba, la materia y el resto debajo), sin desplazar la tabla a los costados; el año va debajo de la materia.
// Los encabezados siguen en la tabla (ocultos solo a la vista) y los roles explícitos conservan la tabla para los
// lectores de pantalla aunque el CSS cambie cómo se dibuja.
// El componente se monta con los horarios ya cargados (Alumnos y la vista previa lo rearman con "key" al cambiar
// de período), así que el año inicial se calcula con los datos reales.
// Si hay más de un turno, se puede filtrar; con "Todos los turnos", cada fila muestra el suyo.
// Lo usan la página de Alumnos (lo publicado) y la vista previa del panel (los datos de trabajo).
// "accion" (opcional) recibe el turno elegido y devuelve lo que va debajo de la tabla, por ejemplo el enlace al PDF.
export default function HorariosPublicos({ horarios, accion }) {
  const [anio, setAnio] = useState(() => anioInicial(horarios));
  const [turno, setTurno] = useState("");
  const turnos = turnosDisponibles(horarios, anio);

  // Al cambiar de año se vuelve a "Todos los turnos": el turno elegido puede no tener materias en el otro año.
  const elegirAnio = (a) => {
    setAnio(a);
    setTurno("");
  };

  const conTurno = turnos.length > 1 && !turno;
  const conAnio = anio === TODOS_LOS_ANIOS;
  const filas = filasDeHorarios(horarios, { anio, turno });
  const conAula = filas.some((f) => f.h.aula); // la columna Aula aparece solo si alguna materia del año la tiene
  const columnas = 4 + conTurno + conAula + conAnio;

  return (
    <div className="horarios-publicos">
      <div className="barra-tabla">
        <div className="pestanas" role="group" aria-label="Año de la carrera">
          {OPCIONES_DE_ANIO.map((o) => (
            <button key={o.valor} type="button" aria-pressed={anio === o.valor} onClick={() => elegirAnio(o.valor)}>
              {o.texto}
            </button>
          ))}
        </div>
        {turnos.length > 1 && (
          <div className="campo">
            <label htmlFor="hp-turno">Turno</label>
            <select id="hp-turno" value={turno} onChange={(e) => setTurno(e.target.value)}>
              <option value="">Todos los turnos</option>
              {turnos.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.texto}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="tabla-caja">
        <table role="table" className={conAnio ? "con-anio" : undefined}>
          <thead role="rowgroup">
            <tr role="row">
              <th role="columnheader" scope="col">
                Día
              </th>
              <th role="columnheader" scope="col">
                Horario
              </th>
              {conAnio && (
                <th role="columnheader" scope="col" className="col-anio">
                  Año
                </th>
              )}
              {conTurno && (
                <th role="columnheader" scope="col">
                  Turno
                </th>
              )}
              <th role="columnheader" scope="col">
                Materia
              </th>
              <th role="columnheader" scope="col">
                Docente
              </th>
              {conAula && (
                <th role="columnheader" scope="col">
                  Aula
                </th>
              )}
            </tr>
          </thead>
          <tbody role="rowgroup">
            {filas.map((f, i) => (
              <tr role="row" key={`${f.h.id}-${i}`}>
                <td role="cell" className="col-dia">
                  {nombreDia(f.dia)}
                </td>
                <td role="cell" className="col-horario">
                  {textoFranja(f)}
                </td>
                {conAnio && (
                  <td role="cell" className="col-anio">
                    {f.h.anioCarrera}.º año
                  </td>
                )}
                {conTurno && (
                  <td role="cell" className="col-detalle" data-etiqueta="Turno">
                    {nombreTurno(f.h.turno)}
                  </td>
                )}
                <td role="cell" className="col-materia">
                  {f.h.materia}
                  {/* Solo a la vista en el celular: los lectores de pantalla ya leen la columna Año. */}
                  {conAnio && (
                    <span className="anio-movil" aria-hidden="true">
                      {f.h.anioCarrera}.º año
                    </span>
                  )}
                </td>
                <td role="cell" className="col-detalle" data-etiqueta="Docente">
                  {f.h.profesor || "A designar"}
                </td>
                {conAula && (
                  <td
                    role="cell"
                    className={"col-detalle" + (f.h.aula ? "" : " sin-dato")}
                    data-etiqueta="Aula"
                  >
                    {f.h.aula || "—"}
                  </td>
                )}
              </tr>
            ))}
            {filas.length === 0 && (
              <tr role="row">
                <td role="cell" colSpan={columnas}>
                  {textoSinMaterias(anio)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {accion?.(turno)}
    </div>
  );
}