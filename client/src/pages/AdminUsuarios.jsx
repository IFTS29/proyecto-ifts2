import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import AdminLateral from "../components/AdminLateral.jsx";

export default function AdminUsuarios() {
  const { usuario } = useAuth();

  const VACIO = { nombre: "", mail: "", rol: "admin", password: "" };

  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [editando, setEditando] = useState(null); // id del usuario que se está editando
  const [error, setError] = useState("");
  const [okUsuario, setOkUsuario] = useState("");

  const cargar = () =>
    api("/users")
      .then((d) => setUsuarios(d.usuarios))
      .catch((e) => setError(e.message));

  useEffect(() => {
    cargar();
  }, []);

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const cancelar = () => {
    setEditando(null);
    setForm(VACIO);
    setError("");
  };

  const editar = (u) => {
    setEditando(u.id);
    setForm({ nombre: u.nombre, mail: u.mail, rol: u.rol, password: "" });
    setError("");
    setOkUsuario("");
    document.getElementById("form-usuario")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setOkUsuario("");
    try {
      if (editando) {
        await api("/users/" + editando, { metodo: "PUT", cuerpo: form });
        setOkUsuario("Cambios guardados.");
      } else {
        await api("/users", { metodo: "POST", cuerpo: form });
        setOkUsuario("Usuario agregado. Al iniciar sesión va a ver solo las secciones de su rol.");
      }
      setError("");
      setEditando(null);
      setForm(VACIO);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const quitar = async (u) => {
    if (!window.confirm("¿Eliminar a " + u.nombre + "?")) return;
    try {
      await api("/users/" + u.id, { metodo: "DELETE" });
      if (editando === u.id) cancelar();
      setError("");
      setOkUsuario("");
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin activa">
      <AdminLateral />
      <main className="contenido-admin">
        <div className="barra-admin">
          <span className="usuario">
            <span className="avatar">{usuario.iniciales}</span>
            {usuario.nombre}
          </span>
        </div>
        <div className="cab-admin">
          <div>
            <h1>Usuarios</h1>
            <p>
              Quién puede entrar al panel y qué puede hacer. Quien administra registra a cada
              persona y le asigna su rol.
            </p>
          </div>
        </div>
        <div className="caja" style={{ marginBottom: "24px" }}>
          <h2>Roles</h2>
          <ul className="actividad">
            <li>
              <span>
                <strong>Administrador</strong>: acceso total (eventos, información académica,
                contenido institucional y usuarios).
              </span>
            </li>
            <li>
              <span>
                <strong>Bedelía</strong>: solo información académica (horarios, mesas de examen,
                ingresantes y alumnos en curso).
              </span>
            </li>
          </ul>
        </div>
        <div className="caja" style={{ marginBottom: "24px" }}>
          <h2>{editando ? "Editar usuario" : "Agregar un usuario"}</h2>
          <form id="form-usuario" noValidate onSubmit={guardar}>
            <div className="fila">
              <div className="campo">
                <label htmlFor="u-nombre">Nombre y apellido</label>
                <input
                  id="u-nombre"
                  autoComplete="off"
                  value={form.nombre}
                  onChange={cambiar("nombre")}
                />
              </div>
              <div className="campo">
                <label htmlFor="u-mail">Correo electrónico</label>
                <input
                  id="u-mail"
                  type="email"
                  autoComplete="off"
                  value={form.mail}
                  onChange={cambiar("mail")}
                />
              </div>
            </div>
            <div className="fila">
              <div className="campo">
                <label htmlFor="u-rol">Rol</label>
                <select
                  id="u-rol"
                  value={form.rol}
                  onChange={cambiar("rol")}
                  disabled={editando === usuario.id}
                >
                  <option value="admin">Administrador</option>
                  <option value="bedelia">Bedelía</option>
                </select>
              </div>
              <div className="campo">
                <label htmlFor="u-pass">
                  {editando ? "Contraseña nueva (opcional)" : "Contraseña inicial"}
                </label>
                <input
                  id="u-pass"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={cambiar("password")}
                />
              </div>
            </div>
            <p style={{ color: "var(--suave)", fontSize: "14px" }}>
              {editando ? "Si dejás la contraseña vacía, se mantiene la actual. " : ""}
              La contraseña debe tener al menos 8 caracteres, con una mayúscula y un número.
            </p>
            <p
              className={"aviso" + (error ? " visible error" : "")}
              id="error-usuario"
              role="alert"
            >
              {error}
            </p>
            <button className="boton boton-verde" type="submit">
              {editando ? "Guardar cambios" : "Agregar usuario"}
            </button>
            {editando && (
              <button
                className="boton boton-linea"
                type="button"
                style={{ marginLeft: "8px" }}
                onClick={cancelar}
              >
                Cancelar
              </button>
            )}
            <p className={"aviso" + (okUsuario ? " visible" : "")} id="ok-usuario" role="status">
              {okUsuario}
            </p>
          </form>
        </div>
        <div className="tabla-caja">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="tabla-usuarios">
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.nombre}</strong>
                  </td>
                  <td>{u.mail}</td>
                  <td>
                    <span className={"etiqueta " + (u.rol === "admin" ? "et-verde" : "et-naranja")}>
                      {u.rol === "admin" ? "Administrador" : "Bedelía"}
                    </span>
                  </td>
                  <td>
                    <div className="acciones-fila">
                      <button
                        className="boton boton-linea boton-chico"
                        type="button"
                        onClick={() => editar(u)}
                      >
                        Editar
                      </button>
                      <button
                        className="boton boton-linea boton-chico"
                        type="button"
                        onClick={() => quitar(u)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ color: "var(--suave)", fontSize: "14px", marginTop: "12px" }}>
          Las cuentas (tres con acceso total y dos de Bedelía) las informa el instituto. Quien
          administra las da de alta desde acá.
        </p>
      </main>
    </div>
  );
}
