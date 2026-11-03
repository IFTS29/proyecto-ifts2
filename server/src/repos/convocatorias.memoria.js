// Repositorio en memoria del historial de convocatorias de ingreso. Misma interfaz que el de MongoDB.
export function crearRepoConvocatoriasMemoria() {
  const porConvocatoria = new Map();
  const copia = (registro) => structuredClone(registro);

  return {
    async listar() {
      return [...porConvocatoria.values()].map(copia);
    },
    // Guarda la copia de una convocatoria. Si ya estaba (la misma convocatoria volvió a pasar al historial),
    // se actualiza solo esa: las demás no se tocan.
    async guardar(convocatoria, datos) {
      const registro = { convocatoria, datos: copia(datos), guardadaEn: new Date().toISOString() };
      porConvocatoria.set(convocatoria, registro);
      return copia(registro);
    },
  };
}
