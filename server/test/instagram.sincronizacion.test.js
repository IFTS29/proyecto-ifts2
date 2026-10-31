import test from "node:test";
import assert from "node:assert/strict";
// Sincronización con Instagram (#63): archivos con nombre fijo, reintentos y tipo de cada medio.
import { sincronizarInstagram } from "../src/services/instagram/index.js";
import { opcionesDeSubidaDeInstagram } from "../src/services/media/cloudinary.js";
import { crearRepoEventosMemoria } from "../src/repos/eventos.memoria.js";
import { fotosDeEvento, mensajeDeSincronizacion } from "../../client/src/eventos.js";

const CARRUSEL = {
  id: "1790",
  caption: "Muestra de fin de año\nPlatos de los estudiantes. #eventosIFTS2",
  media_type: "CAROUSEL_ALBUM",
  permalink: "https://www.instagram.com/p/carrusel/",
  timestamp: "2026-10-24T15:00:00+0000",
  children: {
    data: [
      { id: "a1", media_type: "IMAGE", media_url: "https://cdn.instagram.test/a1.jpg" },
      { id: "a2", media_type: "VIDEO", media_url: "https://cdn.instagram.test/a2", thumbnail_url: "https://cdn.instagram.test/a2.jpg" },
      { id: "a3", media_type: "IMAGE", media_url: "https://cdn.instagram.test/a3.jpg" },
    ],
  },
};

const FOTO_SUELTA = {
  id: "1791",
  caption: "Clase abierta #eventosIFTS2",
  media_type: "IMAGE",
  media_url: "https://cdn.instagram.test/suelta.jpg",
  permalink: "https://www.instagram.com/p/suelta/",
  timestamp: "2026-10-25T15:00:00+0000",
};

// Cloudinary simulado: guarda cada archivo por su nombre y, como overwrite: false, no vuelve a subir
// uno que ya existe. "fallan" son los nombres que no se pueden subir.
function cloudinaryDePrueba() {
  const archivos = new Map();
  const nube = {
    subidas: [],
    pedidos: [],
    fallan: new Set(),
    async guardarMedioDeInstagram(url, { nombre, tipo }) {
      nube.pedidos.push({ nombre, tipo });
      if (nube.fallan.has(nombre)) return null;
      if (!archivos.has(nombre)) {
        nube.subidas.push(nombre);
        archivos.set(nombre, { url: `https://res.cloudinary.com/prueba/${nombre}`, publicId: `ifts2/instagram/${nombre}` });
      }
      return archivos.get(nombre);
    },
  };
  return nube;
}

function sincronizacion(publicaciones, nube, eventos) {
  let feed = [];
  return () =>
    sincronizarInstagram({
      config: { instagramToken: "token-de-prueba", instagramAccountId: "123" },
      repoFeed: {
        loadFeed: async () => feed,
        saveFeed: async (posts) => {
          feed = posts;
        },
        loadDeletedPostIds: async () => [],
        loadSyncStatus: async () => null,
        saveSyncStatus: async (estado) => estado,
      },
      mediaService: nube,
      eventos,
      fetchFn: async (url) => ({
        ok: true,
        json: async () => (url.includes("/media?") ? { data: publicaciones } : { username: "ifts2" }),
      }),
    });
}

test("una segunda sincronización no descarga ni sube los archivos de un evento que ya existe", async () => {
  const nube = cloudinaryDePrueba();
  const eventos = crearRepoEventosMemoria();
  const sincronizar = sincronizacion([CARRUSEL], nube, eventos);

  const primera = await sincronizar();
  assert.equal(primera.nuevos, 1);
  const pedidosDeLaPrimera = nube.pedidos.length;

  const segunda = await sincronizar();
  assert.equal(segunda.nuevos, 0);
  assert.equal(nube.pedidos.length, pedidosDeLaPrimera, "no pide ningún archivo");
  assert.equal((await eventos.listar()).length, 1);
});

test("si falla un archivo, la publicación no se importa y la siguiente sincronización la completa", async () => {
  const nube = cloudinaryDePrueba();
  const eventos = crearRepoEventosMemoria();
  const sincronizar = sincronizacion([CARRUSEL], nube, eventos);

  nube.fallan.add("1790_3_a3");
  const primera = await sincronizar();
  assert.equal(primera.nuevos, 0);
  assert.equal(primera.pendientes, 1);
  assert.equal((await eventos.listar()).length, 0, "no queda un evento incompleto");

  nube.fallan.clear();
  nube.subidas.length = 0;
  const segunda = await sincronizar();
  assert.equal(segunda.nuevos, 1);
  assert.equal(segunda.pendientes, 0);
  assert.deepEqual(nube.subidas, ["1790_3_a3"], "solo se sube lo que faltaba");
  const [evento] = await eventos.listar();
  assert.equal(evento.medios.length, 3);
});

test("cada medio se sube y se guarda con el tipo que informa Instagram; la miniatura de un video es imagen", async () => {
  const nube = cloudinaryDePrueba();
  const eventos = crearRepoEventosMemoria();
  await sincronizacion([CARRUSEL], nube, eventos)();

  assert.deepEqual(nube.pedidos, [
    { nombre: "1790_1_a1", tipo: "IMAGE" },
    { nombre: "1790_2_a2", tipo: "VIDEO" },
    { nombre: "1790_2_a2_thumb", tipo: "IMAGE" },
    { nombre: "1790_3_a3", tipo: "IMAGE" },
  ]);
  const [evento] = await eventos.listar();
  assert.deepEqual(
    evento.medios.map((medio) => [medio.tipo, medio.publicId]),
    [
      ["IMAGE", "ifts2/instagram/1790_1_a1"],
      ["VIDEO", "ifts2/instagram/1790_2_a2"],
      ["IMAGE", "ifts2/instagram/1790_3_a3"],
    ],
  );
  assert.equal(evento.medios[1].thumbnailUrl, "https://res.cloudinary.com/prueba/1790_2_a2_thumb");
  assert.equal(evento.fotoPrincipal, "https://res.cloudinary.com/prueba/1790_1_a1");
});

