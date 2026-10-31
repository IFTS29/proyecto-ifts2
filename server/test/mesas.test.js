import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { ADMIN, BEDELIA, appDePrueba, tokenDe } from "./ayuda.js";
import { crearRepoAcademicoMemoria } from "../src/repos/academica.memoria.js";
import {
  fechaValida,
  ordenarMesas,
  textoFechaDeMesa,
  textoFechasDelLlamado,
  textoHoraDeMesa,
  validarLlamado,
  validarMesa,
} from "../src/services/mesas.js";
import { columnasMesas } from "../src/services/academica.pdf.js";

// Mesas de examen por llamado (#33): datos de trabajo, copia publicada y PDF.

const con = (req, token) => req.set("Authorization", `Bearer ${token}`);

const LLAMADO = { nombre: "Febrero 2027", desde: "2027-02-09", hasta: "2027-02-20", aviso: "" };
const MESA = { materia: "Nutrición", anioCarrera: 1, fecha: "2027-02-10", hora: "18:00", aula: "", tribunal: "" };

async function panel(perfil = ADMIN, dependencias = {}) {
  const { app } = await appDePrueba(dependencias);
  const token = await tokenDe(app, perfil);
  const llamar = (metodo, ruta, cuerpo) => {
    const req = con(request(app)[metodo](`/api/academic${ruta}`), token);
    return cuerpo === undefined ? req : req.send(cuerpo);
  };
  const publico = (ruta) => request(app).get(`/api/academic${ruta}`);
  return { app, llamar, publico };
}

// Crea un llamado y devuelve su id.
const crearLlamado = async (llamar, datos = LLAMADO) => (await llamar("post", "/llamados", datos)).body.llamado.id;

// Lo que ven los alumnos de un llamado, o undefined si no está publicado.
const loPublicado = async (publico, id) => (await publico("/vigente")).body.llamados.find((l) => l.id === id);

// ---------- Reglas ----------

test("validarLlamado: solo el nombre es obligatorio; fechas válidas y en orden", () => {
  assert.deepEqual(validarLlamado({ nombre: "  Febrero   2027 " }).datos, {
    nombre: "Febrero 2027",
    desde: "",
    hasta: "",
    aviso: "",
    nombreClave: "febrero 2027",
  });
  assert.equal(validarLlamado({}).error, "El nombre del llamado es obligatorio. Por ejemplo: Febrero 2027.");
  assert.match(validarLlamado({ nombre: "x".repeat(61) }).error, /60 caracteres/);
  assert.match(validarLlamado({ nombre: "Febrero", desde: "2027-02-30" }).error, /inicio no es válida/);
  assert.match(validarLlamado({ nombre: "Febrero", hasta: "20/02/2027" }).error, /cierre no es válida/);
  assert.match(validarLlamado({ ...LLAMADO, desde: "2027-02-21" }).error, /anterior a la de inicio/);
  assert.match(validarLlamado({ nombre: "Febrero", aviso: "x".repeat(301) }).error, /300 caracteres/);
});

test("validarMesa: materia y año obligatorios; fecha, hora, aula y mesa examinadora opcionales", () => {
  const { datos } = validarMesa({ materia: " Nutrición ", anioCarrera: "2" });
  assert.deepEqual(datos, { materia: "Nutrición", anioCarrera: 2, fecha: "", hora: "", aula: "", tribunal: "" });
  assert.equal(validarMesa({ anioCarrera: 1 }).error, "La materia es obligatoria.");
  assert.match(validarMesa({ materia: "Nutrición" }).error, /año de la carrera/);
  assert.match(validarMesa({ ...MESA, anioCarrera: 4 }).error, /año de la carrera/);
  assert.match(validarMesa({ ...MESA, fecha: "2027-13-01" }).error, /fecha de la mesa/);
  assert.match(validarMesa({ ...MESA, hora: "25:00" }).error, /formato 18:00/);
  assert.match(validarMesa({ ...MESA, tribunal: "x".repeat(201) }).error, /200 caracteres/);
  assert.equal(fechaValida("2028-02-29"), true);
  assert.equal(fechaValida("2027-02-29"), false);
});

