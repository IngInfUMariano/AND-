// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "carrito_detalle"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const CarritoDetalle = sequelize.define("carrito_detalle", {
    cantidad: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    }
  }, {
    // Índice único: una variante no puede aparecer dos veces en el mismo carrito
    name: { singular: "carrito_detalle", plural: "carrito_detalles" },
    indexes: [
      {
        unique: true,
        fields: ["carrito_id", "variante_id"]
      }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  CarritoDetalle.associate = (db) => {
    // Un detalle de carrito pertenece a un carrito
    CarritoDetalle.belongsTo(db.carrito, { foreignKey: "carrito_id" });
    // Un detalle de carrito corresponde a una variante específica
    CarritoDetalle.belongsTo(db.variante, { foreignKey: "variante_id" });
  };

  return CarritoDetalle;
};
