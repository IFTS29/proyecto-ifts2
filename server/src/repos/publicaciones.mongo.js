import { PublicacionHorarios } from "../models/PublicacionHorarios.js";

// Repositorio con MongoDB para las copias publicadas de los horarios. Misma interfaz que el de memoria.
// En la base, cada materia guarda el id de trabajo como "horarioId"; hacia afuera se devuelve como "id".
function aPlano(doc) {
  if (!doc) return null;
  return {
    cicloLectivo: doc.cicloLectivo,
    cuatrimestre: doc.cuatrimestre,
    publicado: doc.publicado,
    publicadoEn: doc.publicadoEn?.toISOString(),
    horarios: (doc.horarios ?? []).map(({ horarioId, ...campos }) => ({ id: horarioId, ...campos })),
  };
}

const filtroDe = ({ cicloLectivo, cuatrimestre }) => ({ cicloLectivo, cuatrimestre });

export function crearRepoPublicacionesMongo() {
  return {
    async listar() {
      return (await PublicacionHorarios.find().lean()).map(aPlano);
    },
    async buscar(periodo) {
      return aPlano(await PublicacionHorarios.findOne(filtroDe(periodo)).lean());
    },
    // Una sola escritura sobre el documento del período: en MongoDB es "todo o nada",
    // así los alumnos ven la versión anterior completa o la nueva completa.
    async guardar(periodo, { publicado, publicadoEn, horarios }) {
      const cambios = {
        publicado,
        publicadoEn,
        horarios: horarios.map(({ id, ...campos }) => ({ horarioId: id, ...campos })),
      };
      const doc = await PublicacionHorarios.findOneAndUpdate(
        filtroDe(periodo),
        { $set: cambios },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
      ).lean();
      return aPlano(doc);
    },
    // Pone publicado en false y conserva la copia. Devuelve null si el período no estaba publicado.
    async retirar(periodo) {
      const doc = await PublicacionHorarios.findOneAndUpdate(
        { ...filtroDe(periodo), publicado: true },
        { $set: { publicado: false } },
        { new: true },
      ).lean();
      return aPlano(doc);
    },
  };
}