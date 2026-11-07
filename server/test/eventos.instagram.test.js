// Alta de un evento con el enlace de una publicación de Instagram (#39, H-61).
// El enlace se revisa en el servidor, la foto de la publicación se obtiene con controles y se guarda
// como una foto cargada desde la computadora. Ninguna prueba sale a Internet: el buscador y fetch son simulados.
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { ADMIN, appDePrueba, tokenDe } from "./ayuda.js";
import { crearRepoEventosMemoria } from "../src/repos/eventos.memoria.js";
import { AVISO_SIN_FOTO_DE_INSTAGRAM } from "../src/routes/eventos.js";
import { MENSAJE_ENLACE_INVALIDO, direccionDeInstagram } from "../src/services/instagram/enlace.js";
import {
  crearBuscadorDeFoto,
  fotoDeVistaPrevia,
  tipoDeImagen,
} from "../src/services/instagram/fotoDePublicacion.js";
import { PESO_MAXIMO_FOTO } from "../src/services/media/fotosEventos.js";
import {
  MENSAJE_ENLACE_INVALIDO as MENSAJE_DEL_CLIENTE,
  direccionDeInstagram as direccionDelCliente,
  enlaceDeInstagram,
} from "../../client/src/eventos.js";

const con = (req, token) => req.set("Authorization", `Bearer ${token}`);

const PUBLICACION = "https://www.instagram.com/p/DPq1abc_2/";
const FOTO_DE_LA_PC = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
// Primeros bytes de un JPG: alcanzan para reconocer el tipo.
const BYTES_JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const FOTO_OBTENIDA = `data:image/jpeg;base64,${BYTES_JPG.toString("base64")}`;

const datosDelEvento = (extra = {}) => ({
  titulo: "Jornada de panadería",
  descripcion: "Los alumnos de primer año prepararon panes de masa madre.",
  fechaEvento: "2026-11-05T18:00:00.000Z",
  fotoPrincipal: "/media/instagram/placeholder.svg",
  estado: "visible",
  ...extra,
});

// Lo mismo que manda el formulario cuando solo se pega el enlace.
const conEnlace = (enlace, extra = {}) =>
  datosDelEvento({ videoUrl: enlace, medios: [{ id: "1", tipo: "VIDEO", url: enlace }], ...extra });

// Reemplaza a Cloudinary: registra lo que se sube y lo que se borra.
function fotosDePrueba() {
  const subidas = [];
  const borradas = [];
  return {
    subidas,
    borradas,
    async subir(dataUrl, { nombre }) {
      const publicId = `ifts2/eventos/${nombre}`;
      subidas.push({ publicId, dataUrl });
      return { url: `https://res.cloudinary.com/prueba/image/upload/${publicId}`, publicId };
    },
    async borrar(publicId) {
      borradas.push(publicId);
    },
  };
}

// Buscador simulado: devuelve "resultado" y registra con qué dirección se lo llamó.
function buscadorDePrueba(resultado = null) {
  const pedidos = [];
  const buscar = async (direccion) => {
    pedidos.push(direccion);
    return resultado;
  };
  buscar.pedidos = pedidos;
  return buscar;
}

async function preparar({ resultado = null, eventos = crearRepoEventosMemoria(), ...opciones } = {}) {
  const fotos = "fotosEventos" in opciones ? opciones.fotosEventos : fotosDePrueba();
  const buscar = buscadorDePrueba(resultado);
  const { app } = await appDePrueba({ eventos, fotosEventos: fotos, buscarFotoDeInstagram: buscar });
  const token = await tokenDe(app, ADMIN);
  return { app, token, eventos, fotos, buscar };
}

// ----- Enlace -----

test("alta con un enlace inválido: responde 400 y no guarda, no descarga ni sube nada", async () => {
  const invalidos = [
    "javascript:alert(1)//https://www.instagram.com/p/x/",
    "http://www.instagram.com/p/DPq1abc_2/",
    "https://otro.sitio/instagram.com/p/DPq1abc_2/",
    "https://otro.sitio/?instagram.com",
    "https://www.instagram.com/ifts_2_ok/",
    "https://www.instagram.com/",
    "instagram.com/p/DPq1abc_2/",
  ];
  const { app, token, eventos, fotos, buscar } = await preparar({ resultado: FOTO_OBTENIDA });

  for (const enlace of invalidos) {
    const res = await con(request(app).post("/api/events").send(conEnlace(enlace)), token);
    assert.equal(res.status, 400, enlace);
    assert.equal(res.body.error, MENSAJE_ENLACE_INVALIDO, enlace);
  }
  // Con fotos de la computadora y un enlace inválido tampoco se sube ninguna foto.
  const conFotos = datosDelEvento({
    videoUrl: "https://otro.sitio/?instagram.com",
    fotoPrincipal: undefined,
    medios: [{ id: "1", tipo: "IMAGE", url: FOTO_DE_LA_PC }],
  });
  const res = await con(request(app).post("/api/events").send(conFotos), token);
  assert.equal(res.status, 400);

  assert.equal((await eventos.listar()).length, 0);
  assert.equal(buscar.pedidos.length, 0);
  assert.equal(fotos.subidas.length, 0);
});

