// Contenido institucional que se edita desde el panel (#36): perfil del egresado, autoridades y tutoría,
// datos de contacto e ingreso. Ingreso tiene dos secciones que se guardan por separado: la convocatoria
// (etapas, enlaces, video y correo de consultas), que cambia cada cuatrimestre, y las preguntas frecuentes,
// que casi no cambian. Cada sección se guarda entera y se ve en el sitio en cuanto se guarda.
//
// Los valores iniciales son los que mostraba el sitio antes de que existiera esta función. No se escriben
// en la base: solo se devuelven mientras la sección no se guardó nunca. Así, reiniciar el servidor no pisa
// lo que guardó un administrador.

export const SECCIONES = ["perfil", "personas", "contacto", "ingreso", "ingresoPreguntas"];
export const GRUPOS = ["autoridades", "tutoria"];

export const LIMITES = {
  parrafos: { min: 1, max: 6, largo: 1000 },
  personas: { min: 1, max: 12 },
  nombre: 80,
  cargo: 80,
  detalle: 160,
  direccion: 100,
  localidad: 100,
  horario: 100,
  modalidad: 100,
  telefono: 30,
  correo: 150,
  convocatoria: 60,
  etapas: { max: 6 },
  nombreEtapa: 60,
  detalleEtapa: 300,
  preguntas: { max: 10 },
  pregunta: 150,
  respuesta: 600,
  textoEnlace: 60,
  url: 300,
};

// Teléfono y correo empiezan vacíos: no se publican hasta que el IFTS 2 los confirme.
// Las autoridades son las que ya mostraba el portal; su vigencia está pendiente de confirmación.
export const VALORES_INICIALES = {
  perfil: {
    parrafos: [
      "La persona egresada estará capacitada para diseñar y gestionar emprendimientos gastronómicos, y para " +
        "realizar tareas de planificación de la producción y de elaboración de productos alimenticios aptos " +
        "para el consumo, conforme a las condiciones exigidas de higiene, seguridad y calidad.",
      "El instituto forma emprendedores gastronómicos desde 2007, promoviendo la inserción laboral y los " +
        "proyectos productivos que impactan en la comunidad.",
    ],
  },
  personas: {
    personas: [
      { nombre: "Cecilia C. Dipiazza", cargo: "Rectora", detalle: "", grupo: "autoridades" },
      {
        nombre: "Prof. Julia Sboro",
        cargo: "Tutora institucional",
        detalle: "Acompaña a los estudiantes durante la cursada.",
        grupo: "tutoria",
      },
    ],
  },
  contacto: {
    direccion: "Cañada de Gómez 3850",
    localidad: "Villa Lugano, Ciudad de Buenos Aires",
    horario: "Lunes a viernes, de 18 a 22 h",
    modalidad: "Cursada presencial",
    telefono: "",
    correo: "",
  },
  // Sin convocatoria elegida, el sitio muestra «Fechas a confirmar». Las etapas son un modelo: nombres
  // habituales, sin fechas ni aclaraciones que dependan de cada convocatoria; el instituto las completa.
  ingreso: {
    convocatoria: "",
    preinscripcion: {
      desde: "",
      hasta: "",
      detalle: "Se hace en SIU Guaraní, eligiendo la carrera, el instituto y el horario.",
    },
    etapas: [
      { nombre: "Curso de ingreso (optativo)", desde: "", hasta: "", detalle: "", textoEnlace: "", urlEnlace: "" },
      { nombre: "Examen de ingreso", desde: "", hasta: "", detalle: "", textoEnlace: "", urlEnlace: "" },
      { nombre: "Confirmación de vacantes", desde: "", hasta: "", detalle: "", textoEnlace: "", urlEnlace: "" },
      { nombre: "Inicio de clases", desde: "", hasta: "", detalle: "", textoEnlace: "", urlEnlace: "" },
    ],
    video: "",
    correo: "",
  },
  // Las que ya mostraba el portal, con respuestas generales que no dependen de una convocatoria.
  ingresoPreguntas: {
    preguntas: [
      {
        pregunta: "¿Qué se necesita para inscribirse?",
        respuesta:
          "Tener el título secundario o una constancia de título en trámite o de finalización de estudios. Hay " +
          "condiciones especiales, por ejemplo para quienes adeudan materias del secundario o para mayores de 25 " +
          "años sin el secundario completo: se informan en cada convocatoria.",
      },
      {
        pregunta: "¿Se puede elegir más de una carrera?",
        respuesta: "No. En cada convocatoria se elige una sola tecnicatura, el instituto y el horario.",
      },
      {
        pregunta: "¿Cómo se accede al curso de preparación?",
        respuesta:
          "Al completar la preinscripción, el usuario y la contraseña del aula virtual llegan al correo declarado. " +
          "El curso es optativo, pero prepara para el examen.",
      },
      {
        pregunta: "¿Qué se evalúa en el examen de ingreso?",
        respuesta:
          "Comprensión de textos y matemática general. El examen es obligatorio y se rinde en el aula virtual; la " +
          "modalidad, la duración y las fechas se informan en cada convocatoria.",
      },
      {
        pregunta: "¿Cómo se asignan las vacantes?",
        respuesta:
          "Según las vacantes de cada carrera, con los criterios de prioridad y el orden de mérito que fija la " +
          "Agencia de Habilidades para el Futuro.",
      },
    ],
  },
};

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_TELEFONO = /^\+?[\d\s()-]+$/;

