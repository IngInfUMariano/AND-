module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || "cambiar_en_produccion",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "8h"
};
