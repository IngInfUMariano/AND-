module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || "cambiar_en_produccion",
  // Sesiones del portal interno: cortas porque el personal trabaja en turnos definidos
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "8h",
  // Sesiones de la tienda: más largas para no interrumpir al comprador a mitad de sesión
  JWT_EXPIRES_IN_TIENDA: process.env.JWT_EXPIRES_IN_TIENDA || "30d"
};
