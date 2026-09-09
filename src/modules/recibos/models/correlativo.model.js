// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "correlativo"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Correlativo = sequelize.define("correlativo", {
    tipo_documento: {
      // ENUM restringe los valores permitidos a nivel de base de datos
      type: Sequelize.ENUM("ENTRADA", "SALIDA", "TRASLADO"),
      allowNull: false
    },
    serie: {
      // Prefijo alfanumérico para la numeración (p. ej. "GT-01")
      type: Sequelize.STRING(10),
      allowNull: false
    },
    ultimo_numero: {
      // Se incrementa atómicamente en cada emisión de documento
      type: Sequelize.INTEGER,
      defaultValue: 0
    }
  }, {
    // Índice único: solo puede existir un correlativo por sucursal y tipo de documento
    name: { singular: "correlativo", plural: "correlativos" },
    indexes: [
      {
        unique: true,
        fields: ["sucursal_id", "tipo_documento"]
      }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Correlativo.associate = (db) => {
    // Un correlativo pertenece a una sucursal
    Correlativo.belongsTo(db.sucursal, { foreignKey: "sucursal_id" });
  };

  return Correlativo;
};
