// Contenido institucional que se edita desde el panel (#36): perfil del egresado, autoridades y tutoría,
// y datos de contacto. Cada sección se guarda entera y se ve en el sitio en cuanto se guarda.
//
// Los valores iniciales son los que mostraba el sitio antes de que existiera esta función. No se escriben
// en la base: solo se devuelven mientras la sección no se guardó nunca. Así, reiniciar el servidor no pisa
// lo que guardó un administrador.

export const SECCIONES = ["perfil", "personas", "contacto"];
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
};

// Teléfono y correo empiezan vacíos: no se publican hasta que el IFTS 2 los confirme.
// Las autoridades son las que ya mostraba el portal; su vigencia está pendiente de confirmación.
export const VALORES_INICIALES = {
  perfil: {
    parrafos: [
      "Al egresar vas a estar capacitado/a para diseñar y gestionar emprendimientos gastronómicos, y para " +
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

const VALIDADORES = { perfil: validarPerfil, personas: validarPersonas, contacto: validarContacto };

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
  return { datos: guardada.datos, actualizadoEn: guardada.actualizadoEn, inicial: false };
}
