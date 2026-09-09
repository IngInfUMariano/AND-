// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "marca"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Marca = sequelize.define("marca", {
    nombre: {
      type: Sequelize.STRING(80),
      allowNull: false
    },
    descripcion: {
      type: Sequelize.STRING(250),
      allowNull: true
    },
    activo: {
      // Las bajas son lógicas: no se elimina el registro, se desactiva
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    name: { singular: "marca", plural: "marcas" },
    indexes: [
      { unique: true, fields: ["nombre"] }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Marca.associate = (db) => {
    // Una marca tiene muchos productos
    Marca.hasMany(db.producto, { foreignKey: "marca_id" });
  };

  return Marca;
};
