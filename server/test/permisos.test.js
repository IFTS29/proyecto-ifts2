import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import request from "supertest";
import { ADMIN, BEDELIA, appDePrueba, tokenDe } from "./ayuda.js";

// Matriz de permisos por rol (#109). Recorre todas las rutas de la API con tres visitantes:
// sin sesión, Bedelía y Administrador, y comprueba si el servidor la rechaza por permisos.
// Es la tabla de docs/matriz-de-permisos.md: si se agrega una ruta, hay que sumarla acá y allá.
//
// Qué se comprueba:
// - Rechazo por permisos: 401 si no hay sesión, 403 si la sesión no tiene el rol que pide la ruta.
// - Acceso permitido: el servidor no responde 401 ni 403. Puede responder 400, 404 o 200 según los datos: lo
//   que importa acá es que el permiso no lo frena. Por eso se usan cuerpos vacíos e ids que no existen.
//   Nada de lo que se pide queda guardado.
//
// Quién accede a cada ruta: "publica" (todos), "sesion" (cualquiera con sesión), "panel" (Administrador y
// Bedelía) o "admin" (solo Administrador).
const RUTAS = [
  // Público
  ["GET", "/api/salud", "publica"],
  ["POST", "/api/contact", "publica"],
  ["GET", "/api/events", "publica"],
  ["GET", "/api/events/x", "publica"],
  ["GET", "/api/academic/vigente", "publica"],
  ["GET", "/api/academic/vigente/horarios.pdf", "publica"],
  ["GET", "/api/academic/vigente/mesas.pdf", "publica"],
  ["GET", "/api/content", "publica"],
  ["GET", "/api/instagram/status", "publica"],
  ["GET", "/api/instagram/feed", "publica"],

  // Cualquier sesión
  ["GET", "/api/auth/yo", "sesion"],

  // Usuarios
  ["GET", "/api/users", "admin"],
  ["POST", "/api/users", "admin"],
  ["PUT", "/api/users/x", "admin"],
  ["DELETE", "/api/users/x", "admin"],

  // Eventos (panel)
  ["GET", "/api/events/admin", "admin"],
  ["GET", "/api/events/admin/x", "admin"],
  ["POST", "/api/events", "admin"],
  ["PUT", "/api/events/x", "admin"],
  ["PATCH", "/api/events/x/estado", "admin"],
  ["PATCH", "/api/events/x/visible-siempre", "admin"],

  // Instagram (panel)
  ["POST", "/api/instagram/sync", "admin"],

  // Contenido institucional (panel)
  ["PUT", "/api/content/perfil", "admin"],
  ["PUT", "/api/content/inexistente", "admin"],
  ["GET", "/api/content/ingreso/historial", "admin"],

  // Horarios de cursada (panel)
  ["GET", "/api/academic/periodos", "panel"],
  ["GET", "/api/academic/periodos/2027-1", "panel"],
  ["POST", "/api/academic/horarios", "panel"],
  ["PUT", "/api/academic/horarios/x", "panel"],
  ["DELETE", "/api/academic/horarios/x", "panel"],
  ["POST", "/api/academic/periodos/2027-1/reutilizar", "panel"],
  ["POST", "/api/academic/periodos/2027-1/publicar", "panel"],
  ["POST", "/api/academic/periodos/2027-1/retirar", "panel"],
  ["GET", "/api/academic/periodos/2027-1/vista-previa.pdf", "panel"],

  // Mesas de examen (panel)
  ["GET", "/api/academic/llamados", "panel"],
  ["POST", "/api/academic/llamados", "panel"],
  ["GET", "/api/academic/llamados/x", "panel"],
  ["PUT", "/api/academic/llamados/x", "panel"],
  ["DELETE", "/api/academic/llamados/x", "panel"],
  ["POST", "/api/academic/llamados/x/mesas", "panel"],
  ["PUT", "/api/academic/mesas/x", "panel"],
  ["DELETE", "/api/academic/mesas/x", "panel"],
  ["POST", "/api/academic/llamados/x/publicar", "panel"],
  ["POST", "/api/academic/llamados/x/retirar", "panel"],
  ["GET", "/api/academic/llamados/x/vista-previa.pdf", "panel"],
];

