export function irA(id) {
  const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reducido ? "auto" : "smooth" });
}