test("orden de las mesas: por fecha y hora, las que no tienen al final; después año y materia", () => {
  const lista = [
    { materia: "Sin fecha", anioCarrera: 1, fecha: "", hora: "" },
    { materia: "Tarde", anioCarrera: 1, fecha: "2027-02-10", hora: "19:00" },
    { materia: "Sin hora", anioCarrera: 1, fecha: "2027-02-10", hora: "" },
    { materia: "Temprano", anioCarrera: 2, fecha: "2027-02-10", hora: "18:00" },
    { materia: "Antes", anioCarrera: 3, fecha: "2027-02-09", hora: "20:00" },
  ];
  assert.deepEqual(
    ordenarMesas(lista).map((m) => m.materia),
    ["Antes", "Temprano", "Tarde", "Sin hora", "Sin fecha"],
  );
});

test("textos: fechas del llamado sin rangos incompletos, y 'A confirmar' en lo que falta", () => {
  assert.equal(textoFechasDelLlamado(LLAMADO), "Del 9 al 20 de febrero de 2027");
  assert.equal(textoFechasDelLlamado({ desde: "2027-02-25", hasta: "2027-03-05" }), "Del 25 de febrero al 5 de marzo de 2027");
  assert.equal(
    textoFechasDelLlamado({ desde: "2026-12-14", hasta: "2027-02-20" }),
    "Del 14 de diciembre de 2026 al 20 de febrero de 2027",
  );
  assert.equal(textoFechasDelLlamado({ desde: "2027-02-09" }), "Desde el 9 de febrero de 2027");
  assert.equal(textoFechasDelLlamado({ hasta: "2027-02-20" }), "Hasta el 20 de febrero de 2027");
  assert.equal(textoFechasDelLlamado({ desde: "2027-02-09", hasta: "2027-02-09" }), "El 9 de febrero de 2027");
  assert.equal(textoFechasDelLlamado({}), "");
  assert.equal(textoFechaDeMesa("2027-02-10"), "Mié. 10/02/2027");
  assert.equal(textoFechaDeMesa("2026-12-14"), "Lun. 14/12/2026");
  assert.equal(textoFechaDeMesa(""), "A confirmar");
  assert.equal(textoHoraDeMesa("18:00"), "18 h");
  assert.equal(textoHoraDeMesa("18:30"), "18:30 h");
  assert.equal(textoHoraDeMesa(""), "A confirmar");
});

test("PDF de mesas: mesa examinadora y aula solo si alguna las tiene, con 'A confirmar' en las que falten", () => {
  const titulos = (mesas) => columnasMesas(mesas).map((c) => c.titulo);
  assert.deepEqual(titulos([MESA]), ["Fecha", "Hora", "Año", "Materia"]);
  const columnas = columnasMesas([MESA, { ...MESA, tribunal: "Aguilar y Sboro" }]);
  assert.deepEqual(columnas.map((c) => c.titulo), ["Fecha", "Hora", "Año", "Materia", "Mesa examinadora"]);
  assert.equal(columnas[4].valor(MESA), "A confirmar");
  // Ordinal con la "o" volada, no con el signo de grado.
  assert.equal(columnas[2].valor(MESA), "1.º");
});

// ---------- Llamados ----------

test("llamados: alta, nombre único sin contar mayúsculas ni espacios, y edición", async () => {
  const { llamar } = await panel();
  const alta = await llamar("post", "/llamados", LLAMADO);
  assert.equal(alta.status, 201);
  assert.equal(alta.body.llamado.publicado, false);
  assert.equal(alta.body.llamado.sePublico, false);

  for (const nombre of ["Febrero 2027", " febrero 2027 ", "FEBRERO  2027"]) {
    const repetido = await llamar("post", "/llamados", { nombre });
    assert.equal(repetido.status, 409);
    assert.match(repetido.body.error, /Ya existe un llamado con el nombre "Febrero 2027"/);
  }

  const julio = await crearLlamado(llamar, { nombre: "Julio 2027" });
  assert.equal((await llamar("put", `/llamados/${julio}`, { nombre: "febrero 2027" })).status, 409);
  const editado = await llamar("put", `/llamados/${julio}`, { nombre: "Julio-agosto 2027", desde: "2027-07-20" });
  assert.equal(editado.body.llamado.nombre, "Julio-agosto 2027");
  // Cambiar solo mayúsculas del propio nombre no choca consigo mismo.
  const mayusculas = { nombre: "JULIO-AGOSTO 2027", desde: "2027-07-20" };
  assert.equal((await llamar("put", `/llamados/${julio}`, mayusculas)).status, 200);

  const { llamados } = (await llamar("get", "/llamados")).body;
  assert.deepEqual(llamados.map((l) => l.nombre), ["JULIO-AGOSTO 2027", "Febrero 2027"]);
  assert.equal((await llamar("get", "/llamados/999")).status, 404);
});

