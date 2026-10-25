import { useState } from "react";
import { TURNOS, nombreDia, nombreTurno, ordenDia, textoFranja } from "../academica.js";

const ANIOS = [1, 2, 3];

// Horarios de un período tal como los ven los alumnos: una pestaña por año de la carrera
// y una fila por día de cursada, ordenadas por día y hora (igual que el PDF).
// Si hay más de un turno, se puede filtrar; con "Todos los turnos", cada fila muestra el suyo.
// Lo usan la página de Alumnos (lo publicado) y la vista previa del panel (los datos de trabajo).
// "accion" (opcional) recibe el turno elegido y devuelve lo que va debajo de la tabla, por ejemplo el enlace al PDF.
export default function HorariosPublicos({ horarios, accion }) {
  const [anio, setAnio] = useState(() => ANIOS.find((a) => horarios.some((h) => h.anioCarrera === a)) ?? 1);
  const turnos = TURNOS.filter((t) => horarios.some((h) => h.turno === t.valor));
  const [turno, setTurno] = useState("");

  // Al cambiar de año se vuelve a "Todos los turnos": el turno elegido puede no tener materias en el otro año.
  const elegirAnio = (a) => {
    setAnio(a);
    setTurno("");
  };

  const delTurno = horarios.filter((h) => !turno || h.turno === turno);
  const conTurno = turnos.length > 1 && !turno;
  const filas = delTurno
    .filter((h) => h.anioCarrera === anio)
    .flatMap((h) => h.dias.map((franja) => ({ ...franja, h })))
    .sort((a, b) => ordenDia(a.dia) - ordenDia(b.dia) || a.desde.localeCompare(b.desde));
  const conAula = filas.some((f) => f.h.aula); // la columna Aula aparece solo si alguna materia del año la tiene

  return (
    <div className="horarios-publicos">
      <div className="barra-tabla">
        <div className="pestanas" role="group" aria-label="Año de la carrera">
          {ANIOS.map((a) => (
            <button key={a} type="button" aria-pressed={anio === a} onClick={() => elegirAnio(a)}>
              {a}.° año
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
        <table>
          <thead>
            <tr>
              <th scope="col">Día</th>
              <th scope="col">Horario</th>
              {conTurno && <th scope="col">Turno</th>}
              <th scope="col">Materia</th>
              <th scope="col">Docente</th>
              {conAula && <th scope="col">Aula</th>}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={`${f.h.id}-${i}`}>
                <td>{nombreDia(f.dia)}</td>
                <td>{textoFranja(f)}</td>
                {conTurno && <td>{nombreTurno(f.h.turno)}</td>}
                <td>{f.h.materia}</td>
                <td>{f.h.profesor || "A designar"}</td>
                {conAula && <td>{f.h.aula || "—"}</td>}
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={4 + conTurno + conAula}>No hay materias de {anio}.° año en este período.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {accion?.(turno)}
    </div>
  );
}