test("alta con un enlace válido con parámetros: se guarda la dirección sin parámetros", async (t) => {
  t.mock.method(console, "warn", () => {});
  const { app, token, eventos, buscar } = await preparar();

  const res = await con(request(app).post("/api/events").send(conEnlace(`${PUBLICACION}?igsh=abc123`)), token);

  assert.equal(res.status, 201);
  const [guardado] = await eventos.listar();
  assert.equal(guardado.videoUrl, PUBLICACION);
  assert.deepEqual(
    guardado.medios.map((m) => [m.tipo, m.url]),
    [["VIDEO", PUBLICACION]],
  );
  assert.deepEqual(buscar.pedidos, [PUBLICACION], "se busca la foto con la dirección revisada");
});

// ----- Foto de la publicación -----

test("alta con enlace y sin fotos: la foto obtenida se guarda como una foto del panel", async () => {
  const { app, token, eventos, fotos } = await preparar({ resultado: FOTO_OBTENIDA });

  const res = await con(request(app).post("/api/events").send(conEnlace(PUBLICACION)), token);

  assert.equal(res.status, 201);
  assert.equal(res.body.aviso, undefined);
  assert.equal(fotos.subidas.length, 1);
  assert.equal(fotos.subidas[0].dataUrl, FOTO_OBTENIDA);
  assert.match(fotos.subidas[0].publicId, /^ifts2\/eventos\//);

  const [guardado] = await eventos.listar();
  assert.equal(guardado.medios.length, 1);
  assert.equal(guardado.medios[0].tipo, "IMAGE");
  assert.equal(guardado.medios[0].publicId, fotos.subidas[0].publicId);
  assert.equal(guardado.fotoPrincipal, guardado.medios[0].url, "la foto obtenida es la portada");
  assert.ok(!JSON.stringify(guardado).includes("data:image"), "no queda ninguna foto en base64");
  // El evento conserva el enlace a la publicación original: el sitio lo usa para «Ver en Instagram».
  assert.equal(guardado.videoUrl, PUBLICACION);
  assert.equal(enlaceDeInstagram(guardado), PUBLICACION);
});

test("alta con enlace sin foto obtenida: se guarda con la publicación incrustada y con el aviso", async () => {
  const { app, token, eventos, fotos } = await preparar({ resultado: null });

  const res = await con(request(app).post("/api/events").send(conEnlace(PUBLICACION)), token);

  assert.equal(res.status, 201);
  assert.equal(res.body.aviso, AVISO_SIN_FOTO_DE_INSTAGRAM);
  assert.equal(fotos.subidas.length, 0);
  const [guardado] = await eventos.listar();
  assert.deepEqual(
    guardado.medios.map((m) => [m.tipo, m.url]),
    [["VIDEO", PUBLICACION]],
  );
  assert.equal(enlaceDeInstagram(guardado), PUBLICACION);
});

test("alta con fotos de la computadora y enlace: no se busca la foto de la publicación", async () => {
  const { app, token, eventos, fotos, buscar } = await preparar({ resultado: FOTO_OBTENIDA });

  const datos = datosDelEvento({
    videoUrl: PUBLICACION,
    fotoPrincipal: undefined,
    medios: [{ id: "1", tipo: "IMAGE", url: FOTO_DE_LA_PC }],
  });
  const res = await con(request(app).post("/api/events").send(datos), token);

  assert.equal(res.status, 201);
  assert.equal(res.body.aviso, undefined);
  assert.equal(buscar.pedidos.length, 0);
  assert.deepEqual(fotos.subidas.map((s) => s.dataUrl), [FOTO_DE_LA_PC]);
  const [guardado] = await eventos.listar();
  assert.equal(guardado.videoUrl, PUBLICACION);
});

test("alta con enlace sin almacenamiento de fotos: no se descarga nada y se guarda con el aviso", async () => {
  const { app, token, eventos, buscar } = await preparar({ resultado: FOTO_OBTENIDA, fotosEventos: null });

  const res = await con(request(app).post("/api/events").send(conEnlace(PUBLICACION)), token);

  assert.equal(res.status, 201, "no responde 503: la publicación incrustada no necesita guardar fotos");
  assert.equal(res.body.aviso, AVISO_SIN_FOTO_DE_INSTAGRAM);
  assert.equal(buscar.pedidos.length, 0);
  const [guardado] = await eventos.listar();
  assert.equal(guardado.medios[0].url, PUBLICACION);
});

test("alta con enlace: si el evento no se guarda, la foto obtenida se borra", async (t) => {
  t.mock.method(console, "error", () => {});
  const eventos = crearRepoEventosMemoria();
  eventos.crear = async () => {
    throw new Error("MongoDB no responde");
  };
  const { app, token, fotos } = await preparar({ resultado: FOTO_OBTENIDA, eventos });

  const res = await con(request(app).post("/api/events").send(conEnlace(PUBLICACION)), token);

  assert.equal(res.status, 500);
  assert.equal(fotos.subidas.length, 1);
  assert.deepEqual(fotos.borradas, [fotos.subidas[0].publicId]);
});

// ----- Tipo de medio -----

test("alta: el tipo de medio sale de las fotos guardadas, no del formulario", async (t) => {
  t.mock.method(console, "warn", () => {});
  const casos = [
    // [nombre, resultado del buscador, datos del alta, tipo esperado]
    ["solo enlace, sin foto obtenida", null, conEnlace(PUBLICACION, { tipoMedio: "VIDEO" }), "IMAGE"],
    ["solo enlace, con foto obtenida", FOTO_OBTENIDA, conEnlace(PUBLICACION, { tipoMedio: "VIDEO" }), "IMAGE"],
    [
      "dos fotos de la computadora",
      null,
      datosDelEvento({
        fotoPrincipal: undefined,
        tipoMedio: "IMAGE",
        medios: [
          { id: "1", tipo: "IMAGE", url: FOTO_DE_LA_PC },
          { id: "2", tipo: "IMAGE", url: FOTO_OBTENIDA },
        ],
      }),
      "CAROUSEL_ALBUM",
    ],
  ];
  for (const [nombre, resultado, datos, esperado] of casos) {
    const { app, token, eventos } = await preparar({ resultado });
    const res = await con(request(app).post("/api/events").send(datos), token);
    assert.equal(res.status, 201, nombre);
    const [guardado] = await eventos.listar();
    assert.equal(guardado.tipoMedio, esperado, nombre);
  }
});

test("un evento cargado solo con el enlace se puede editar después para agregarle una foto", async () => {
  const { app, token, eventos } = await preparar({ resultado: null });
  const alta = await con(request(app).post("/api/events").send(conEnlace(PUBLICACION)), token);
  const id = alta.body.evento.id;

  const res = await con(
    request(app).put(`/api/events/${id}`).send({ ...datosDelEvento(), fotos: [FOTO_DE_LA_PC] }),
    token,
  );

  assert.equal(res.status, 200);
  const guardado = await eventos.buscarPorId(id);
  const fotos = guardado.medios.filter((m) => m.tipo === "IMAGE");
  assert.equal(fotos.length, 1);
  assert.equal(guardado.fotoPrincipal, fotos[0].url, "la foto agregada es la portada");
  assert.equal(enlaceDeInstagram(guardado), PUBLICACION, "conserva el enlace a la publicación");
});

// ----- Buscador de la foto (fetch simulado) -----

const paginaCon = (meta) => `<!doctype html><html><head>${meta}<title>Instagram</title></head><body></body></html>`;
const FOTO_EN_CDN = "https://scontent-eze1-1.cdninstagram.com/v/t51/foto.jpg?stp=dst-jpg&amp;_nc_ht=x";

// fetch simulado: "rutas" asigna a cada dirección una función que devuelve la respuesta.
function fetchDePrueba(rutas) {
  const pedidos = [];
  const buscar = async (direccion, opciones = {}) => {
    pedidos.push({ direccion, opciones });
    const responder = rutas[direccion];
    if (!responder) throw new Error(`dirección inesperada: ${direccion}`);
    return responder(opciones);
  };
  buscar.pedidos = pedidos;
  return buscar;
}

const html = (texto, estado = 200) => () =>
  new Response(texto, { status: estado, headers: { "content-type": "text/html; charset=utf-8" } });
const imagen = (bytes, tipo = "image/jpeg") => () =>
  new Response(bytes, { status: 200, headers: { "content-type": tipo } });
const redireccion = (destino) => () => new Response(null, { status: 302, headers: { location: destino } });
const FOTO_DESCARGADA = "https://scontent-eze1-1.cdninstagram.com/v/t51/foto.jpg?stp=dst-jpg&_nc_ht=x";

test("buscador: lee og:image, descarga la foto del CDN de Instagram y la devuelve como data URL", async () => {
  const buscar = fetchDePrueba({
    [PUBLICACION]: html(paginaCon(`<meta property="og:image" content="${FOTO_EN_CDN}" />`)),
    [FOTO_DESCARGADA]: imagen(BYTES_JPG),
  });

  const foto = await crearBuscadorDeFoto({ fetch: buscar })(PUBLICACION);

  assert.equal(foto, FOTO_OBTENIDA);
  assert.deepEqual(buscar.pedidos.map((p) => p.direccion), [PUBLICACION, FOTO_DESCARGADA]);
  assert.ok(buscar.pedidos.every((p) => p.opciones.redirect === "manual"), "las redirecciones no se siguen solas");
  assert.ok(buscar.pedidos.every((p) => p.opciones.signal), "los pedidos tienen tiempo máximo");
});

test("buscador: encuentra og:image con los atributos en cualquier orden", () => {
  assert.equal(fotoDeVistaPrevia(paginaCon(`<meta content="${FOTO_EN_CDN}" property="og:image">`)), FOTO_DESCARGADA);
  assert.equal(fotoDeVistaPrevia(paginaCon(`<meta property='og:image' content='${FOTO_EN_CDN}'>`)), FOTO_DESCARGADA);
  assert.equal(fotoDeVistaPrevia(paginaCon(`<meta name="og:image" content="${FOTO_EN_CDN}">`)), FOTO_DESCARGADA);
  assert.equal(fotoDeVistaPrevia(paginaCon(`<meta property="og:title" content="Título">`)), null);
});

test("buscador: reconoce JPG, PNG y WebP por sus primeros bytes", () => {
  assert.equal(tipoDeImagen(BYTES_JPG), "image/jpeg");
  assert.equal(tipoDeImagen(Buffer.from(FOTO_DE_LA_PC.split(",")[1], "base64")), "image/png");
  assert.equal(tipoDeImagen(Buffer.from("RIFF\x00\x00\x00\x00WEBPVP8 ", "latin1")), "image/webp");
  assert.equal(tipoDeImagen(Buffer.from("<!doctype html>")), null);
  assert.equal(tipoDeImagen(Buffer.from("GIF89a")), null);
});

test("buscador: sigue una redirección dentro de Instagram, revisándola antes", async () => {
  const sinWww = "https://instagram.com/p/DPq1abc_2/";
  const buscar = fetchDePrueba({
    [sinWww]: redireccion(PUBLICACION),
    [PUBLICACION]: html(paginaCon(`<meta property="og:image" content="${FOTO_EN_CDN}">`)),
    [FOTO_DESCARGADA]: imagen(BYTES_JPG),
  });

  assert.equal(await crearBuscadorDeFoto({ fetch: buscar })(sinWww), FOTO_OBTENIDA);
});

test("buscador: devuelve null ante cada falla, sin pedir direcciones no permitidas", async (t) => {
  t.mock.method(console, "warn", () => {});
  const casos = {
    "redirección de la página a otro dominio": {
      [PUBLICACION]: redireccion("https://otro.sitio/login"),
    },
    "redirección de la foto a otro dominio": {
      [PUBLICACION]: html(paginaCon(`<meta property="og:image" content="${FOTO_EN_CDN}">`)),
      [FOTO_DESCARGADA]: redireccion("http://169.254.169.254/latest/meta-data"),
    },
    "demasiadas redirecciones": {
      [PUBLICACION]: redireccion("https://www.instagram.com/p/DPq1abc_2/?a=1"),
      "https://www.instagram.com/p/DPq1abc_2/?a=1": redireccion("https://www.instagram.com/p/DPq1abc_2/?a=2"),
      "https://www.instagram.com/p/DPq1abc_2/?a=2": redireccion("https://www.instagram.com/p/DPq1abc_2/?a=3"),
      "https://www.instagram.com/p/DPq1abc_2/?a=3": redireccion("https://www.instagram.com/p/DPq1abc_2/?a=4"),
    },
    "la página responde 404": { [PUBLICACION]: html("No encontrada", 404) },
    "la página no tiene og:image (por ejemplo, la pantalla de inicio de sesión)": {
      [PUBLICACION]: html(paginaCon(`<meta property="og:title" content="Instagram">`)),
    },
    "og:image en otro dominio": {
      [PUBLICACION]: html(paginaCon(`<meta property="og:image" content="https://otro.sitio/foto.jpg">`)),
    },
    "og:image sin https": {
      [PUBLICACION]: html(paginaCon(`<meta property="og:image" content="http://scontent.cdninstagram.com/foto.jpg">`)),
    },
    "el archivo no es una imagen aunque diga image/jpeg": {
      [PUBLICACION]: html(paginaCon(`<meta property="og:image" content="${FOTO_EN_CDN}">`)),
      [FOTO_DESCARGADA]: imagen(Buffer.from("<!doctype html><p>no es una foto</p>")),
    },
    "la foto informa que pesa más de 4 MB": {
      [PUBLICACION]: html(paginaCon(`<meta property="og:image" content="${FOTO_EN_CDN}">`)),
      [FOTO_DESCARGADA]: () =>
        new Response(BYTES_JPG, {
          status: 200,
          headers: { "content-type": "image/jpeg", "content-length": String(PESO_MAXIMO_FOTO + 1) },
        }),
    },
    "la foto pesa más de 4 MB sin informarlo": {
      [PUBLICACION]: html(paginaCon(`<meta property="og:image" content="${FOTO_EN_CDN}">`)),
      [FOTO_DESCARGADA]: () =>
        new Response(
          new ReadableStream({
            start(controlador) {
              controlador.enqueue(new Uint8Array(BYTES_JPG));
              controlador.enqueue(new Uint8Array(PESO_MAXIMO_FOTO));
              controlador.close();
            },
          }),
          { status: 200, headers: { "content-type": "image/jpeg" } },
        ),
    },
    "error de conexión": {
      [PUBLICACION]: () => {
        throw new TypeError("fetch failed");
      },
    },
  };

  for (const [nombre, rutas] of Object.entries(casos)) {
    const buscar = fetchDePrueba(rutas);
    assert.equal(await crearBuscadorDeFoto({ fetch: buscar })(PUBLICACION), null, nombre);
    for (const { direccion } of buscar.pedidos) {
      const dominio = new URL(direccion).hostname;
      assert.ok(
        dominio === "www.instagram.com" || dominio.endsWith(".cdninstagram.com"),
        `${nombre}: no se pide ${direccion}`,
      );
    }
  }
});

test("buscador: con el tiempo agotado devuelve null", async (t) => {
  t.mock.method(console, "warn", () => {});
  // La página no responde nunca: solo termina cuando se cancela el pedido.
  const buscar = fetchDePrueba({
    [PUBLICACION]: ({ signal }) =>
      new Promise((_, rechazar) => signal.addEventListener("abort", () => rechazar(signal.reason))),
  });

  const inicio = Date.now();
  assert.equal(await crearBuscadorDeFoto({ fetch: buscar, tiempoMaximoMs: 50 })(PUBLICACION), null);
  assert.ok(Date.now() - inicio < 2000);
});

// ----- Cliente y servidor -----

test("el cliente y el servidor revisan el enlace con la misma regla y el mismo mensaje", () => {
  const casos = [
    PUBLICACION,
    `${PUBLICACION}?igsh=abc`,
    "https://instagram.com/reel/DPq9xyz",
    "https://www.instagram.com/ifts_2_ok/p/DPq1abc_2/",
    "https://www.instagram.com/tv/abc-123/",
    " https://www.instagram.com/p/DPq1abc_2/ ",
    "javascript:alert(1)//https://www.instagram.com/p/x/",
    "http://www.instagram.com/p/DPq1abc_2/",
    "https://otro.sitio/instagram.com/p/DPq1abc_2/",
    "https://www.instagram.com/ifts_2_ok/",
    "https://www.instagram.com/stories/ifts_2_ok/123/",
    "",
    null,
  ];
  for (const caso of casos) {
    assert.equal(direccionDeInstagram(caso), direccionDelCliente(caso), String(caso));
  }
  assert.equal(MENSAJE_ENLACE_INVALIDO, MENSAJE_DEL_CLIENTE);
});
