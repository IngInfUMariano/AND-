// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "temporada"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Temporada = sequelize.define("temporada", {
    nombre: {
      type: Sequelize.STRING(80),
      allowNull: false
    },
    anio: {
      type: Sequelize.SMALLINT,
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
    // Índice único: no puede repetirse la misma temporada en el mismo año
    name: { singular: "temporada", plural: "temporadas" },
    indexes: [
      {
        unique: true,
        fields: ["nombre", "anio"]
      }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Temporada.associate = (db) => {
    // Una temporada agrupa muchos productos
    Temporada.hasMany(db.producto, { foreignKey: "temporada_id" });
  };

  return Temporada;
};
