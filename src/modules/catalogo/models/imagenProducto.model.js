// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "imagen_producto"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const ImagenProducto = sequelize.define("imagen_producto", {
    url: {
      type: Sequelize.STRING(500),
      allowNull: false
    },
    orden: {
      type: Sequelize.SMALLINT,
      defaultValue: 0
    },
    es_principal: {
      // Indica la imagen que se muestra en listados y miniaturas
      type: Sequelize.BOOLEAN,
      defaultValue: false
    }
  }, {
    name: { singular: "imagen_producto", plural: "imagen_productos" }
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  ImagenProducto.associate = (db) => {
    // Una imagen pertenece a un producto
    ImagenProducto.belongsTo(db.producto, { foreignKey: "producto_id" });
    // Una imagen puede estar asociada a un color específico de la galería
    ImagenProducto.belongsTo(db.color, { foreignKey: "color_id" });
  };

  return ImagenProducto;
};
