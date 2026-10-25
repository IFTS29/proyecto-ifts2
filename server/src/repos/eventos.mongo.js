import mongoose from "mongoose";
import { Evento } from "../models/Evento.js";

// Repositorio de eventos en MongoDB. Expone la misma interfaz que el repositorio en memoria.
const aPlano = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...resto } = obj;
  return {
    id: String(_id),
    ...resto,
  };
};

export function crearRepoEventosMongo() {
  return {
    async listar({ estado, origen } = {}) {
      const filtro = {};
      if (estado) filtro.estado = estado;
      if (origen) filtro.origen = origen;

      const docs = await Evento.find(filtro).sort({ fechaEvento: -1, createdAt: -1 });
      return docs.map(aPlano);
    },

    async buscarPorId(id) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await Evento.findById(id);
      return aPlano(doc);
    },

    async buscarPorInstagramId(instagramId) {
      if (!instagramId) return null;
      const doc = await Evento.findOne({ instagramId: String(instagramId) });
      return aPlano(doc);
    },

    async crear(datos) {
      const doc = await Evento.create(datos);
      return aPlano(doc);
    },

    async actualizar(id, cambios) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await Evento.findByIdAndUpdate(id, cambios, {
        new: true,
        runValidators: true,
      });
      return aPlano(doc);
    },

    async eliminar(id) {
      if (!mongoose.isValidObjectId(id)) return false;
      const resultado = await Evento.findByIdAndDelete(id);
      return !!resultado;
    },

    async contarPorEstado() {
      const estados = ["visible", "oculto", "archivado"];
      const conteos = await Promise.all(
        estados.map((estado) => Evento.countDocuments({ estado })),
      );

      const resultado = { todos: 0 };
      estados.forEach((estado, idx) => {
        resultado[estado] = conteos[idx];
        resultado.todos += conteos[idx];
      });

      return resultado;
    },
  };
}
