// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "cliente"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Cliente = sequelize.define("cliente", {
    codigo: {
      type: Sequelize.STRING(20),
      allowNull: false
    },
    tipo: {
      // ENUM restringe los valores permitidos a nivel de base de datos
      type: Sequelize.ENUM("MINORISTA", "MAYORISTA"),
      allowNull: false
    },
    nombre: {
      type: Sequelize.STRING(150),
      allowNull: false
    },
    nombre_comercial: {
      type: Sequelize.STRING(150),
      allowNull: true
    },
    nit: {
      type: Sequelize.STRING(20),
      allowNull: true
    },
    email: {
      type: Sequelize.STRING(150),
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    telefono: {
      type: Sequelize.STRING(20),
      allowNull: true
    },
    direccion_fiscal: {
      type: Sequelize.STRING(250),
      allowNull: true
    },
    contacto_nombre: {
      type: Sequelize.STRING(120),
      allowNull: true
    },
    estado: {
      // El flujo de aprobación controla quién puede comprar a crédito o como mayorista
      type: Sequelize.ENUM("PENDIENTE", "APROBADO", "RECHAZADO", "INACTIVO"),
      defaultValue: "PENDIENTE"
    },
    motivo_rechazo: {
      type: Sequelize.STRING(250),
      allowNull: true
    },
    fecha_aprobacion: {
      type: Sequelize.DATE,
      allowNull: true
    },
    limite_credito: {
      type: Sequelize.DECIMAL(12, 2),
      defaultValue: 0
    },
    credito_utilizado: {
      type: Sequelize.DECIMAL(12, 2),
      defaultValue: 0
    },
    plazo_credito_dias: {
      type: Sequelize.SMALLINT,
      defaultValue: 0
    },
    terminos_aceptados_en: {
      type: Sequelize.DATE,
      allowNull: true
    },
    version_terminos: {
      type: Sequelize.STRING(10),
      allowNull: true
    },
    activo: {
      // Las bajas son lógicas: no se elimina el registro, se desactiva
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    name: { singular: "cliente", plural: "clientes" },
    indexes: [
      { unique: true, fields: ["codigo"] },
      { unique: true, fields: ["nit"] },
      { unique: true, fields: ["email"] }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Cliente.associate = (db) => {
    // El cliente fue aprobado por un usuario del sistema
    Cliente.belongsTo(db.usuario, { foreignKey: "aprobado_por", as: "aprobador" });
    // Un cliente tiene muchas direcciones de entrega
    Cliente.hasMany(db.direccion_cliente, { foreignKey: "cliente_id" });
    // Un cliente tiene muchos pedidos
    Cliente.hasMany(db.pedido, { foreignKey: "cliente_id" });
    // Un cliente tiene muchos movimientos de crédito
    Cliente.hasMany(db.credito_movimiento, { foreignKey: "cliente_id" });
    // Un cliente puede tener una cuenta de usuario en la tienda
    Cliente.hasOne(db.usuario, { foreignKey: "cliente_id" });
  };

  return Cliente;
};
