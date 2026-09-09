// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "bitacora"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Bitacora = sequelize.define("bitacora", {
    usuario_id: {
      // Nullable porque algunas operaciones del sistema no tienen usuario autenticado
      type: Sequelize.INTEGER,
      allowNull: true
    },
    operacion: {
      type: Sequelize.STRING(60),
      allowNull: false
    },
    entidad: {
      type: Sequelize.STRING(60),
      allowNull: false
    },
    entidad_id: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    valores_anteriores: {
      // Snapshot del registro antes del cambio, para auditoría y rollback manual
      type: Sequelize.JSONB,
      allowNull: true
    },
    valores_nuevos: {
      // Snapshot del registro después del cambio
      type: Sequelize.JSONB,
      allowNull: true
    },
    ip: {
      type: Sequelize.STRING(45),
      allowNull: true
    },
    fecha: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    }
  }, {
    // El registro de auditoría nunca se modifica: no tiene sentido llevar cuándo fue "actualizado"
    updatedAt: false,
    name: { singular: "bitacora", plural: "bitacoras" }
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Bitacora.associate = (db) => {
    // Una entrada de bitácora puede pertenecer a un usuario
    Bitacora.belongsTo(db.usuario, { foreignKey: "usuario_id" });
  };

  return Bitacora;
};
