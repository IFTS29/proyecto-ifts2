import { useMemo, useState } from "react";
import { nombreTurno, ordenDia, paraBuscar, textoDias } from "../academica.js";

// Columnas que se pueden ordenar, con el valor que se compara en cada una ("" si el campo está vacío).
const COLUMNAS = [
  { clave: "materia", titulo: "Materia", valor: (h) => paraBuscar(h.materia) },
  { clave: "anioCarrera", titulo: "Año", valor: (h) => h.anioCarrera },
  { clave: "turno", titulo: "Turno", valor: (h) => nombreTurno(h.turno) },
  { clave: "profesor", titulo: "Docente", valor: (h) => paraBuscar(h.profesor) },
  {
    clave: "dias",
    titulo: "Días y horarios",
    valor: (h) => ordenDia(h.dias[0]?.dia) * 10000 + Number(h.dias[0]?.desde.replace(":", "")),
  },
  { clave: "aula", titulo: "Aula", valor: (h) => paraBuscar(h.aula) },
];

function comparar(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "es");
}

const vacio = (texto) => texto || "—";

// Tabla de edición de los horarios de un período (datos de trabajo).
// Arranca ordenada por materia; un clic en el encabezado ordena por esa columna y otro invierte el orden.
// Busca por materia o docente y filtra por año de la carrera. Sin paginación: son pocas materias por período.
export default function TablaHorarios({ horarios, alEditar, alEliminar }) {
  const [busqueda, setBusqueda] = useState("");
  const [anio, setAnio] = useState("");
  const [orden, setOrden] = useState({ clave: "materia", ascendente: true });

  const visibles = useMemo(() => {
    const texto = paraBuscar(busqueda.trim());
    const columna = COLUMNAS.find((c) => c.clave === orden.clave);
    return horarios
      .filter((h) => !anio || h.anioCarrera === Number(anio))
      .filter((h) => !texto || paraBuscar(h.materia).includes(texto) || paraBuscar(h.profesor).includes(texto))
      .sort((a, b) => {
        const [valorA, valorB] = [columna.valor(a), columna.valor(b)];
        // Los campos vacíos (sin docente o sin aula) van siempre al final, en los dos sentidos.
        if ((valorA === "") !== (valorB === "")) return valorA === "" ? 1 : -1;
        const resultado = comparar(valorA, valorB);
        return (orden.ascendente ? resultado : -resultado) || comparar(paraBuscar(a.materia), paraBuscar(b.materia));
      });
  }, [horarios, busqueda, anio, orden]);

  const flecha = (clave) => (orden.clave !== clave ? "" : orden.ascendente ? " ▲" : " ▼");

  const ordenarPor = (clave) =>
    setOrden((actual) => ({ clave, ascendente: actual.clave === clave ? !actual.ascendente : true }));

  return (
    <>
      <div className="barra-tabla">
        <div className="campo">
          <label htmlFor="t-buscar">Buscar</label>
          <input
            id="t-buscar"
            type="search"
            placeholder="Materia o docente"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="campo">
          <label htmlFor="t-anio">Año de la carrera</label>
          <select id="t-anio" value={anio} onChange={(e) => setAnio(e.target.value)}>
            <option value="">Todos</option>
            <option value="1">1.° año</option>
            <option value="2">2.° año</option>
            <option value="3">3.° año</option>
          </select>
        </div>
      </div>

      <div className="tabla-caja tabla-horarios">
        <table>
          <thead>
            <tr>
              {COLUMNAS.map((c) => (
                <th
                  key={c.clave}
                  scope="col"
                  aria-sort={orden.clave === c.clave ? (orden.ascendente ? "ascending" : "descending") : "none"}
                >
                  <button className="ordenar" type="button" onClick={() => ordenarPor(c.clave)}>
                    {c.titulo}
                    <span aria-hidden="true">{flecha(c.clave)}</span>
                  </button>
                </th>
              ))}
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((h) => (
              <tr key={h.id}>
                <th scope="row">{h.materia}</th>
                <td>{h.anioCarrera}.°</td>
                <td>{nombreTurno(h.turno)}</td>
                <td>{vacio(h.profesor)}</td>
                <td>{textoDias(h.dias)}</td>
                <td>{vacio(h.aula)}</td>
                <td>
                  <div className="acciones-fila">
                    <button
                      className="boton-icono"
                      type="button"
                      aria-label={`Editar ${h.materia}`}
                      title="Editar"
                      onClick={() => alEditar(h)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                      </svg>
                    </button>
                    <button
                      className="boton-icono peligro"
                      type="button"
                      aria-label={`Eliminar ${h.materia}`}
                      title="Eliminar"
                      onClick={() => alEliminar(h)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={COLUMNAS.length + 1}>Ninguna materia coincide con la búsqueda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="ayuda-tabla">
        {visibles.length} de {horarios.length} materias
      </p>
    </>
  );
}