test("la foto de una publicación de una sola imagen queda en la galería y se puede ampliar", async () => {
  const nube = cloudinaryDePrueba();
  const eventos = crearRepoEventosMemoria();
  await sincronizacion([FOTO_SUELTA], nube, eventos)();

  const [evento] = await eventos.listar();
  const foto = "https://res.cloudinary.com/prueba/1791";
  assert.deepEqual(evento.medios, [{ id: "1791", tipo: "IMAGE", url: foto, publicId: "ifts2/instagram/1791", thumbnailUrl: foto }]);
  assert.equal(evento.permalink, "https://www.instagram.com/p/suelta/", "se conserva el enlace a la publicación");
  assert.deepEqual(fotosDeEvento(evento).map((f) => f.url), [foto]);
});

test("la subida a Cloudinary usa un nombre fijo en ifts2/instagram, sin pisar archivos ni comprimir el original", () => {
  assert.deepEqual(opcionesDeSubidaDeInstagram({ nombre: "1790_2_a2", tipo: "VIDEO" }), {
    folder: "ifts2/instagram",
    public_id: "1790_2_a2",
    resource_type: "video",
    overwrite: false,
  });
  assert.equal(opcionesDeSubidaDeInstagram({ nombre: "1790_2_a2_thumb", tipo: "IMAGE" }).resource_type, "image");
});

test("un carrusel al que le falta un archivo de Instagram no se importa incompleto: queda pendiente", async () => {
  const nube = cloudinaryDePrueba();
  const eventos = crearRepoEventosMemoria();
  const sinArchivo = structuredClone(CARRUSEL);
  delete sinArchivo.children.data[2].media_url;

  const resultado = await sincronizacion([sinArchivo], nube, eventos)();
  assert.equal(resultado.nuevos, 0);
  assert.equal(resultado.pendientes, 1);
  assert.equal((await eventos.listar()).length, 0);
  assert.equal(nube.pedidos.length, 0, "no sube nada de un carrusel que no se puede completar");
});

test("un video suelto que Instagram no deja descargar se importa como publicación incrustada", async () => {
  const nube = cloudinaryDePrueba();
  const eventos = crearRepoEventosMemoria();
  const reel = {
    id: "1792",
    caption: "Reel de la muestra #eventosIFTS2",
    media_type: "VIDEO",
    thumbnail_url: "https://cdn.instagram.test/reel.jpg",
    permalink: "https://www.instagram.com/reel/muestra/",
    timestamp: "2026-10-26T15:00:00+0000",
  };

  const resultado = await sincronizacion([reel], nube, eventos)();
  assert.equal(resultado.nuevos, 1);
  assert.equal(resultado.pendientes, 0);
  const [evento] = await eventos.listar();
  assert.equal(evento.videoUrl, "https://www.instagram.com/reel/muestra/", "el detalle muestra la publicación de Instagram");
  assert.equal(evento.fotoPrincipal, "https://res.cloudinary.com/prueba/1792_thumb");
  assert.deepEqual(evento.medios, []);
});

test("una foto suelta sin archivo, un video sin archivo ni enlace y un carrusel vacío quedan pendientes", async () => {
  const nube = cloudinaryDePrueba();
  const eventos = crearRepoEventosMemoria();
  const fotoSinArchivo = { ...FOTO_SUELTA, media_url: undefined };
  const videoSinNada = { id: "1793", caption: "Video #eventosIFTS2", media_type: "VIDEO", timestamp: "2026-10-26T15:00:00+0000" };
  const carruselVacio = { ...CARRUSEL, id: "1794", children: { data: [] } };

  const resultado = await sincronizacion([fotoSinArchivo, videoSinNada, carruselVacio], nube, eventos)();
  assert.equal(resultado.nuevos, 0);
  assert.equal(resultado.pendientes, 3);
  assert.equal((await eventos.listar()).length, 0);
  assert.equal(nube.pedidos.length, 0);
});

test("mensaje del panel después de sincronizar: éxito, resultado parcial y error", () => {
  assert.deepEqual(mensajeDeSincronizacion({ success: true, nuevos: 2 }), {
    texto: "Sincronización finalizada. Se incorporaron 2 eventos.",
    tipo: "exito",
  });
  assert.equal(mensajeDeSincronizacion({ success: true, nuevos: 1 }).texto, "Sincronización finalizada. Se incorporó 1 evento.");
  assert.equal(
    mensajeDeSincronizacion({ success: true, nuevos: 0, pendientes: 0 }).texto,
    "Sincronización finalizada. No se encontraron publicaciones nuevas con #eventosIFTS2.",
  );
  assert.deepEqual(mensajeDeSincronizacion({ success: true, nuevos: 1, pendientes: 1 }), {
    texto: "Sincronización finalizada. Se incorporó 1 evento. No se pudo importar 1 publicación. Se podrá reintentar en una próxima sincronización.",
    tipo: "parcial",
  });
  assert.equal(
    mensajeDeSincronizacion({ success: true, nuevos: 0, pendientes: 2 }).texto,
    "Sincronización finalizada. No se pudieron importar 2 publicaciones. Se podrán reintentar en una próxima sincronización.",
  );
  const error = { texto: "No se pudo sincronizar con Instagram.", tipo: "error" };
  assert.deepEqual(mensajeDeSincronizacion({ success: false, nuevos: 0 }), error, "success: false nunca se muestra como éxito");
  assert.deepEqual(mensajeDeSincronizacion(null), error);
});
