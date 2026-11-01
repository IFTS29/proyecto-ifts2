import { ContenidoInstitucional } from "../models/ContenidoInstitucional.js";

// Repositorio con MongoDB del contenido institucional. Misma interfaz que el de memoria.
function aPlano(doc) {
  if (!doc) return null;
  return {
    clave: doc.clave,
    datos: doc.datos,
    actualizadoEn: doc.actualizadoEn?.toISOString(),
    actualizadoPor: doc.actualizadoPor ?? "",
  };
}

export function crearRepoContenidoMongo() {
  return {
    async listar() {
      return (await ContenidoInstitucional.find().lean()).map(aPlano);
    },
    // Una sola escritura: la sección se reemplaza entera (o se crea la primera vez).
    async guardar(clave, { datos, actualizadoPor }) {
      const doc = await ContenidoInstitucional.findOneAndUpdate(
        { clave },
        { $set: { datos, actualizadoEn: new Date(), actualizadoPor } },
        { upsert: true, new: true, runValidators: true },
      ).lean();
      return aPlano(doc);
    },
  };
}