const esObjeto = (valor) => valor !== null && typeof valor === "object" && !Array.isArray(valor);

const mayuscula = (frase) => frase.charAt(0).toUpperCase() + frase.slice(1);

// Texto sin espacios de más. Devuelve el texto limpio o un mensaje de error.
// "nombre" va con su artículo ("la dirección") y "prefijo" ubica el error ("Persona 2: ").
function texto(valor, { nombre, max, obligatorio = false, prefijo = "" }) {
  const mensaje = (frase) => ({ error: prefijo ? `${prefijo}${frase}` : mayuscula(frase) });
  const esTexto = valor === undefined || valor === null || typeof valor === "string";
  if (!esTexto) return mensaje(`${nombre} no tiene un valor válido.`);
  const limpio = (valor ?? "").trim();
  if (obligatorio && !limpio) return mensaje(`completar ${nombre}.`);
  if (limpio.length > max) return mensaje(`${nombre} admite hasta ${max} caracteres.`);
  return { valor: limpio };
}

function validarPerfil(datos) {
  const { parrafos } = datos;
  const { min, max, largo } = LIMITES.parrafos;
  if (!Array.isArray(parrafos)) return { error: "El perfil del egresado no es válido." };
  const limpios = [];
  for (const [i, parrafo] of parrafos.entries()) {
    const r = texto(parrafo, { nombre: `el párrafo ${i + 1}`, max: largo });
    if (r.error) return r;
    if (r.valor) limpios.push(r.valor); // un párrafo vacío se descarta
  }
  if (limpios.length < min) return { error: "El perfil del egresado necesita al menos un párrafo." };
  if (limpios.length > max) return { error: `El perfil del egresado admite hasta ${max} párrafos.` };
  return { datos: { parrafos: limpios } };
}

function validarPersonas(datos) {
  const { personas } = datos;
  const { min, max } = LIMITES.personas;
  if (!Array.isArray(personas)) return { error: "La lista de autoridades y tutoría no es válida." };
  if (personas.length < min) return { error: "Tiene que haber al menos una persona." };
  if (personas.length > max) return { error: `Se pueden cargar hasta ${max} personas.` };
  const limpias = [];
  for (const [i, persona] of personas.entries()) {
    const n = i + 1;
    if (!esObjeto(persona)) return { error: `Persona ${n}: los datos no son válidos.` };
    const prefijo = `Persona ${n}: `;
    const nombre = texto(persona.nombre, { nombre: "el nombre", max: LIMITES.nombre, obligatorio: true, prefijo });
    if (nombre.error) return nombre;
    const cargo = texto(persona.cargo, { nombre: "el cargo", max: LIMITES.cargo, obligatorio: true, prefijo });
    if (cargo.error) return cargo;
    const detalle = texto(persona.detalle, { nombre: "la aclaración", max: LIMITES.detalle, prefijo });
    if (detalle.error) return detalle;
    if (!GRUPOS.includes(persona.grupo)) {
      return { error: `${prefijo}el grupo tiene que ser Autoridades o Tutoría.` };
    }
    limpias.push({ nombre: nombre.valor, cargo: cargo.valor, detalle: detalle.valor, grupo: persona.grupo });
  }
  return { datos: { personas: limpias } };
}

