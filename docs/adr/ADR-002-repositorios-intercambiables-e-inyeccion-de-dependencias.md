# ADR-002: Repositorios intercambiables e inyección de dependencias en `crearApp`

* **Estado:** Aceptado  
* **Fecha:** 2026-10-12  
* **Decisores:** Equipo 404-Solutions (Backend y QA)  
* **Relacionado con:** Issue `#42`, `#29 [SETUP-02]`, `#40 [QA-01]`

---

## 1. Contexto y Planteo del Problema

Para cumplir con la pauta académica de calidad y pruebas automatizadas deterministas, la suite de pruebas del backend debía ser capaz de ejecutarse:
1. De forma 100% desconectada (*offline*), sin requerir una instancia de base de datos activa ni conexión a Internet.
2. Con velocidad de ejecución inmediata en entornos de integración continua (CI) y en las máquinas locales de los desarrolladores.
3. Sin contaminar ni borrar bases de datos reales durante las corridas de pruebas.

Vincular directamente los modelos de Mongoose a las rutas de Express (*Active Record / acoplamiento directo*) obligaba a levantar una base de datos real (o réplicas pesadas en memoria de MongoDB) para cada test.

---

## 2. Decisión Adoptada

Se decidió implementar el **patrón Repository con Inyección de Dependencias**:
* El archivo `server/src/app.js` exporta la función fábrica `crearApp({ config, usuarios, eventos, horarios, mesas, correo, hoy })`. La aplicación Express no instancia repositorios ni servicios directamente: los recibe como parámetros.
* Cada entidad del dominio cuenta con dos implementaciones independientes que respetan exactamente la misma interfaz pública:
  * `*.mongo.js`: implementa las consultas sobre colecciones de MongoDB Atlas mediante Mongoose para producción.
  * `*.memoria.js`: almacena las entidades en estructuras de datos en memoria (arrays / Maps) para desarrollo local sin base y pruebas unitarias/integración.
* En el arranque del servidor (`server/src/arranque.js`), se eligen todas las implementaciones de una misma fuente, según la configuración. En desarrollo, si falta `MONGODB_URI` o falla la conexión, se inyectan los repositorios en memoria con un aviso en consola. En producción, MongoDB es obligatorio: si falta la configuración o falla la conexión, el servidor no inicia.

---

## 3. Consecuencias y Trade-offs

### Consecuencias Positivas
* **Pruebas deterministas y ultrarrápidas:** las pruebas automáticas (548 al 8/11/2026) se ejecutan en memoria completa en pocos segundos, sin dependencias de red ni latencias de I/O.
* **Desarrollo local sin fricciones:** cualquier integrante del equipo o evaluador puede clonar el repositorio y ejecutar la aplicación inmediatamente sin necesidad de configurar MongoDB Atlas localmente.
* **Inversión de dependencias (SOLID):** el núcleo de la lógica de negocio y las rutas de Express no dependen de la tecnología de persistencia subyacente.

### Consecuencias Negativas / Compromisos Asumidos
* **Doble mantenimiento:** cada modificación o nueva funcionalidad en el acceso a datos debe implementarse y probarse en ambos adaptadores (`*.mongo.js` y `*.memoria.js`), asegurando paridad estricta en el comportamiento de filtros y ordenamientos.
