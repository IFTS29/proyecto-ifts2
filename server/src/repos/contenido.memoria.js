// Repositorio en memoria del contenido institucional: un registro por sección.
// Tiene la misma interfaz que el de MongoDB. Los datos se pierden al reiniciar el servidor.
export function crearRepoContenidoMemoria() {
  const porClave = new Map();
  const copia = (registro) => (registro ? structuredClone(registro) : null);

  return {
    async listar() {
      return [...porClave.values()].map(copia);
    },
    // Reemplaza la sección completa (o la crea la primera vez).
    async guardar(clave, { datos, actualizadoPor }) {
      const registro = { clave, datos: copia(datos), actualizadoEn: new Date().toISOString(), actualizadoPor };
      porClave.set(clave, registro);
      return copia(registro);
    },
  };
}