function validarContacto(datos) {
  const campos = [
    ["direccion", "la dirección", true],
    ["localidad", "el barrio y la ciudad", true],
    ["horario", "el horario", true],
    ["modalidad", "la modalidad", false],
    ["telefono", "el teléfono", false],
    ["correo", "el correo", false],
  ];
  const limpio = {};
  for (const [campo, nombre, obligatorio] of campos) {
    const r = texto(datos[campo], { nombre, max: LIMITES[campo], obligatorio });
    if (r.error) return r;
    limpio[campo] = r.valor;
  }
  if (limpio.telefono) {
    const digitos = limpio.telefono.replace(/\D/g, "").length;
    if (!REGEX_TELEFONO.test(limpio.telefono) || digitos < 6 || digitos > 15) {
      return { error: "El teléfono solo admite números, espacios, guiones, paréntesis y un + inicial." };
    }
  }
  if (limpio.correo && !REGEX_CORREO.test(limpio.correo)) return { error: "El correo no tiene un formato válido." };
  limpio.correo = limpio.correo.toLowerCase();
  return { datos: limpio };
}

// Fecha de calendario «AAAA-MM-DD» (sin hora: así no cambia de día por la zona horaria).
function fecha(valor, { nombre, obligatoria = false, prefijo = "" }) {
  const limpio = typeof valor === "string" ? valor.trim() : "";
  if (valor !== undefined && valor !== null && typeof valor !== "string") {
    return { error: `${prefijo}${nombre} no es válida.` };
  }
  if (!limpio) return obligatoria ? { error: `${prefijo}completar ${nombre}.` } : { valor: "" };
  const enUtc = new Date(`${limpio}T12:00:00Z`);
  const esReal = /^\d{4}-\d{2}-\d{2}$/.test(limpio) && !isNaN(enUtc) && enUtc.toISOString().slice(0, 10) === limpio;
  const anio = Number(limpio.slice(0, 4));
  if (!esReal || anio < 2000 || anio > 2100) return { error: `${prefijo}${nombre} no es válida.` };
  return { valor: limpio };
}

// Desde (obligatoria) y hasta (opcional, no anterior a desde). Las fechas en este formato se comparan como texto.
function rango(datos, prefijo, { hastaObligatoria = false } = {}) {
  const desde = fecha(datos.desde, { nombre: "la fecha de inicio", obligatoria: true, prefijo });
  if (desde.error) return desde;
  const hasta = fecha(datos.hasta, { nombre: "la fecha de cierre", obligatoria: hastaObligatoria, prefijo });
  if (hasta.error) return hasta;
  if (hasta.valor && hasta.valor < desde.valor) {
    return { error: `${prefijo}la fecha de cierre no puede ser anterior a la de inicio.` };
  }
  return { desde: desde.valor, hasta: hasta.valor };
}

const estaVacia = (fila, campos) => campos.every((campo) => !String(fila?.[campo] ?? "").trim());

// Convocatoria: vacía o «1.º cuatrimestre 2027». El panel la arma con dos desplegables. No se rechazan años
// pasados: una convocatoria anterior tiene que poder seguir guardada como referencia.
const REGEX_CONVOCATORIA = /^([12])\.º cuatrimestre (\d{4})$/;

// Enlace de una etapa: texto y dirección van juntos; la dirección tiene que ser https.
function enlace(fila, prefijo) {
  const textoEnlace = texto(fila.textoEnlace, { nombre: "el texto del enlace", max: LIMITES.textoEnlace, prefijo });
  if (textoEnlace.error) return textoEnlace;
  const url = texto(fila.urlEnlace, { nombre: "la dirección del enlace", max: LIMITES.url, prefijo });
  if (url.error) return url;
  if (Boolean(textoEnlace.valor) !== Boolean(url.valor)) {
    return { error: `${prefijo}completar el texto y la dirección del enlace, o dejar los dos vacíos.` };
  }
  if (url.valor && !esDireccionSegura(url.valor)) {
    return { error: `${prefijo}la dirección del enlace tiene que empezar con https://.` };
  }
  return { textoEnlace: textoEnlace.valor, urlEnlace: url.valor };
}

function esDireccionSegura(valor) {
  try {
    return new URL(valor).protocol === "https:";
  } catch {
    return false;
  }
}

