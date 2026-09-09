const app = require("./src/app");
const db = require("./src/loaders/models.loader");

const PORT = process.env.PORT || 3000;

if (process.env.DB_SYNC === "true") {
  db.sequelize
    .sync({ force: false })
    .then(() => {
      console.log("Tablas sincronizadas correctamente.");
      app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
    })
    .catch((err) => {
      console.error("Error al sincronizar las tablas:", err.message);
      process.exit(1);
    });
} else {
  app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
}