test("mesas: alta con lo mínimo, corrección y baja en los datos de trabajo", async () => {
  const { llamar } = await panel();
  const id = await crearLlamado(llamar);
  const alta = await llamar("post", `/llamados/${id}/mesas`, { materia: "Nutrición", anioCarrera: 1 });
  assert.equal(alta.status, 201);
  assert.equal(alta.body.mesa.fecha, "");

  const { mesa } = alta.body;
  const corregida = await llamar("put", `/mesas/${mesa.id}`, { ...MESA, hora: "19:30" });
  assert.equal(corregida.body.mesa.hora, "19:30");
  assert.equal(corregida.body.mesa.llamadoId, id);

  assert.equal((await llamar("post", "/llamados/999/mesas", MESA)).status, 404);
  assert.equal((await llamar("put", `/mesas/${mesa.id}`, { ...MESA, materia: "" })).status, 400);
  assert.equal((await llamar("delete", `/mesas/${mesa.id}`)).status, 204);
  assert.equal((await llamar("delete", `/mesas/${mesa.id}`)).status, 404);
});

test("nombre repetido por dos altas simultáneas: el índice único de MongoDB se responde con 409", async () => {
  // Repositorio que se comporta como MongoDB cuando el índice único frena el guardado (código 11000).
  const llamados = crearRepoAcademicoMemoria();
  const duplicado = () => Promise.reject(Object.assign(new Error("E11000 duplicate key"), { code: 11000 }));
  const { llamar } = await panel(ADMIN, { llamados: { ...llamados, crear: duplicado, actualizar: duplicado } });

  const alta = await llamar("post", "/llamados", LLAMADO);
  assert.equal(alta.status, 409);
  assert.equal(alta.body.error, "Ya existe un llamado con ese nombre.");

  const existente = await llamados.crear({ ...LLAMADO, nombreClave: "febrero 2027", publicacion: null });
  const edicion = await llamar("put", `/llamados/${existente.id}`, { nombre: "Julio 2027" });
  assert.equal(edicion.status, 409);
});

test("eliminar un llamado: primero sus mesas; si algo falla, el llamado sigue y se puede reintentar", async () => {
  const mesas = crearRepoAcademicoMemoria();
  let fallar = true;
  const eliminarOriginal = mesas.eliminar;
  mesas.eliminar = async (id) => {
    if (fallar) {
      fallar = false;
      throw new Error("Falla de conexión");
    }
    return eliminarOriginal(id);
  };
  const { llamar } = await panel(ADMIN, { mesas });
  const id = await crearLlamado(llamar);
  await llamar("post", `/llamados/${id}/mesas`, MESA);
  await llamar("post", `/llamados/${id}/mesas`, { ...MESA, materia: "Pastelería básica" });

  assert.equal((await llamar("delete", `/llamados/${id}`)).status, 500);
  assert.equal((await llamar("get", `/llamados/${id}`)).status, 200);

  assert.equal((await llamar("delete", `/llamados/${id}`)).status, 204);
  assert.equal((await llamar("get", `/llamados/${id}`)).status, 404);
  assert.deepEqual(await mesas.listar({ llamadoId: id }), []);
});

// ---------- Publicación ----------

