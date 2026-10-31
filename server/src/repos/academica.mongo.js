import mongoose from "mongoose";

// Repositorio con MongoDB para los datos de trabajo de la información académica.
// Recibe el modelo (Horario, Llamado o MesaExamen) y expone la misma interfaz que el repositorio en memoria.
// Los filtros los arma siempre el servidor, nunca vienen del navegador.
function aPlano(doc) {
  if (!doc) return null;
  const { _id, __v, createdAt, updatedAt, ...campos } = doc;
  return { id: String(_id), ...campos, actualizadoEn: updatedAt?.toISOString() };
}

export function crearRepoAcademicoMongo(Modelo) {
  return {
    async listar(filtro = {}) {
      return (await Modelo.find(filtro).lean()).map(aPlano);
    },
    async buscarPorId(id) {
      if (!mongoose.isValidObjectId(id)) return null;
      return aPlano(await Modelo.findById(id).lean());
    },
    async crear(datos) {
      return aPlano((await Modelo.create(datos)).toObject());
    },
    async actualizar(id, cambios) {
      if (!mongoose.isValidObjectId(id)) return null;
      return aPlano(await Modelo.findByIdAndUpdate(id, cambios, { new: true, runValidators: true }).lean());
    },
    async eliminar(id) {
      if (!mongoose.isValidObjectId(id)) return false;
      return Boolean(await Modelo.findByIdAndDelete(id));
    },
  };
}