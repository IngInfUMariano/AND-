// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "color"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Color = sequelize.define("color", {
    nombre: {
      type: Sequelize.STRING(50),
      allowNull: false
    },
    hex: {
      // Código de color en formato #RRGGBB para mostrar previsualizaciones en la UI
      type: Sequelize.STRING(7),
      allowNull: true
    },
    activo: {
      // Las bajas son lógicas: no se elimina el registro, se desactiva
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    name: { singular: "color", plural: "colores" },
    indexes: [
      { unique: true, fields: ["nombre"] }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Color.associate = (db) => {
    // Un color aparece en muchas variantes de productos
    Color.hasMany(db.variante, { foreignKey: "color_id" });
    // Un color puede tener muchas imágenes asociadas (para mostrar la imagen correcta por color)
    Color.hasMany(db.imagen_producto, { foreignKey: "color_id" });
  };

  return Color;
};
