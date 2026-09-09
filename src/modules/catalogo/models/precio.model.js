// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "precio"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Precio = sequelize.define("precio", {
    tipo: {
      // ENUM restringe los valores permitidos a nivel de base de datos
      type: Sequelize.ENUM("COSTO", "MINORISTA", "MAYORISTA"),
      allowNull: false
    },
    monto: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    vigente_desde: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    vigente_hasta: {
      // Null indica que este es el precio actualmente vigente; nunca se sobrescribe
      type: Sequelize.DATEONLY,
      allowNull: true
    }
  }, {
    name: { singular: "precio", plural: "precios" }
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Precio.associate = (db) => {
    // Un precio pertenece a una variante
    Precio.belongsTo(db.variante, { foreignKey: "variante_id" });
    // Un precio fue registrado por un usuario del sistema
    Precio.belongsTo(db.usuario, { foreignKey: "registrado_por", as: "registrador" });
  };

  return Precio;
};
