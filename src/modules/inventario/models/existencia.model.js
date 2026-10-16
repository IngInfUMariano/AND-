module.exports = (sequelize, Sequelize) => {
  const Existencia = sequelize.define("existencia", {
    cantidad_fisica: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    cantidad_comprometida: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    costo_promedio: {
      type: Sequelize.DECIMAL(12, 2),
      defaultValue: 0
    },
    disponible: {
      type: Sequelize.VIRTUAL,
      get() {
        return this.getDataValue("cantidad_fisica") - this.getDataValue("cantidad_comprometida");
      }
    }
  }, {
    name: { singular: "existencia", plural: "existencias" },
    indexes: [
      {
        unique: true,
        fields: ["variante_id", "sucursal_id"]
      }
    ]
  });

  Existencia.associate = (db) => {
    Existencia.belongsTo(db.variante, { foreignKey: "variante_id" });
    Existencia.belongsTo(db.sucursal, { foreignKey: "sucursal_id" });
  };

  return Existencia;
};