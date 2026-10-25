import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { ADMIN, BEDELIA, appDePrueba, tokenDe } from "./ayuda.js";
import { crearRepoEventosMemoria } from "../src/repos/eventos.memoria.js";
import { crearApp } from "../src/app.js";

const con = (req, token) => req.set("Authorization", `Bearer ${token}`);

const EVENTO_BASE = {
  titulo: "Jornada de Cocina Regional 2026",
  descripcion: "Muestra abierta de recetas regionales elaboradas por estudiantes.",
  fotoPrincipal: "/media/eventos/cocina-regional.jpg",
  fechaEvento: "2026-10-15T18:00:00.000Z",
};

test("GET /api/events público solo devuelve eventos con estado 'visible'", async () => {
  const eventos = crearRepoEventosMemoria();
  await eventos.crear({ ...EVENTO_BASE, titulo: "Evento Visible", estado: "visible" });
  await eventos.crear({ ...EVENTO_BASE, titulo: "Evento Oculto", estado: "oculto" });
  await eventos.crear({ ...EVENTO_BASE, titulo: "Evento Para Revisar", estado: "para_revisar" });

  const { usuarios, config } = await appDePrueba();
  const app = crearApp({ config, usuarios, eventos });

  const res = await request(app).get("/api/events");
  assert.equal(res.status, 200);
  assert.equal(res.body.eventos.length, 1);
  assert.equal(res.body.eventos[0].titulo, "Evento Visible");
  // La ruta pública no expone conteos internos de moderación
  assert.equal(res.body.conteos, undefined);
});

test("GET /api/events/:id público solo devuelve eventos visibles (404 si está oculto o no existe)", async () => {
  const eventos = crearRepoEventosMemoria();
  const visible = await eventos.crear({ ...EVENTO_BASE, titulo: "Evento Visible", estado: "visible" });
  const oculto = await eventos.crear({ ...EVENTO_BASE, titulo: "Evento Oculto", estado: "oculto" });

  const { usuarios, config } = await appDePrueba();
  const app = crearApp({ config, usuarios, eventos });

  const resOk = await request(app).get(`/api/events/${visible.id}`);
  assert.equal(resOk.status, 200);
  assert.equal(resOk.body.evento.titulo, "Evento Visible");

  const resOculto = await request(app).get(`/api/events/${oculto.id}`);
  assert.equal(resOculto.status, 404);

  const resInexistente = await request(app).get("/api/events/99999");
  assert.equal(resInexistente.status, 404);
});

test("GET /api/events/admin exige autenticación y rol admin (401 / 403 / 200)", async () => {
  const eventos = crearRepoEventosMemoria();
  await eventos.crear({ ...EVENTO_BASE, titulo: "Visible 1", estado: "visible" });
  await eventos.crear({ ...EVENTO_BASE, titulo: "Oculto 1", estado: "oculto" });

  const { usuarios, config } = await appDePrueba();
  const app = crearApp({ config, usuarios, eventos });

  // 1. Sin sesión: 401
  const resSinToken = await request(app).get("/api/events/admin");
  assert.equal(resSinToken.status, 401);

  // 2. Rol no administrador (bedelía): 403
  const tokenBedelia = await tokenDe(app, BEDELIA);
  const resBedelia = await con(request(app).get("/api/events/admin"), tokenBedelia);
  assert.equal(resBedelia.status, 403);

  // 3. Administrador: 200 con todos los eventos y conteos
  const tokenAdmin = await tokenDe(app, ADMIN);
  const resAdmin = await con(request(app).get("/api/events/admin"), tokenAdmin);
  assert.equal(resAdmin.status, 200);
  assert.equal(resAdmin.body.eventos.length, 2);
  assert.equal(resAdmin.body.conteos.todos, 2);
  assert.equal(resAdmin.body.conteos.visible, 1);
  assert.equal(resAdmin.body.conteos.oculto, 1);

  // 4. Administrador filtrando por estado específico
  const resOcultos = await con(request(app).get("/api/events/admin?estado=oculto"), tokenAdmin);
  assert.equal(resOcultos.status, 200);
  assert.equal(resOcultos.body.eventos.length, 1);
  assert.equal(resOcultos.body.eventos[0].estado, "oculto");
});

test("POST /api/events sin sesión devuelve 401", async () => {
  const { app } = await appDePrueba();
  const res = await request(app).post("/api/events").send(EVENTO_BASE);
  assert.equal(res.status, 401);
});

test("POST /api/events con usuario bedelia devuelve 403", async () => {
  const { app } = await appDePrueba();
  const token = await tokenDe(app, BEDELIA);
  const res = await con(request(app).post("/api/events").send(EVENTO_BASE), token);
  assert.equal(res.status, 403);
});

test("POST /api/events valida obligatoriedad de título y descripción (400)", async () => {
  const { app } = await appDePrueba();
  const token = await tokenDe(app, ADMIN);

  const sinTitulo = await con(
    request(app).post("/api/events").send({ ...EVENTO_BASE, titulo: "   " }),
    token,
  );
  assert.equal(sinTitulo.status, 400);
  assert.match(sinTitulo.body.error, /título/i);

  const sinDesc = await con(
    request(app).post("/api/events").send({ ...EVENTO_BASE, descripcion: "" }),
    token,
  );
  assert.equal(sinDesc.status, 400);
  assert.match(sinDesc.body.error, /descripción/i);
});

test("POST /api/events con fecha inválida devuelve 400", async () => {
  const { app } = await appDePrueba();
  const token = await tokenDe(app, ADMIN);

  const res = await con(
    request(app).post("/api/events").send({ ...EVENTO_BASE, fechaEvento: "fecha-invalida" }),
    token,
  );
  assert.equal(res.status, 400);
  assert.match(res.body.error, /fecha/i);
});

test("POST /api/events exitoso crea evento manual y lo persiste", async () => {
  const { app } = await appDePrueba();
  const token = await tokenDe(app, ADMIN);

  const nuevoEvento = {
    titulo: "Feria del Libro Gastronómico",
    descripcion: "Presentación de publicaciones y proyectos de investigación culinaria.",
    fechaEvento: "2026-11-20T10:00:00.000Z",
    videoUrl: "https://www.instagram.com/reel/example",
    fotoPrincipal: "/media/eventos/feria.jpg",
    estado: "visible",
  };

  const res = await con(request(app).post("/api/events").send(nuevoEvento), token);
  assert.equal(res.status, 201);
  assert.equal(res.body.evento.titulo, nuevoEvento.titulo);
  assert.equal(res.body.evento.origen, "manual");
  assert.equal(res.body.evento.medios.length, 1);
  assert.equal(res.body.evento.fotoPrincipal, nuevoEvento.fotoPrincipal);

  // Comprobar que aparece en el listado público
  const listado = await request(app).get("/api/events");
  assert.ok(listado.body.eventos.some((e) => e.titulo === nuevoEvento.titulo));
});
