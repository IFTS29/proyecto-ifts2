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

> **Nota:** el proyecto está en desarrollo (Etapa 3). Este README se va actualizando a medida que avanza el
> trabajo. Las secciones marcadas con _"[a completar]"_ todavía no tienen contenido definitivo.

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
- Evaluar la incorporación de publicaciones de Instagram (condicionada al acceso a la API).

<br>

---

## ✅ Estado del Desarrollo

| Funcionalidad | Issue | Estado |
| :------------ | :---: | :----: |
| Estructura base del proyecto (React + Express) | #28 | 🟡 |
| Sitio público en React | #32 | 🟡 Pantallas listas, contenido todavía fijo |
| Inicio de sesión seguro | #30 | ✅ |
| Perfiles Administrador y Bedelía | #31 | 🟡 |
| Gestión de usuarios del panel | #38 | ✅ |
| Formulario de contacto con envío de correo | #37 | ✅ Código terminado · falta configurar el correo en Vercel |
| Modelos de datos y carga inicial | #29 | 🟡 Solo existe el modelo de usuarios |
| Información académica: horarios, aulas y mesas | #33 | ⏳ |
| Eventos institucionales con galería | #34 | ⏳ |
| Archivado de contenidos sin borrado | #35 | ⏳ |
| Contenido institucional editable | #36 | ⏳ |
| Integración con Instagram o carga manual | #39, #55 | 🔬 En evaluación |

✅ hecho · 🟡 parcial · ⏳ pendiente · 🔬 en evaluación

> Estado actualizado al 22/10/2026. Los avances posteriores se registran en los issues y Pull Requests del
> repositorio.

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
                   └──►  Servicios externos: correo (Nodemailer), imágenes y Instagram [a implementar]
```

| Capa | Tecnologías |
| :--- | :---------- |
| Frontend | React 18, Vite 5, React Router 6 |
| Backend | Node.js, Express 4, JWT, bcryptjs, helmet, express-rate-limit |
| Base de datos | MongoDB Atlas con Mongoose |
| Correo | Nodemailer con SMTP de Gmail: configuración sencilla y gratuita para el MVP |
| Despliegue | Vercel |
| Pruebas | node:test y supertest |

- **En local**, `server.js` levanta la API y el cliente juntos en `http://localhost:3000`.
- **En Vercel**, la API corre como función serverless (`api/index.js`) y el cliente compilado se sirve como
  sitio estático.
- **Sin base de datos ni correo configurados**, el proyecto funciona igual en local: los datos se guardan en
  memoria y el formulario de contacto usa un envío simulado.

El detalle de la arquitectura, la API, la base de datos y las decisiones técnicas va a estar en el
**Manual Técnico** _[en elaboración]_.

<br>

---

## 📂 Estructura del Proyecto

```text
proyecto-ifts2/
│
├── client/                   # Frontend (React + Vite)
│   └── src/
│       ├── pages/            # una pantalla por archivo (sitio público y panel)
│       ├── components/       # encabezado, pie, menú del panel, rutas protegidas
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
├── docs/                     # registro de cambios
├── .env.example              # variables de entorno de ejemplo
└── package.json              # dependencias y scripts
```

<br>

---

## 🚀 Instalación y Ejecución

### Requisitos previos

- **Node.js 22 o superior** (recomendado). Nodemailer requiere Node 20 como mínimo, pero el comando de
  pruebas actual necesita una versión más reciente en Windows.
- **Git**.

### Pasos

```powershell
git clone https://github.com/IFTS29/proyecto-ifts2.git
cd proyecto-ifts2
npm install
Copy-Item .env.example .env
npm run dev
```

- En Linux o Mac, en lugar de `Copy-Item`: `cp .env.example .env`.
- El sitio queda en `http://localhost:3000` y el panel en `http://localhost:3000/login`.
- Si PowerShell no deja ejecutar npm: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

### Scripts

| Comando | Descripción |
| :------ | :---------- |
| `npm run dev` | Desarrollo local (API + cliente) |
| `npm test` | Pruebas automáticas del servidor |
| `npm run build` | Compila el cliente en `client/dist` |
| `npm start` | Modo producción _[en Windows no funciona tal cual: a revisar]_ |

### Variables de entorno

Las variables están explicadas en `.env.example`. Sin completar nada, el proyecto funciona en local con datos
en memoria y envío de correo simulado.

> **Importante:** el `.env` nunca se sube al repositorio. Las claves (base de datos, JWT, correo) se cargan
> solo en el `.env` local y en las variables de entorno de Vercel.

### Credenciales de prueba

Se comparten con la cátedra por un canal privado, no en este repositorio _[a completar antes de la entrega]_.

<br>

---

## 🧪 Pruebas

```powershell
npm test
```

Actualmente hay **81 pruebas automáticas del servidor**, todas aprobadas. Cubren login y bloqueo por
intentos, permisos por rol, gestión de usuarios y formulario de contacto. No necesitan base de datos ni
conexión a Internet.

Las pruebas unitarias e integración documentadas para la entrega van en el issue #40 _[a completar]_.

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

| Documento | Estado |
| :-------- | :----- |
| Manual Técnico | En elaboración (#42) |
| Manual de Usuario | Pendiente (#43) |
| Registro de cambios | [docs/registro-de-cambios.md](docs/registro-de-cambios.md) |

<br>

---

## 👥 Equipo 404-Solutions

| Integrante | Rol | GitHub |
| :--------- | :-- | :----- |
| **Miguel Ángel Flores Meehan** | Product Owner · Analista de Negocio | [@mikefink22](https://github.com/mikefink22) |
| **Valeria Thomas** | Scrum Master · Gestión del Proyecto | _[completar]_ |
| **Raquel Rodriguez Herlein** | Frontend · Diseño UX/UI | [@raquerh](https://github.com/raquerh) |
| **Mario David Gonzalez Benitez** | Backend · Base de Datos | _[completar]_ |
| **Mariana Aiello** | QA · Documentación Técnica | [@Aiello-M](https://github.com/Aiello-M) |

<br>

---

<div align="center">
  <p>IFTS N.° 29 · Tecnicatura Superior en Desarrollo de Software · Prácticas Profesionalizantes IV · 2026</p>
</div>