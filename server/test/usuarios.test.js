import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { ADMIN, BEDELIA, appDePrueba, tokenDe } from "./ayuda.js";

const nuevo = { nombre: "Ana Test", mail: "ana@ifts2.edu.ar", rol: "bedelia", password: "Clave1234" };
const con = (req, token) => req.set("Authorization", `Bearer ${token}`);

test("sin sesión no se puede listar usuarios", async () => {
  const { app } = await appDePrueba();
  assert.equal((await request(app).get("/api/users")).status, 401);
});

test("Bedelía no puede ver ni crear usuarios (403)", async () => {
  const { app } = await appDePrueba();
  const token = await tokenDe(app, BEDELIA);
  assert.equal((await con(request(app).get("/api/users"), token)).status, 403);
  assert.equal((await con(request(app).post("/api/users").send(nuevo), token)).status, 403);
});

test("el administrador lista usuarios sin exponer los hashes", async () => {
  const { app } = await appDePrueba();
  const res = await con(request(app).get("/api/users"), await tokenDe(app, ADMIN));
  assert.equal(res.status, 200);
  assert.equal(res.body.usuarios.length, 2);
  assert.ok(res.body.usuarios.every((u) => u.passwordHash === undefined));
});

test("alta de usuario: se guarda con hash y el nuevo usuario puede iniciar sesión", async () => {
  const { app, usuarios } = await appDePrueba();
  const res = await con(request(app).post("/api/users").send(nuevo), await tokenDe(app, ADMIN));
  assert.equal(res.status, 201);
  const guardado = await usuarios.buscarPorMail(nuevo.mail);
  assert.notEqual(guardado.passwordHash, nuevo.password);
  const login = await request(app).post("/api/auth/login").send({ mail: nuevo.mail, password: nuevo.password });
  assert.equal(login.status, 200);
  assert.equal(login.body.usuario.rol, "bedelia");
});

test("alta con correo repetido (aunque cambien las mayúsculas) devuelve 409", async () => {
  const { app } = await appDePrueba();
  const token = await tokenDe(app, ADMIN);
  const res = await con(request(app).post("/api/users").send({ ...nuevo, mail: ADMIN.mail.toUpperCase() }), token);
  assert.equal(res.status, 409);
  assert.match(res.body.error, /Ya hay un usuario/);
});

test("alta con datos inválidos devuelve 400 y el mensaje", async () => {
  const { app } = await appDePrueba();
  const token = await tokenDe(app, ADMIN);
  const casos = [
    [{ ...nuevo, nombre: "" }, /Completá el nombre/],
    [{ ...nuevo, mail: "sin-arroba" }, /formato válido/],
    [{ ...nuevo, rol: "dios" }, /rol/],
    [{ ...nuevo, password: "corta" }, /al menos 8/],
  ];
  for (const [cuerpo, esperado] of casos) {
    const res = await con(request(app).post("/api/users").send(cuerpo), token);
    assert.equal(res.status, 400);
    assert.match(res.body.error, esperado);
  }
});

test("baja de usuario y el usuario eliminado pierde el acceso con su token", async () => {
  const { app } = await appDePrueba();
  const tokenAdmin = await tokenDe(app, ADMIN);
  const tokenBedelia = await tokenDe(app, BEDELIA);
  const lista = await con(request(app).get("/api/users"), tokenAdmin);
  const bedelia = lista.body.usuarios.find((u) => u.mail === BEDELIA.mail);
  const baja = await con(request(app).delete(`/api/users/${bedelia.id}`), tokenAdmin);
  assert.equal(baja.status, 204);
  assert.equal((await con(request(app).get("/api/auth/yo"), tokenBedelia)).status, 401);
});

test("no se puede eliminar el propio usuario ni un id inexistente", async () => {
  const { app } = await appDePrueba();
  const token = await tokenDe(app, ADMIN);
  const yo = (await con(request(app).get("/api/auth/yo"), token)).body.usuario;
  assert.equal((await con(request(app).delete(`/api/users/${yo.id}`), token)).status, 400);
  assert.equal((await con(request(app).delete("/api/users/999"), token)).status, 404);
});

test("un administrador puede eliminar a otro administrador, pero no a sí mismo", async () => {
  const { app } = await appDePrueba();
  const tokenAdmin = await tokenDe(app, ADMIN);
  await con(request(app).post("/api/users").send({ ...nuevo, rol: "admin", mail: "otro@ifts2.edu.ar" }), tokenAdmin);
  const tokenOtro = await tokenDe(app, { mail: "otro@ifts2.edu.ar", password: nuevo.password });
  const lista = (await con(request(app).get("/api/users"), tokenOtro)).body.usuarios;
  const primero = lista.find((u) => u.mail === ADMIN.mail);
  const otro = lista.find((u) => u.mail === "otro@ifts2.edu.ar");
  assert.equal((await con(request(app).delete(`/api/users/${primero.id}`), tokenOtro)).status, 204);
  // queda un solo administrador (el que está logueado) y no puede borrarse a sí mismo
  assert.equal((await con(request(app).delete(`/api/users/${otro.id}`), tokenOtro)).status, 400);
});

