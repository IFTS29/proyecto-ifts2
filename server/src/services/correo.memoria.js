// Simula el envío de correos para las pruebas y el desarrollo local, sin usar un servicio real.
// Solo guarda las consultas si se pide (en las pruebas: para revisar qué se habría enviado);
// en el desarrollo local no conserva datos personales de los visitantes.
export function crearCorreoMemoria({ guardarEnviados = false } = {}) {
  const enviados = [];
  return {
    enviados,
    async enviarConsulta(consulta) {
      if (guardarEnviados) enviados.push(consulta);
      console.log(
        `[correo simulado] Consulta recibida (motivo: ${consulta.motivo}). No se envió ningún correo.`,
      );
    },
  };
}

// En producción, si no hay un servicio de correo configurado: el envío falla en lugar de
// confirmar al visitante una consulta que nunca salió.
export function crearCorreoNoConfigurado() {
  return {
    async enviarConsulta() {
      throw new Error("El envío de correo no está configurado.");
    },
  };
}
