// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "existencia"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Existencia = sequelize.define("existencia", {
    cantidad_fisica: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    cantidad_comprometida: {
      // Unidades reservadas por pedidos en preparación, aún no despachadas
      type: Sequelize.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    existencia_minima: {
      // Umbral de alerta para reposición; no bloquea operaciones
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    costo_promedio: {
      type: Sequelize.DECIMAL(12, 2),
      defaultValue: 0
    },
    disponible: {
      // Campo virtual: unidades que se pueden vender = física − comprometida
      type: Sequelize.VIRTUAL,
      get() {
        return this.getDataValue("cantidad_fisica") - this.getDataValue("cantidad_comprometida");
      }
    }
  }, {
    // Índice único: solo puede existir un registro por variante y sucursal
    name: { singular: "existencia", plural: "existencias" },
    indexes: [
      {
        unique: true,
        fields: ["variante_id", "sucursal_id"]
      }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Existencia.associate = (db) => {
    // Una existencia pertenece a una variante específica
    Existencia.belongsTo(db.variante, { foreignKey: "variante_id" });
    // Una existencia pertenece a una sucursal específica
    Existencia.belongsTo(db.sucursal, { foreignKey: "sucursal_id" });
  };

  return Existencia;
};
