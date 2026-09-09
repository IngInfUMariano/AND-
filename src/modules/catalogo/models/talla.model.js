// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "talla"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Talla = sequelize.define("talla", {
    codigo: {
      type: Sequelize.STRING(10),
      allowNull: false
    },
    descripcion: {
      type: Sequelize.STRING(50),
      allowNull: true
    },
    orden: {
      // Número entero que permite ordenar XS < S < M < L < XL en lugar de alfabéticamente
      type: Sequelize.SMALLINT,
      allowNull: false
    },
    activo: {
      // Las bajas son lógicas: no se elimina el registro, se desactiva
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    name: { singular: "talla", plural: "tallas" },
    indexes: [
      { unique: true, fields: ["codigo"] }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Talla.associate = (db) => {
    // Una talla aparece en muchas variantes de productos
    Talla.hasMany(db.variante, { foreignKey: "talla_id" });
  };

  return Talla;
};
