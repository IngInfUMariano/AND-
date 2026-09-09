const { Sequelize } = require("sequelize");
const dbConfig = require("../config/db.config");
const path = require("path");
const fs = require("fs");

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  port: dbConfig.PORT,
  dialect: dbConfig.dialect,
  pool: dbConfig.pool,
  define: {
    // Las columnas timestamps y FKs se generan en snake_case automáticamente
    underscored: true
  },
  logging: false
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Carpetas donde viven los modelos: módulos de negocio y modelos de core
const modelDirs = [
  path.join(__dirname, "../core/models"),
  path.join(__dirname, "../modules/auth/models"),
  path.join(__dirname, "../modules/terceros/models"),
  path.join(__dirname, "../modules/catalogo/models"),
  path.join(__dirname, "../modules/inventario/models"),
  path.join(__dirname, "../modules/pedidos/models"),
  path.join(__dirname, "../modules/recibos/models"),
  path.join(__dirname, "../modules/pagos/models")
];

// Primera pasada: cargar todos los modelos y registrarlos en db por su nombre de tabla
modelDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir)
    .filter((file) => file.endsWith(".model.js"))
    .forEach((file) => {
      const model = require(path.join(dir, file))(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
    });
});

// Segunda pasada: ejecutar associate() en cada modelo para que todas las referencias en db.<x> ya existan
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