test("guardar no cambia lo publicado hasta actualizar; Ver cambios compara mesas y datos del llamado", async () => {
  const { llamar, publico } = await panel();
  const id = await crearLlamado(llamar);
  const { mesa } = (await llamar("post", `/llamados/${id}/mesas`, { ...MESA, fecha: "", hora: "" })).body;
  assert.equal(await loPublicado(publico, id), undefined);

  const publicado = (await llamar("post", `/llamados/${id}/publicar`)).body.llamado;
  assert.equal(publicado.publicado, true);
  assert.deepEqual(publicado.cambios, []);

  // Bedelía confirma la fecha y cambia el aviso, pero todavía no actualiza.
  await llamar("put", `/mesas/${mesa.id}`, { ...MESA, fecha: "2027-02-15", hora: "18:30" });
  await llamar("put", `/llamados/${id}`, { ...LLAMADO, aviso: "Inscripción en SIU Guaraní." });
  await llamar("post", `/llamados/${id}/mesas`, { ...MESA, materia: "Pastelería básica", anioCarrera: 2 });

  const visto = await loPublicado(publico, id);
  assert.equal(visto.mesas.length, 1);
  assert.equal(visto.mesas[0].fecha, "");
  assert.equal(visto.aviso, "");

  const { cambios } = (await llamar("get", `/llamados/${id}`)).body.llamado;
  assert.deepEqual(
    cambios.map((c) => `${c.materia} · ${c.cambio}${c.guardado ? ` · ${c.publicado} → ${c.guardado}` : ""}`),
    [
      "Datos del llamado · Aviso · — → Inscripción en SIU Guaraní.",
      "Nutrición · Fecha · — → 2027-02-15",
      "Nutrición · Hora · — → 18:30",
      "Pastelería básica · Se agrega",
    ],
  );
  assert.equal((await llamar("get", "/llamados")).body.llamados[0].hayCambios, true);

  await llamar("post", `/llamados/${id}/publicar`);
  const actualizado = await loPublicado(publico, id);
  // Ordenadas por fecha: Pastelería básica (10/02) antes que Nutrición (15/02).
  assert.deepEqual(actualizado.mesas.map((m) => m.materia), ["Pastelería básica", "Nutrición"]);
  assert.equal(actualizado.aviso, "Inscripción en SIU Guaraní.");
});

test("eliminar una mesa publicada: sigue en el sitio hasta actualizar", async () => {
  const { llamar, publico } = await panel();
  const id = await crearLlamado(llamar);
  const { mesa } = (await llamar("post", `/llamados/${id}/mesas`, MESA)).body;
  await llamar("post", `/llamados/${id}/publicar`);

  await llamar("delete", `/mesas/${mesa.id}`);
  assert.equal((await loPublicado(publico, id)).mesas.length, 1);
  const { cambios } = (await llamar("get", `/llamados/${id}`)).body.llamado;
  assert.deepEqual(cambios.map((c) => c.cambio), ["Se quita del sitio"]);

  await llamar("post", `/llamados/${id}/publicar`);
  assert.equal((await loPublicado(publico, id)).mesas.length, 0);
});

test("un llamado se publica sin mesas, como anuncio", async () => {
  const { llamar, publico } = await panel();
  const id = await crearLlamado(llamar, { nombre: "Febrero 2027", desde: "2027-02-09" });
  assert.equal((await llamar("post", `/llamados/${id}/publicar`)).status, 200);
  const visto = await loPublicado(publico, id);
  assert.deepEqual(
    { nombre: visto.nombre, desde: visto.desde, hasta: visto.hasta, mesas: visto.mesas },
    { nombre: "Febrero 2027", desde: "2027-02-09", hasta: "", mesas: [] },
  );
});

test("retirar: deja de verse, conserva la copia y el llamado ya no se puede eliminar", async () => {
  const { llamar, publico } = await panel();
  const id = await crearLlamado(llamar);
  await llamar("post", `/llamados/${id}/mesas`, MESA);
  assert.equal((await llamar("post", `/llamados/${id}/retirar`)).status, 409);

  await llamar("post", `/llamados/${id}/publicar`);
  const retirado = (await llamar("post", `/llamados/${id}/retirar`)).body.llamado;
  assert.equal(retirado.publicado, false);
  assert.equal(retirado.sePublico, true);
  assert.equal(await loPublicado(publico, id), undefined);
  assert.equal((await llamar("post", `/llamados/${id}/retirar`)).status, 409);

  const borrar = await llamar("delete", `/llamados/${id}`);
  assert.equal(borrar.status, 409);
  assert.match(borrar.body.error, /ya se publicó/);
  assert.equal((await llamar("get", `/llamados/${id}`)).body.llamado.mesas.length, 1);

  // Volver a publicar toma lo último guardado.
  await llamar("post", `/llamados/${id}/mesas`, { ...MESA, materia: "Pastelería básica" });
  await llamar("post", `/llamados/${id}/publicar`);
  assert.equal((await loPublicado(publico, id)).mesas.length, 2);
});

