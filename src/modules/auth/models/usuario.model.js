// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "usuario"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Usuario = sequelize.define("usuario", {
    email: {
      type: Sequelize.STRING(150),
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: Sequelize.STRING(255),
      allowNull: false
    },
    perfil: {
      // ENUM restringe los valores permitidos a nivel de base de datos
      type: Sequelize.ENUM("ADMIN", "GERENTE", "BODEGUERO", "VENDEDOR", "CLIENTE"),
      allowNull: false
    },
    app: {
      // Diferencia usuarios del panel interno de los de la tienda en línea
      type: Sequelize.ENUM("INTERNO", "TIENDA"),
      allowNull: false
    },
    activo: {
      // Las bajas son lógicas: no se elimina el registro, se desactiva
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },
    email_verificado: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    token_recuperacion: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    token_expira: {
      type: Sequelize.DATE,
      allowNull: true
    },
    intentos_fallidos: {
      type: Sequelize.SMALLINT,
      defaultValue: 0
    },
    bloqueado_hasta: {
      type: Sequelize.DATE,
      allowNull: true
    },
    ultimo_acceso: {
      type: Sequelize.DATE,
      allowNull: true
    }
  }, {
    name: { singular: "usuario", plural: "usuarios" },
    indexes: [
      { unique: true, fields: ["email"] }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Usuario.associate = (db) => {
    // Un usuario puede estar vinculado a un empleado (perfil interno)
    Usuario.belongsTo(db.empleado, { foreignKey: "empleado_id" });
    // Un usuario puede estar vinculado a un cliente (perfil tienda)
    Usuario.belongsTo(db.cliente, { foreignKey: "cliente_id" });
    // Un usuario pertenece a una sucursal (para filtrar datos por sede)
    Usuario.belongsTo(db.sucursal, { foreignKey: "sucursal_id" });
  };

  return Usuario;
};