// Video de YouTube: solo se guarda una dirección de un video (watch, youtu.be, shorts o embed), nunca código.
export function idDeYoutube(valor) {
  let url;
  try {
    url = new URL(String(valor || "").trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^(www|m)\./, "");
  let id = null;
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const ruta = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/);
    id = url.pathname === "/watch" ? url.searchParams.get("v") : ruta?.[1];
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

function validarIngreso(datos) {
  const conv = texto(datos.convocatoria, { nombre: "la convocatoria", max: LIMITES.convocatoria });
  if (conv.error) return conv;
  const convocatoria = conv.valor;
  const partes = convocatoria.match(REGEX_CONVOCATORIA);
  if (convocatoria && (!partes || Number(partes[2]) < 2000 || Number(partes[2]) > 2100)) {
    return { error: "Elegir el cuatrimestre y el año de la convocatoria." };
  }

  if (datos.preinscripcion !== undefined && !esObjeto(datos.preinscripcion)) {
    return { error: "Los datos de la preinscripción no son válidos." };
  }
  const pre = datos.preinscripcion ?? {};
  const etapasRecibidas = datos.etapas ?? [];
  if (!Array.isArray(etapasRecibidas)) return { error: "La lista de etapas no es válida." };

  // Las filas completamente vacías se descartan, como los párrafos vacíos del perfil.
  const campos = ["nombre", "desde", "hasta", "detalle", "textoEnlace", "urlEnlace"];
  const etapasCargadas = etapasRecibidas.filter((e) => !estaVacia(e, campos));
  if (etapasCargadas.length > LIMITES.etapas.max) {
    return { error: `Se pueden cargar hasta ${LIMITES.etapas.max} etapas, además de la preinscripción.` };
  }

  // Sin convocatoria, las etapas son un modelo (nombres y aclaraciones, sin fechas) que no se muestra en el sitio.
  const hayFechas = [pre, ...etapasCargadas].some((e) => !estaVacia(e, ["desde", "hasta"]));
  if (!convocatoria && hayFechas) return { error: "Elegir el cuatrimestre y el año de la convocatoria." };

  const prefijoPre = "Preinscripción: ";
  let fechasPre = { desde: "", hasta: "" };
  if (convocatoria) {
    fechasPre = rango(pre, prefijoPre, { hastaObligatoria: true });
    if (fechasPre.error) return fechasPre;
  }
  const detallePre = texto(pre.detalle, { nombre: "la aclaración", max: LIMITES.detalleEtapa, prefijo: prefijoPre });
  if (detallePre.error) return detallePre;
  const preinscripcion = { desde: fechasPre.desde, hasta: fechasPre.hasta, detalle: detallePre.valor };

  const etapas = [];
  for (const [i, etapa] of etapasCargadas.entries()) {
    const prefijo = `Etapa ${i + 1}: `;
    if (!esObjeto(etapa)) return { error: `${prefijo}los datos no son válidos.` };
    const nombre = texto(etapa.nombre, { nombre: "el nombre", max: LIMITES.nombreEtapa, obligatorio: true, prefijo });
    if (nombre.error) return nombre;
    let fechas = { desde: "", hasta: "" };
    if (convocatoria) {
      fechas = rango(etapa, prefijo);
      if (fechas.error) return fechas;
    }
    const detalle = texto(etapa.detalle, { nombre: "la aclaración", max: LIMITES.detalleEtapa, prefijo });
    if (detalle.error) return detalle;
    const e = enlace(etapa, prefijo);
    if (e.error) return e;
    etapas.push({ nombre: nombre.valor, desde: fechas.desde, hasta: fechas.hasta, detalle: detalle.valor, ...e });
  }

  const video = texto(datos.video, { nombre: "el enlace del video", max: LIMITES.url });
  if (video.error) return video;
  if (video.valor && !idDeYoutube(video.valor)) {
    return { error: "El enlace del video tiene que ser la dirección de un video de YouTube." };
  }

  const correo = texto(datos.correo, { nombre: "el correo de consultas", max: LIMITES.correo });
  if (correo.error) return correo;
  if (correo.valor && !REGEX_CORREO.test(correo.valor)) {
    return { error: "El correo de consultas no tiene un formato válido." };
  }

  // Las preguntas frecuentes tienen su propia sección (ingresoPreguntas): si llegan acá, no se guardan.
  return {
    datos: { convocatoria, preinscripcion, etapas, video: video.valor, correo: correo.valor.toLowerCase() },
  };
}

function validarPreguntasIngreso(datos) {
  const recibidas = datos.preguntas ?? [];
  if (!Array.isArray(recibidas)) return { error: "La lista de preguntas frecuentes no es válida." };
  const cargadas = recibidas.filter((p) => !estaVacia(p, ["pregunta", "respuesta"]));
  if (cargadas.length > LIMITES.preguntas.max) {
    return { error: `Se pueden cargar hasta ${LIMITES.preguntas.max} preguntas frecuentes.` };
  }
  const preguntas = [];
  for (const [i, fila] of cargadas.entries()) {
    const prefijo = `Pregunta ${i + 1}: `;
    if (!esObjeto(fila)) return { error: `${prefijo}los datos no son válidos.` };
    const pregunta = texto(fila.pregunta, { nombre: "la pregunta", max: LIMITES.pregunta, obligatorio: true, prefijo });
    if (pregunta.error) return pregunta;
    const respuesta = texto(fila.respuesta, {
      nombre: "la respuesta",
      max: LIMITES.respuesta,
      obligatorio: true,
      prefijo,
    });
    if (respuesta.error) return respuesta;
    preguntas.push({ pregunta: pregunta.valor, respuesta: respuesta.valor });
  }
  return { datos: { preguntas } };
}

// Compatibilidad con lo guardado antes de separar las preguntas: estaban dentro de «ingreso». Si la sección
// nueva todavía no se guardó nunca, se toman de ahí (y no los valores iniciales) para no perderlas.
export function preguntasGuardadasAntes(guardadas) {
  if (guardadas.get("ingresoPreguntas")) return null;
  const anterior = guardadas.get("ingreso");
  const preguntas = anterior?.datos?.preguntas;
  if (!Array.isArray(preguntas)) return null;
  return { clave: "ingresoPreguntas", datos: { preguntas }, actualizadoEn: anterior.actualizadoEn };
}

const VALIDADORES = {
  perfil: validarPerfil,
  personas: validarPersonas,
  contacto: validarContacto,
  ingreso: validarIngreso,
  ingresoPreguntas: validarPreguntasIngreso,
};

// Devuelve { datos } con los valores limpios, o { error } con un mensaje para mostrar en el panel.
export function validarSeccion(clave, datos) {
  if (!SECCIONES.includes(clave)) return { error: "La sección no existe." };
  if (!esObjeto(datos)) return { error: "Los datos no son válidos." };
  return VALIDADORES[clave](datos);
}

// Lo que ve el público de una sección: lo guardado o, si nunca se guardó, los valores iniciales.
// No incluye quién la guardó: es un dato del panel, no del sitio.
export function seccionPublica(clave, guardada) {
  if (!guardada) return { datos: structuredClone(VALORES_INICIALES[clave]), actualizadoEn: null, inicial: true };
  let datos = guardada.datos;
  // Lo guardado antes de separar las preguntas puede traerlas adentro: se publican solo en su sección.
  if (clave === "ingreso" && datos && "preguntas" in datos) {
    datos = { ...datos };
    delete datos.preguntas;
  }
  return { datos, actualizadoEn: guardada.actualizadoEn, inicial: false };
}

// ---- Historial de convocatorias de ingreso (#35) ----
// Al guardar la sección «ingreso», la convocatoria que estaba guardada pasa al historial si tenía nombre y fechas
// y la nueva es otra (otro cuatrimestre o año, o ninguna, con «Quitar convocatoria»). Corregir la misma
// convocatoria no la manda al historial.
const tieneFechas = (ingreso) =>
  [ingreso?.preinscripcion, ...(ingreso?.etapas ?? [])].some((e) => e?.desde || e?.hasta);

export function pasaAlHistorial(anterior, nueva) {
  return Boolean(anterior?.convocatoria) && tieneFechas(anterior) && nueva?.convocatoria !== anterior.convocatoria;
}

// Copia completa de la convocatoria (preinscripción, etapas con fechas, aclaraciones y enlaces, video y correo),
// sin las preguntas frecuentes, que tienen su propia sección. No depende de cambios posteriores del formulario.
export function copiaParaElHistorial(ingreso) {
  const copia = structuredClone(ingreso);
  delete copia.preguntas;
  return copia;
}

// Del más reciente al más antiguo: «2.º cuatrimestre 2026» antes que «1.º cuatrimestre 2026».
const ordenDeConvocatoria = (texto) => {
  const [, cuatrimestre, anio] = String(texto).match(/^([12])\.º cuatrimestre (\d{4})$/) ?? [];
  return anio ? Number(anio) * 10 + Number(cuatrimestre) : 0;
};
export const ordenarHistorial = (lista) =>
  [...lista].sort((a, b) => ordenDeConvocatoria(b.convocatoria) - ordenDeConvocatoria(a.convocatoria));