// ---- Edición (PUT /api/users/:id) ----

async function conUsuarioNuevo() {
  const base = await appDePrueba();
  const token = await tokenDe(base.app, ADMIN);
  const alta = await con(request(base.app).post("/api/users").send(nuevo), token);
  return { ...base, token, id: alta.body.usuario.id };
}

test("Bedelía no puede editar usuarios (403)", async () => {
  const { app, id } = await conUsuarioNuevo();
  const token = await tokenDe(app, BEDELIA);
  assert.equal((await con(request(app).put(`/api/users/${id}`).send({ nombre: "X" }), token)).status, 403);
});

test("el administrador cambia nombre, correo y rol", async () => {
  const { app, token, id } = await conUsuarioNuevo();
  const res = await con(
    request(app).put(`/api/users/${id}`).send({ nombre: "Ana Pérez", mail: "ANA.PEREZ@ifts2.edu.ar", rol: "admin" }),
    token,
  );
  assert.equal(res.status, 200);
  assert.equal(res.body.usuario.nombre, "Ana Pérez");
  assert.equal(res.body.usuario.mail, "ana.perez@ifts2.edu.ar");
  assert.equal(res.body.usuario.rol, "admin");
  assert.equal(res.body.usuario.passwordHash, undefined);
});

test("cambiar la contraseña la guarda con hash: la vieja deja de servir y la nueva sirve", async () => {
  const { app, usuarios, token, id } = await conUsuarioNuevo();
  const res = await con(request(app).put(`/api/users/${id}`).send({ password: "Nueva5678" }), token);
  assert.equal(res.status, 200);
  assert.notEqual((await usuarios.buscarPorMail(nuevo.mail)).passwordHash, "Nueva5678");
  const vieja = await request(app).post("/api/auth/login").send({ mail: nuevo.mail, password: nuevo.password });
  assert.equal(vieja.status, 401);
  const nueva = await request(app).post("/api/auth/login").send({ mail: nuevo.mail, password: "Nueva5678" });
  assert.equal(nueva.status, 200);
});

test("una contraseña vacía no cambia la contraseña actual", async () => {
  const { app, token, id } = await conUsuarioNuevo();
  const res = await con(request(app).put(`/api/users/${id}`).send({ nombre: "Ana B", password: "" }), token);
  assert.equal(res.status, 200);
  const login = await request(app).post("/api/auth/login").send({ mail: nuevo.mail, password: nuevo.password });
  assert.equal(login.status, 200);
});

test("editar con datos inválidos devuelve 400 y no cambia nada", async () => {
  const { app, token, id } = await conUsuarioNuevo();
  for (const cuerpo of [
    { nombre: "  " },
    { mail: "sin-arroba" },
    { rol: "superadmin" },
    { password: "corta1" },
    { password: "sinmayuscula1" },
    {},
  ]) {
    const res = await con(request(app).put(`/api/users/${id}`).send(cuerpo), token);
    assert.equal(res.status, 400, `debía rechazar ${JSON.stringify(cuerpo)}`);
  }
  const lista = await con(request(app).get("/api/users"), token);
  assert.equal(lista.body.usuarios.find((u) => u.id === id).nombre, nuevo.nombre);
});

test("editar el correo a uno que ya usa otra persona devuelve 409", async () => {
  const { app, token, id } = await conUsuarioNuevo();
  const res = await con(request(app).put(`/api/users/${id}`).send({ mail: ADMIN.mail.toUpperCase() }), token);
  assert.equal(res.status, 409);
});

test("guardar el mismo correo que ya tiene no cuenta como repetido", async () => {
  const { app, token, id } = await conUsuarioNuevo();
  const res = await con(request(app).put(`/api/users/${id}`).send({ mail: nuevo.mail, nombre: "Ana C" }), token);
  assert.equal(res.status, 200);
});

test("nadie puede cambiarse el rol a sí mismo", async () => {
  const { app, usuarios, token } = await conUsuarioNuevo();
  const yo = await usuarios.buscarPorMail(ADMIN.mail);
  const res = await con(request(app).put(`/api/users/${yo.id}`).send({ rol: "bedelia" }), token);
  assert.equal(res.status, 400);
  assert.match(res.body.error, /tu propio rol/);
});

test("editar un usuario que no existe devuelve 404", async () => {
  const { app, token } = await conUsuarioNuevo();
  assert.equal((await con(request(app).put("/api/users/999999").send({ nombre: "X" }), token)).status, 404);
});
