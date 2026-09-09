// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "zona_envio"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const ZonaEnvio = sequelize.define("zona_envio", {
    nombre: {
      type: Sequelize.STRING(80),
      allowNull: false
    },
    costo: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    dias_estimados: {
      type: Sequelize.SMALLINT,
      allowNull: true
    },
    activo: {
      // Las bajas son lógicas: no se elimina el registro, se desactiva
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    name: { singular: "zona_envio", plural: "zona_envios" },
    indexes: [
      { unique: true, fields: ["nombre"] }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  ZonaEnvio.associate = (db) => {
    // Una zona de envío puede ser referenciada por muchas direcciones de clientes
    ZonaEnvio.hasMany(db.direccion_cliente, { foreignKey: "zona_envio_id" });
  };

  return ZonaEnvio;
};
