// Repositorio en memoria para los datos de trabajo de la información académica (hoy, los horarios).
// Tiene la misma interfaz que el de MongoDB. Los datos se pierden al reiniciar el servidor.
export function crearRepoAcademicoMemoria() {
  const lista = [];
  let ultimoId = 0;

  // Se devuelven copias, como hace MongoDB: así nadie modifica lo guardado sin pasar por el repositorio.
  const copia = (registro) => structuredClone(registro);
  const cumple = (registro, filtro) => Object.entries(filtro).every(([campo, valor]) => registro[campo] === valor);

  return {
    async listar(filtro = {}) {
      return lista.filter((r) => cumple(r, filtro)).map(copia);
    },
    async buscarPorId(id) {
      const registro = lista.find((r) => r.id === id);
      return registro ? copia(registro) : null;
    },
    async crear(datos) {
      const registro = { ...copia(datos), id: String(++ultimoId), actualizadoEn: new Date().toISOString() };
      lista.push(registro);
      return copia(registro);
    },
    async actualizar(id, cambios) {
      const registro = lista.find((r) => r.id === id);
      if (!registro) return null;
      Object.assign(registro, copia(cambios), { actualizadoEn: new Date().toISOString() });
      return copia(registro);
    },
    async eliminar(id) {
      const posicion = lista.findIndex((r) => r.id === id);
      if (posicion === -1) return false;
      lista.splice(posicion, 1);
      return true;
    },
  };
}