const PUEDEN = {
  publica: { anonimo: true, bedelia: true, admin: true },
  sesion: { anonimo: false, bedelia: true, admin: true },
  panel: { anonimo: false, bedelia: true, admin: true },
  admin: { anonimo: false, bedelia: false, admin: true },
};

const pedir = (app, metodo, ruta, token) => {
  const req = request(app)[metodo.toLowerCase()](ruta);
  return token ? req.set("Authorization", `Bearer ${token}`).send({}) : req.send({});
};

async function sesiones() {
  const { app, usuarios } = await appDePrueba();
  return {
    app,
    usuarios,
    tokens: { anonimo: null, bedelia: await tokenDe(app, BEDELIA), admin: await tokenDe(app, ADMIN) },
  };
}

test("la matriz de permisos cubre todas las rutas de la API", async () => {
  const { app, tokens } = await sesiones();
  // Se pide cada ruta de la tabla con sesión de Administrador y se comprueba que ninguna salga como "ruta no
  // encontrada" (404 del prefijo /api): sería un error de tipeo en la tabla o una ruta que ya no existe.
  for (const [metodo, ruta] of RUTAS) {
    const res = await pedir(app, metodo, ruta, tokens.admin);
    assert.notEqual(res.body?.error, "Ruta no encontrada", `${metodo} ${ruta} no existe en la API`);
  }
});

for (const [metodo, ruta, quien] of RUTAS) {
  for (const perfil of ["anonimo", "bedelia", "admin"]) {
    const puede = PUEDEN[quien][perfil];
    const esperado = puede ? "pasa" : perfil === "anonimo" ? "401" : "403";
    test(`${metodo} ${ruta} · ${perfil}: ${esperado}`, async () => {
      const { app, tokens } = await sesiones();
      const res = await pedir(app, metodo, ruta, tokens[perfil]);
      if (puede) {
        assert.ok(![401, 403].includes(res.status), `respondió ${res.status}: ${res.body?.error ?? ""}`);
      } else {
        assert.equal(res.status, perfil === "anonimo" ? 401 : 403, res.body?.error);
      }
    });
  }
}

test("un token con una firma que no es la del servidor no da acceso", async () => {
  const { app, usuarios } = await appDePrueba();
  const admin = await usuarios.buscarPorMail(ADMIN.mail);
  const falso = jwt.sign({ sub: admin.id, rol: "admin" }, "otra-clave");
  assert.equal((await pedir(app, "GET", "/api/users", falso)).status, 401);
});

test("un token vencido no da acceso", async () => {
  const { app, usuarios, config } = await appDePrueba();
  const admin = await usuarios.buscarPorMail(ADMIN.mail);
  const vencido = jwt.sign({ sub: admin.id, rol: "admin" }, config.jwtSecret, { expiresIn: -10 });
  assert.equal((await pedir(app, "GET", "/api/users", vencido)).status, 401);
});

test("el rol que dice el token no vale: se toma el que tiene el usuario guardado", async () => {
  const { app, usuarios, config } = await appDePrueba();
  const bedelia = await usuarios.buscarPorMail(BEDELIA.mail);
  const token = jwt.sign({ sub: bedelia.id, rol: "admin" }, config.jwtSecret);
  assert.equal((await pedir(app, "GET", "/api/users", token)).status, 403);
  assert.equal((await pedir(app, "GET", "/api/academic/periodos", token)).status, 200);
});

test("un usuario eliminado pierde el acceso aunque su token no haya vencido", async () => {
  const { app, usuarios, tokens } = await sesiones();
  const bedelia = await usuarios.buscarPorMail(BEDELIA.mail);
  assert.equal((await pedir(app, "GET", "/api/academic/periodos", tokens.bedelia)).status, 200);
  await usuarios.eliminar(bedelia.id);
  assert.equal((await pedir(app, "GET", "/api/academic/periodos", tokens.bedelia)).status, 401);
});

test("al cambiar el rol de un usuario, el cambio rige de inmediato con el mismo token", async () => {
  const { app, usuarios, tokens } = await sesiones();
  const bedelia = await usuarios.buscarPorMail(BEDELIA.mail);
  assert.equal((await pedir(app, "GET", "/api/users", tokens.bedelia)).status, 403);
  await usuarios.actualizar(bedelia.id, { rol: "admin" });
  assert.equal((await pedir(app, "GET", "/api/users", tokens.bedelia)).status, 200);
});
