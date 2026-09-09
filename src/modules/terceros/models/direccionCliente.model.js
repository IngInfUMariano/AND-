// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "direccion_cliente"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const DireccionCliente = sequelize.define("direccion_cliente", {
    alias: {
      type: Sequelize.STRING(50),
      allowNull: false
    },
    destinatario: {
      type: Sequelize.STRING(120),
      allowNull: false
    },
    direccion: {
      type: Sequelize.STRING(250),
      allowNull: false
    },
    referencia: {
      type: Sequelize.STRING(250),
      allowNull: true
    },
    municipio: {
      type: Sequelize.STRING(80),
      allowNull: false
    },
    departamento: {
      type: Sequelize.STRING(80),
      allowNull: false
    },
    telefono: {
      type: Sequelize.STRING(20),
      allowNull: true
    },
    es_predeterminada: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    activo: {
      // Las bajas son lógicas: no se elimina el registro, se desactiva
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    name: { singular: "direccion_cliente", plural: "direccion_clientes" }
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  DireccionCliente.associate = (db) => {
    // Una dirección pertenece a un cliente
    DireccionCliente.belongsTo(db.cliente, { foreignKey: "cliente_id" });
    // Una dirección puede estar asignada a una zona de envío con tarifa propia
    DireccionCliente.belongsTo(db.zona_envio, { foreignKey: "zona_envio_id" });
  };

  return DireccionCliente;
};
