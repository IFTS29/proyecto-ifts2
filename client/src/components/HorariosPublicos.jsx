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
// Con «Todos los años», las materias se agrupan por año, cada año en su propio <tbody>: el grupo empieza con una
// fila con el nombre del año, con otro fondo que el encabezado y las filas de las materias. En el celular cada fila se muestra como una ficha
// (día y horario arriba, la materia y el resto debajo), sin desplazar la tabla a los costados.
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
  const porAnio = anio === TODOS_LOS_ANIOS;
  const filas = filasDeHorarios(horarios, { anio, turno });
  const conAula = filas.some((f) => f.h.aula); // la columna Aula aparece solo si alguna materia del año la tiene
  const columnas = 4 + conTurno + conAula;
  // Grupos de filas: uno por año con «Todos los años» (las filas ya vienen ordenadas por año), o uno solo.
  const grupos = porAnio
    ? [...new Set(filas.map((f) => f.h.anioCarrera))].map((a) => ({ anio: a, filas: filas.filter((f) => f.h.anioCarrera === a) }))
    : filas.length > 0
      ? [{ anio: null, filas }]
      : [];

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

      {/* La "key" con el año y el turno vuelve a crear la caja al cambiar el filtro: la tabla empieza otra vez desde
          arriba, aunque antes se haya desplazado por dentro. */}
      <div className="tabla-caja" key={`${anio}-${turno}`}>
        <table role="table">
          <thead role="rowgroup">
            <tr role="row">
              <th role="columnheader" scope="col">
                Día
              </th>
              <th role="columnheader" scope="col">
                Horario
              </th>
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
          {/* Con «Todos los años», un <tbody> por año, encabezado por la fila con su nombre: así los lectores de
              pantalla asocian cada materia con su año. Con un solo año, un único grupo sin esa fila. */}
          {grupos.map((g) => (
            <tbody role="rowgroup" key={g.anio ?? "unico"}>
              {porAnio && (
                <tr role="row" className="fila-anio">
                  <th role="rowheader" scope="rowgroup" colSpan={columnas}>
                    {g.anio}.º año
                  </th>
                </tr>
              )}
              {g.filas.map((f, i) => (
                <tr role="row" key={`${f.h.id}-${i}`}>
                  <td role="cell" className="col-dia">
                    {nombreDia(f.dia)}
                  </td>
                  <td role="cell" className="col-horario">
                    {textoFranja(f)}
                  </td>
                  {conTurno && (
                    <td role="cell" className="col-detalle" data-etiqueta="Turno">
                      {nombreTurno(f.h.turno)}
                    </td>
                  )}
                  <td role="cell" className="col-materia">
                    {f.h.materia}
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
            </tbody>
          ))}
          {filas.length === 0 && (
            <tbody role="rowgroup">
              <tr role="row">
                <td role="cell" colSpan={columnas}>
                  {textoSinMaterias(anio)}
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
      {accion?.(turno)}
    </div>
  );
}