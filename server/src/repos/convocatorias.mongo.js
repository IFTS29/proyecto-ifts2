import { ConvocatoriaAnterior } from "../models/ConvocatoriaAnterior.js";

// Repositorio con MongoDB del historial de convocatorias de ingreso. Misma interfaz que el de memoria.
const aPlano = (doc) =>
  doc && { convocatoria: doc.convocatoria, datos: doc.datos, guardadaEn: doc.guardadaEn?.toISOString() };

export function crearRepoConvocatoriasMongo() {
  return {
    async listar() {
      return (await ConvocatoriaAnterior.find().lean()).map(aPlano);
    },
    // Una sola escritura por convocatoria: se crea o se actualiza solo esa.
    async guardar(convocatoria, datos) {
      const doc = await ConvocatoriaAnterior.findOneAndUpdate(
        { convocatoria },
        { $set: { datos, guardadaEn: new Date() } },
        { upsert: true, new: true, runValidators: true },
      ).lean();
      return aPlano(doc);
    },
  };
}
