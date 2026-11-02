import {
  detalleInstancia,
  gruposDelPlan,
  nombreEnAnio,
  regimen,
  totalCarrera,
  ubicacionInstancia,
} from "../planDeEstudios.js";

export default function TablaPlan({ vista, filtro }) {
  const grupos = gruposDelPlan(vista, filtro);
  const todos = filtro === "todos";
  const nombreFiltro = todos ? (vista === "anio" ? "todos los años" : "todas las áreas") : grupos[0].titulo;
  const total = todos ? totalCarrera() : grupos[0].total;
  const textoTotal = todos ? "Total de la carrera" : vista === "anio" ? "Total del año" : "Total del área";

  return (
    <div className="tabla-caja tabla-plan">
      <table>
        <caption className="solo-lectores">
          Plan de estudios {vista === "anio" ? "por año" : "por área"}: {nombreFiltro}
        </caption>
        <thead>
          <tr>
            <th scope="col">Instancia curricular</th>
            <th scope="col" className="col-regimen">
              Régimen
            </th>
            <th scope="col" className="num">
              Horas cátedra
            </th>
          </tr>
        </thead>
        {grupos.map((g) => (
          <tbody key={g.clave}>
            {todos && (
              <tr className="fila-grupo">
                <th scope="rowgroup">
                  {g.titulo}
                  <span className="cuenta-grupo">{g.cuenta}</span>
                </th>
                <td className="col-regimen" />
                <td className="num">{g.total}</td>
              </tr>
            )}
            {g.secciones.map((s) => [
              s.titulo && (
                <tr className="fila-periodo" key={`${g.clave}-${s.titulo}`}>
                  <th scope="row">{s.titulo}</th>
                  <td className="col-regimen" />
                  <td className="num" />
                </tr>
              ),
              ...s.filas.map((x) => (
                <tr key={`${x.area}-${x.nombre}`}>
                  <td>
                    {vista === "anio" ? nombreEnAnio(x) : x.nombre}
                    {x.promocionable && <span className="marca-promocionable">Promocionable</span>}
                    <span className="regimen-movil">{regimen(x)}</span>
                    {vista === "area" && <span className="detalle-instancia">{ubicacionInstancia(x)}</span>}
                    {detalleInstancia(x) && <span className="detalle-instancia">{detalleInstancia(x)}</span>}
                  </td>
                  <td className="col-regimen">{regimen(x)}</td>
                  <td className="num">{x.total}</td>
                </tr>
              )),
            ])}
          </tbody>
        ))}
        <tfoot>
          <tr>
            <th scope="row">{textoTotal}</th>
            <td className="col-regimen" />
            <td className="num">{total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
