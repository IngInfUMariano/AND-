// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "carrito"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Carrito = sequelize.define("carrito", {
    activo: {
      // Solo puede haber un carrito activo por cliente; los anteriores se desactivan al confirmar pedido
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    name: { singular: "carrito", plural: "carritos" }
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Carrito.associate = (db) => {
    // Un carrito pertenece a un cliente
    Carrito.belongsTo(db.cliente, { foreignKey: "cliente_id" });
    // Un carrito tiene muchas líneas de productos agregados
    Carrito.hasMany(db.carrito_detalle, { foreignKey: "carrito_id" });
  };

  return Carrito;
};
