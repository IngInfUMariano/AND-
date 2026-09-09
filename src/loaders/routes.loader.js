// routes.loader.js — monta automáticamente cada archivo de rutas de los módulos.
//
// Por qué existe este loader:
//   El estilo del tutorial pide que cada routes.js sea una función que recibe `app`
//   y llama a `app.use("/api/recurso", router)` internamente. Eso es muy legible
//   para el equipo, pero alguien tendría que ir a app.js a hacer require() de cada
//   nuevo archivo. Este loader elimina ese paso: basta con crear el archivo en la
//   carpeta correcta y el servidor lo detecta solo al arrancar.
//
// Convención de nombres:
//   src/modules/<modulo>/routes/<recurso>.route.js   ← formato principal
//   src/modules/<modulo>/routes/<recurso>.routes.js  ← también soportado

const path = require("path");
const fs   = require("fs");

module.exports = (app) => {
  const modulesDir = path.join(__dirname, "../modules");

  // Si la carpeta modules aún no existe (proyecto recién clonado) no rompe el arranque
  if (!fs.existsSync(modulesDir)) {
    console.log("[routes] Carpeta modules no encontrada — sin rutas montadas");
    return;
  }

  let cargadas = 0;

  // Recorrer cada módulo (catalogo, inventario, pedidos…)
  const modulos = fs.readdirSync(modulesDir, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name);

  for (const modulo of modulos) {
    const routesDir = path.join(modulesDir, modulo, "routes");
    if (!fs.existsSync(routesDir)) continue;

    // Aceptar tanto *.route.js como *.routes.js para compatibilidad con distintos estilos del equipo
    const archivos = fs.readdirSync(routesDir)
      .filter((f) => f.endsWith(".route.js") || f.endsWith(".routes.js"));

    for (const archivo of archivos) {
      const rutaCompleta = path.join(routesDir, archivo);
      const registrar    = require(rutaCompleta);

      // Validación defensiva: si alguien no exportó una función, avisa en lugar de crashear
      if (typeof registrar !== "function") {
        console.warn(`[routes] ⚠  ${modulo}/${archivo} no exporta function(app) — se omite`);
        continue;
      }

      // La propia función de rutas hace app.use("/api/...", router) adentro
      registrar(app);
      console.log(`[routes] ✓  ${modulo}/${archivo} montado`);
      cargadas++;
    }
  }

  console.log(`[routes] ${cargadas} archivo(s) de rutas montado(s)\n`);
};
