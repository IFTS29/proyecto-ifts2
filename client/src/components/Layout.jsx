import { Outlet } from "react-router-dom";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import SesionFlotante from "./SesionFlotante.jsx";

export default function Layout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <SesionFlotante />
    </>
  );
}