test("eliminar un llamado que nunca se publicó borra también sus mesas", async () => {
  const { llamar } = await panel();
  const id = await crearLlamado(llamar);
  const { mesa } = (await llamar("post", `/llamados/${id}/mesas`, MESA)).body;
  assert.equal((await llamar("delete", `/llamados/${id}`)).status, 204);
  assert.equal((await llamar("get", `/llamados/${id}`)).status, 404);
  assert.equal((await llamar("put", `/mesas/${mesa.id}`, MESA)).status, 404);
  // El nombre queda libre para crear otro.
  assert.equal((await llamar("post", "/llamados", LLAMADO)).status, 201);
});

test("sitio público: solo los llamados publicados, el más reciente primero; los horarios siguen igual", async () => {
  const { llamar, publico } = await panel();
  const julio = await crearLlamado(llamar, { nombre: "Julio 2026", desde: "2026-07-20" });
  const febrero = await crearLlamado(llamar, LLAMADO);
  await crearLlamado(llamar, { nombre: "Sin publicar" });
  await llamar("post", `/llamados/${julio}/publicar`);
  await llamar("post", `/llamados/${febrero}/publicar`);

  const res = await publico("/vigente");
  assert.deepEqual(res.body.llamados.map((l) => l.nombre), ["Febrero 2027", "Julio 2026"]);
  assert.deepEqual(res.body.periodos, []);
});

// ---------- PDF ----------

const comoPdf = (req) => req.responseType("blob");

test("PDF público: del llamado publicado (también un anuncio); 404 si no está publicado o se retiró", async () => {
  const { llamar, publico } = await panel();
  const id = await crearLlamado(llamar);
  assert.equal((await publico("/vigente/mesas.pdf")).status, 400);
  assert.equal((await publico(`/vigente/mesas.pdf?llamado=${id}`)).status, 404);

  await llamar("post", `/llamados/${id}/publicar`); // anuncio, sin mesas
  const anuncio = await comoPdf(publico(`/vigente/mesas.pdf?llamado=${id}`));
  assert.equal(anuncio.status, 200);
  assert.equal(anuncio.headers["content-type"], "application/pdf");
  assert.match(anuncio.headers["content-disposition"], /filename="mesas-febrero-2027.pdf"/);
  assert.equal(anuncio.body.subarray(0, 4).toString(), "%PDF");

  await llamar("post", `/llamados/${id}/retirar`);
  assert.equal((await publico(`/vigente/mesas.pdf?llamado=${id}`)).status, 404);
  assert.equal((await publico("/vigente/mesas.pdf?llamado=999")).status, 404);
});

test("PDF de vista previa: de los datos de trabajo, con sesión", async () => {
  const { llamar, publico } = await panel();
  const id = await crearLlamado(llamar);
  await llamar("post", `/llamados/${id}/mesas`, MESA);
  const res = await comoPdf(llamar("get", `/llamados/${id}/vista-previa.pdf`));
  assert.equal(res.status, 200);
  assert.match(res.headers["content-disposition"], /filename="vista-previa-mesas-febrero-2027.pdf"/);
  assert.equal((await publico(`/llamados/${id}/vista-previa.pdf`)).status, 401);
});

// ---------- Permisos ----------

test("permisos: el panel exige sesión; Bedelía puede todo lo de mesas", async () => {
  const { app } = await appDePrueba();
  const rutas = [
    ["get", "/llamados"],
    ["post", "/llamados"],
    ["get", "/llamados/1"],
    ["put", "/llamados/1"],
    ["delete", "/llamados/1"],
    ["post", "/llamados/1/mesas"],
    ["put", "/mesas/1"],
    ["delete", "/mesas/1"],
    ["post", "/llamados/1/publicar"],
    ["post", "/llamados/1/retirar"],
    ["get", "/llamados/1/vista-previa.pdf"],
  ];
  for (const [metodo, ruta] of rutas) {
    assert.equal((await request(app)[metodo](`/api/academic${ruta}`)).status, 401, `${metodo} ${ruta}`);
  }

  const { llamar, publico } = await panel(BEDELIA);
  const id = await crearLlamado(llamar);
  await llamar("post", `/llamados/${id}/mesas`, MESA);
  assert.equal((await llamar("post", `/llamados/${id}/publicar`)).status, 200);
  assert.equal((await loPublicado(publico, id)).mesas.length, 1);
});

test("las rutas públicas de horarios siguen sin pedir sesión", async () => {
  const { publico } = await panel();
  assert.equal((await publico("/vigente")).status, 200);
  assert.equal((await publico("/vigente/horarios.pdf?periodo=2026-1")).status, 404);
});
