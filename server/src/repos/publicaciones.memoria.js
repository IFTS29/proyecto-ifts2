// Repositorio en memoria para las copias publicadas de los horarios: una por período.
// Tiene la misma interfaz que el de MongoDB. Los datos se pierden al reiniciar el servidor.
export function crearRepoPublicacionesMemoria() {
  const porPeriodo = new Map();
  const clave = ({ cicloLectivo, cuatrimestre }) => `${cicloLectivo}-${cuatrimestre}`;
  const copia = (registro) => (registro ? structuredClone(registro) : null);

  return {
    async listar() {
      return [...porPeriodo.values()].map(copia);
    },
    async buscar(periodo) {
      return copia(porPeriodo.get(clave(periodo)));
    },
    // Reemplaza la publicación del período completa (o la crea la primera vez).
    async guardar(periodo, { publicado, publicadoEn, horarios }) {
      const registro = {
        ...periodo,
        publicado,
        publicadoEn: new Date(publicadoEn).toISOString(), // como lo devuelve el repositorio de MongoDB
        horarios: copia(horarios),
      };
      porPeriodo.set(clave(periodo), registro);
      return copia(registro);
    },
    // Pone publicado en false y conserva la copia. Devuelve null si el período no estaba publicado.
    async retirar(periodo) {
      const registro = porPeriodo.get(clave(periodo));
      if (!registro?.publicado) return null;
      registro.publicado = false;
      return copia(registro);
    },
  };
}