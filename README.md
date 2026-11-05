<div align="center">
  <h1>Portal Web Institucional IFTS N.° 2</h1>
  <h2>Proyecto Integrador · Prácticas Profesionalizantes IV · 404-Solutions</h2>
  <br>
  <img src="https://img.shields.io/badge/STATUS-EN%20DESARROLLO-yellow?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB Atlas">
  <img src="https://img.shields.io/badge/Vercel-deploy-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel">
</div>

<br>

> **Nota:** el proyecto está en la etapa final (Etapa 3), con entrega prevista para el 08/11/2026. Este README se
> actualiza a medida que avanza el trabajo. El estado de cada funcionalidad está en la sección «Estado del Desarrollo».

<br>

---

## 📚 Datos del Proyecto

- **Institución:** Instituto de Formación Técnica Superior N.° 29 (IFTS N.° 29)
- **Carrera:** Tecnicatura Superior en Desarrollo de Software
- **Materia:** Prácticas Profesionalizantes IV (Proyecto Integrador) · 2026, 2.° cuatrimestre
- **Docentes:** Lic. Emir García Ontiveros y Lic. Kevin Del Bello
- **Empresa simulada:** 404-Solutions
- **Cliente:** IFTS N.° 2 D.E. 20 · Tecnicatura Superior en Emprendimientos Gastronómicos
- **Tablero:** [Proyecto IFTS2 (GitHub Projects)](https://github.com/orgs/IFTS29/projects/2/views/1)
- **Versión desplegada (rama `develop`, provisoria):** [proyecto-ifts2.vercel.app](https://proyecto-ifts2.vercel.app)

> La versión desplegada corresponde a `develop` y se usa para ver los avances del equipo. Para la entrega
> final se va a publicar un despliegue nuevo desde `main`.

<br>

---

## 📖 Descripción del Proyecto

El IFTS N.° 2 tenía un sitio en Google Sites que dejó de actualizarse porque mantenerlo llevaba demasiado
tiempo. El **Portal Web Institucional** lo reemplaza con dos partes:

1. **Sitio público:** la carrera, el ingreso, la información para alumnos, los eventos y el contacto, con foco
   en el perfil del egresado (_"formamos microempresarios gastronómicos"_).
2. **Panel de administración:** para que el personal del instituto, sin conocimientos técnicos, actualice el
   contenido sin depender del equipo de desarrollo.

El proyecto prioriza servicios gratuitos, con el objetivo de que el **costo operativo sea cero**.

<br>

---

## 🎯 Objetivos

- Ofrecer un panel simple, con perfiles **Administrador** y **Bedelía**.
- Separar el contenido estable (plan de estudios, autoridades, perfil del egresado, correlatividades) del
  contenido dinámico (eventos, novedades y galería).
- Mostrar solo la información académica vigente (horarios y mesas), archivando lo vencido sin borrarlo.
- Reunir los accesos a SIU Guaraní, Moodle y Mi Argentina.
- Recibir consultas mediante un formulario que llegue por correo a Bedelía.
- Incorporar publicaciones de Instagram cuando el instituto entregue el acceso a la API, con carga manual de respaldo.

<br>

---

## ✅ Estado del Desarrollo

| Funcionalidad | Issue | Estado |
| :------------ | :---: | :----: |
| Estructura base del proyecto (React + Express) | #28 | ✅ |
| Modelos de datos y creación del primer administrador | #29 | ✅ |
| Sitio público en React | #32 | ✅ |
| Inicio de sesión seguro | #30 | ✅ |
| Perfiles Administrador y Bedelía | #31 | ✅ Auditoría de permisos en revisión (#109) |
| Gestión de usuarios del panel | #38 | ✅ |
| Formulario de contacto con envío de correo | #37 | ✅ Falta la prueba de envío real con el correo institucional |
| Información académica: horarios, aulas y mesas de examen | #33 | ✅ |
| Eventos institucionales con galería | #34 | 🟡 Se pueden cargar, editar, ocultar y mostrar. Falta la baja (#81) |
| Archivado de contenidos sin borrado | #35 | ✅ |
| Contenido institucional editable | #36 | ✅ |
| Integración con Instagram o carga manual | #39, #55 | ✅ La sincronización necesita las credenciales de la cuenta. Sin ellas, los eventos se cargan a mano |
| Pruebas automáticas y evidencias | #40, #41 | 🔬 En revisión |
| Manual técnico y manual de usuario | #42, #43 | 🔬 En revisión |
| Despliegue final y entrega | #44 | ⏳ |

✅ hecho · 🟡 parcial · ⏳ pendiente · 🔬 en revisión (Pull Request abierto)

> Estado actualizado al 04/11/2026. Los avances posteriores se registran en los issues y Pull Requests del
> repositorio. El detalle de lo que falta para cerrar el MVP está en [docs/roadmap-mvp.md](./docs/roadmap-mvp.md).

<br>

---

## 🏗️ Arquitectura y Tecnologías

```text
  Navegador ──► client/  (React + Vite)
                   │
                   │  /api/...
                   ▼
                server/  (Node.js + Express)  ──►  MongoDB Atlas
                   │
                   └──►  Servicios externos: Cloudinary (fotos), Instagram Graph API y correo SMTP
```

| Capa | Tecnologías |
| :--- | :---------- |
| Frontend | React 18, Vite 5, React Router 6 |
| Backend | Node.js, Express 4, JWT, bcryptjs, helmet, express-rate-limit, pdfkit (PDF de horarios y mesas) |
| Base de datos | MongoDB Atlas con Mongoose |
| Fotos de eventos | Cloudinary |
| Correo | Nodemailer con SMTP (por defecto, Gmail) |
| Despliegue | Vercel |
| Pruebas | node:test y supertest |

- **En local**, un solo servidor atiende la API y el cliente en `http://localhost:3000`.
- **En Vercel**, la API corre como función serverless (`api/index.js`) y el cliente compilado se sirve como
  sitio estático.
- **Sin base de datos ni correo configurados**, el proyecto funciona igual en local: los datos se guardan en
  memoria (se pierden al reiniciar) y el formulario de contacto usa un envío simulado.

El detalle de la arquitectura, la base de datos, las variables de entorno y las decisiones técnicas está en el
[Manual Técnico](./docs/manual-tecnico.md).

<br>

---

## 📂 Estructura del Proyecto

```text
proyecto-ifts2/
│
├── client/                   # Frontend (React + Vite)
│   └── src/
│       ├── pages/            # una pantalla por archivo (sitio público y panel)
│       ├── components/       # formularios, tablas, menú del panel, rutas protegidas
│       ├── context/          # sesión y rol del usuario
│       └── api.js            # llamadas a la API
│
├── server/                   # Backend (Node.js + Express)
│   ├── src/                  # rutas, servicios, modelos, acceso a datos y configuración
│   └── test/                 # pruebas automáticas
│
├── api/index.js              # entrada de la API en Vercel
├── server.js                 # entrada para desarrollo local
├── prototipo-html/           # prototipo original (referencia)
├── docs/                     # manuales, plan de testing, registro de cambios y roadmap
├── .env.example              # variables de entorno de ejemplo
└── package.json              # dependencias y scripts de todo el proyecto
```

<br>

---

## 🚀 Instalación y Ejecución

### Requisitos previos

- **Node.js 22 o superior**.
- **Git**.

### Pasos

```powershell
git clone https://github.com/IFTS29/proyecto-ifts2.git
cd proyecto-ifts2
npm install
Copy-Item .env.example .env
```

- En Linux o Mac, en lugar de `Copy-Item`: `cp .env.example .env`.
- Si PowerShell no deja ejecutar npm: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- Todas las dependencias están en el `package.json` de la raíz: se instalan con un solo `npm install`.

Para poder entrar al panel, completá en el `.env` los datos del primer administrador:

```text
SEED_ADMIN_NOMBRE=Administrador
SEED_ADMIN_MAIL=admin@ejemplo.local
SEED_ADMIN_PASSWORD=UnaClave2026
```

El administrador se crea al arrancar, solo si todavía no hay usuarios. Conviene elegir una contraseña de al
menos 8 caracteres, con una mayúscula y un número, que es la regla que pide el panel para los demás usuarios.

```powershell
npm run dev
```

Abrí `http://localhost:3000`. El panel está en `/login`.

### Scripts

| Comando | Descripción |
| :------ | :---------- |
| `npm run dev` | Inicia la API y el cliente en `http://localhost:3000` |
| `npm test` | Pruebas automáticas del servidor |
| `npm run build` | Compila el cliente en `client/dist` |
| `npm start` | Sirve el cliente compilado junto con la API, en modo producción (exige MongoDB) |

### Variables de entorno

Están en `.env.example` y se explican una por una, con lo que pasa si faltan, en el
[Manual Técnico](./docs/manual-tecnico.md). Sin completar nada más que las del administrador, el proyecto
funciona en local con datos en memoria y envío de correo simulado. Para guardar datos hay que cargar
`MONGODB_URI`.

> **Importante:** el `.env` nunca se sube al repositorio. Las claves (base de datos, JWT, correo, Cloudinary,
> Instagram) se cargan solo en el `.env` local y en las variables de entorno de Vercel.

### Credenciales de prueba

Las credenciales del sitio desplegado se entregan a la cátedra por un canal privado. No se publican en este
repositorio.

<br>

---

## 🧪 Pruebas

```powershell
npm test
```

Las pruebas automáticas del servidor se ejecutan con `node:test` y supertest, sobre datos en memoria: no
necesitan base de datos ni conexión a Internet. Cubren el inicio de sesión y el bloqueo por intentos, los
permisos por rol, los usuarios, los eventos y sus fotos, las mesas de examen y los horarios, el archivado por
fecha, el contenido institucional, la sincronización con Instagram y el formulario de contacto.

El plan de pruebas está en [docs/plan-de-testing.md](./docs/plan-de-testing.md).

<br>

---

## 🔀 Organización del Trabajo

- **Metodología:** Scrum simplificado, con tablero Kanban en GitHub Projects.
- **Ramas:** `main` (solo entrega final), `develop` (trabajo diario) y una rama por tarea (`feature/...`,
  `fix/...`, `docs/...`) que se integra a `develop` con un Pull Request.
- **Issues:** con prefijo según el tipo (`SETUP-`, `US-`, `BUG-`, `QA-`, `DOC-`, `SPIKE-`, `CLIENTE-`,
  `POST-`).
- **Pull Requests:** título con el código del issue y una descripción en presente, por ejemplo
  `[US-08] Agrega el formulario de contacto con envío de consultas por correo`.

<br>

---

## 📄 Documentación

| Documento | Descripción |
| :-------- | :---------- |
| [Manual Técnico](./docs/manual-tecnico.md) | Arquitectura, base de datos, instalación, variables de entorno y decisiones de diseño |
| [Manual de Usuario](./docs/manual-de-usuario.md) | Cómo usar el panel de administración, para Administrador y Bedelía |
| [Matriz de permisos](./docs/matriz-de-permisos.md) | Qué puede hacer cada rol en la API y en el panel |
| [Plan de testing](./docs/plan-de-testing.md) | Casos de prueba y su relación con los requerimientos |
| [Registro de cambios](./docs/registro-de-cambios.md) | Qué se cambió en cada etapa y por qué |
| [Roadmap del MVP](./docs/roadmap-mvp.md) | Estado y lo que falta para cerrar el MVP |

<br>

---

## 👥 Equipo 404-Solutions

| Integrante | Rol | GitHub |
| :--------- | :-- | :----- |
| **Miguel Ángel Flores Meehan** | Product Owner · Analista de Negocio | [@mikefink22](https://github.com/mikefink22) |
| **Valeria Thomas** | Scrum Master · Gestión del Proyecto | [@Irinath](https://github.com/Irinath) |
| **Raquel Rodriguez Herlein** | Frontend · Diseño UX/UI | [@raquerh](https://github.com/raquerh) |
| **Mario David Gonzalez Benitez** | Backend · Base de Datos | [@elavincho](https://github.com/elavincho) |
| **Mariana Aiello** | QA · Documentación Técnica | [@Aiello-M](https://github.com/Aiello-M) |

<br>

---

<div align="center">
  <p>IFTS N.° 29 · Tecnicatura Superior en Desarrollo de Software · Prácticas Profesionalizantes IV · 2026</p>
</div>
