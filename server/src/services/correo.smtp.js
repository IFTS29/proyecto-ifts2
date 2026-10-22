import nodemailer from "nodemailer";
import { armarCorreoConsulta } from "./correo.mensaje.js";
import { crearCorreoMemoria, crearCorreoNoConfigurado } from "./correo.memoria.js";

// Envía las consultas por SMTP (por ejemplo, Gmail con una contraseña de aplicación).
// El transporte se puede recibir por parámetro para probar sin mandar correos reales.
export function crearCorreoSmtp(config, { transporte } = {}) {
  const envio =
    transporte ??
    nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPuerto,
      secure: config.smtpPuerto === 465,
      auth: { user: config.smtpUsuario, pass: config.smtpClave },
      // Tiempos cortos: si el servidor de correo no responde, el visitante ve el error enseguida.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });

  return {
    async enviarConsulta(consulta) {
      const correo = armarCorreoConsulta(consulta, config);
      const info = await envio.sendMail({ from: `"Portal IFTS 2" <${config.smtpUsuario}>`, ...correo });

      // Si el servidor rechaza una de las dos casillas, el correo igual llegó a la otra: se avisa
      // en el registro, pero no se informa un error ni se reintenta, para no duplicar el mensaje.
      if (info?.rejected?.length) {
        console.warn(
          `El servidor de correo rechazó a ${info.rejected.join(", ")}. Revisar CORREO_BEDELIA y CORREO_INSTITUCIONAL.`,
        );
      }
    },
  };
}

let avisoSimulado = false;

// Elige cómo se envían los correos según la configuración:
// - Con SMTP_USUARIO y SMTP_CLAVE: envío real.
// - Con solo uno de los dos: el envío falla, para que nadie crea que está probando el envío real.
// - Sin ninguno, en desarrollo: envío simulado, para poder trabajar sin configurar correos.
// - Sin ninguno, en producción: el envío falla, para no confirmar consultas que nunca salieron.
export function crearServicioCorreo(config, { transporte } = {}) {
  if (Boolean(config.smtpUsuario) !== Boolean(config.smtpClave)) {
    console.error("Falta SMTP_USUARIO o SMTP_CLAVE: el formulario de contacto no va a poder enviar consultas.");
    return crearCorreoNoConfigurado();
  }
  if (config.smtpUsuario && config.smtpClave) {
    if (!config.correoBedelia || !config.correoInstitucional) {
      console.warn("SMTP configurado, pero falta CORREO_BEDELIA o CORREO_INSTITUCIONAL: las consultas van a fallar.");
    }
    return crearCorreoSmtp(config, { transporte });
  }
  if (config.produccion) return crearCorreoNoConfigurado();
  if (!avisoSimulado) {
    console.warn("Sin SMTP_USUARIO y SMTP_CLAVE: el formulario de contacto usa el envío simulado.");
    avisoSimulado = true;
  }
  return crearCorreoMemoria();
}