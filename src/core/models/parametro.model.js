// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "parametro"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Parametro = sequelize.define("parametro", {
    clave: {
      type: Sequelize.STRING(60),
      allowNull: false
    },
    valor: {
      type: Sequelize.STRING(255),
      allowNull: false
    },
    tipo_dato: {
      // ENUM indica cómo deserializar el valor al leerlo desde código
      type: Sequelize.ENUM("NUMERO", "TEXTO", "BOOLEANO"),
      allowNull: false
    },
    descripcion: {
      type: Sequelize.STRING(250),
      allowNull: true
    }
  }, {
    name: { singular: "parametro", plural: "parametros" },
    indexes: [
      { unique: true, fields: ["clave"] }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Parametro.associate = (_db) => {
    // Sin relaciones: tabla de configuración global del sistema
  };

  return Parametro;
};
