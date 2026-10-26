// Repositorio de eventos en memoria: permite ejecutar pruebas unitarias y de integración
// 100% deterministas y offline sin necesidad de MongoDB en ejecución.

export function crearRepoEventosMemoria(datosIniciales = []) {
  let contador = datosIniciales.length;
  const lista = datosIniciales.map((item, idx) => ({
    id: String(item.id || idx + 1),
    ...item,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  }));

  const aPlano = (item) => ({ ...item });

  return {
    async listar({ estado, origen } = {}) {
      let resultado = [...lista];
      if (estado) {
        resultado = resultado.filter((e) => e.estado === estado);
      }
      if (origen) {
        resultado = resultado.filter((e) => e.origen === origen);
      }
      // Orden descendente por fecha de evento
      return resultado
        .sort((a, b) => new Date(b.fechaEvento || b.createdAt) - new Date(a.fechaEvento || a.createdAt))
        .map(aPlano);
    },

    async buscarPorId(id) {
      const evento = lista.find((e) => e.id === String(id));
      return evento ? aPlano(evento) : null;
    },

    async buscarPorInstagramId(instagramId) {
      if (!instagramId) return null;
      const evento = lista.find((e) => e.instagramId === String(instagramId));
      return evento ? aPlano(evento) : null;
    },

    async crear(datos) {
      const id = String(++contador);
      const ahora = new Date().toISOString();
      const nuevo = {
        id,
        origen: datos.origen || "manual",
        instagramId: datos.instagramId || null,
        permalink: datos.permalink || null,
        titulo: datos.titulo?.trim() || "",
        resumen: datos.resumen?.trim() || "",
        descripcion: datos.descripcion?.trim() || "",
        captionOriginal: datos.captionOriginal || null,
        editadoPorAdmin: datos.editadoPorAdmin ?? false,
        fechaEvento: datos.fechaEvento ? new Date(datos.fechaEvento).toISOString() : ahora,
        fechaPublicacionOriginal: datos.fechaPublicacionOriginal
          ? new Date(datos.fechaPublicacionOriginal).toISOString()
          : null,
        tipoMedio: datos.tipoMedio || "IMAGE",
        fotoPrincipal: datos.fotoPrincipal || "",
        videoUrl: datos.videoUrl || null,
        videoThumbnail: datos.videoThumbnail || null,
        medios: Array.isArray(datos.medios) ? [...datos.medios] : [],
        mediosQuitados: Array.isArray(datos.mediosQuitados) ? [...datos.mediosQuitados] : [],
        cantidadMedios: Number(datos.cantidadMedios) || (Array.isArray(datos.medios) && datos.medios.length) || 1,
        estado: datos.estado || "visible",
        categorias: Array.isArray(datos.categorias) && datos.categorias.length ? datos.categorias : ["eventos"],
        createdAt: ahora,
        updatedAt: ahora,
      };

      lista.push(nuevo);
      return aPlano(nuevo);
    },

    async actualizar(id, cambios) {
      const idx = lista.findIndex((e) => e.id === String(id));
      if (idx === -1) return null;

      const existente = lista[idx];
      const actualizado = {
        ...existente,
        ...cambios,
        updatedAt: new Date().toISOString(),
      };
      if (cambios.fechaEvento) {
        actualizado.fechaEvento = new Date(cambios.fechaEvento).toISOString();
      }
      lista[idx] = actualizado;
      return aPlano(actualizado);
    },

    async eliminar(id) {
      const idx = lista.findIndex((e) => e.id === String(id));
      if (idx === -1) return false;
      lista.splice(idx, 1);
      return true;
    },

    async contarPorEstado() {
      const conteo = {
        todos: lista.length,
        visible: 0,
        oculto: 0,
        archivado: 0,
      };
      for (const e of lista) {
        if (conteo[e.estado] !== undefined) {
          conteo[e.estado]++;
        }
      }
      return conteo;
    },
  };
}
