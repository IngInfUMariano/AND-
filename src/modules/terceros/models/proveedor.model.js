// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "proveedor"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Proveedor = sequelize.define("proveedor", {
    codigo: {
      type: Sequelize.STRING(20),
      allowNull: false
    },
    razon_social: {
      type: Sequelize.STRING(150),
      allowNull: false
    },
    nombre_comercial: {
      type: Sequelize.STRING(150),
      allowNull: true
    },
    nit: {
      type: Sequelize.STRING(20),
      allowNull: false
    },
    direccion: {
      type: Sequelize.STRING(250),
      allowNull: true
    },
    contacto_nombre: {
      type: Sequelize.STRING(120),
      allowNull: true
    },
    telefono: {
      type: Sequelize.STRING(20),
      allowNull: true
    },
    email: {
      type: Sequelize.STRING(150),
      allowNull: true
    },
    condiciones_pago: {
      type: Sequelize.STRING(100),
      allowNull: true
    },
    plazo_entrega_dias: {
      type: Sequelize.SMALLINT,
      allowNull: true
    },
    activo: {
      // Las bajas son lógicas: no se elimina el registro, se desactiva
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    name: { singular: "proveedor", plural: "proveedores" },
    indexes: [
      { unique: true, fields: ["codigo"] },
      { unique: true, fields: ["nit"] }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Proveedor.associate = (db) => {
    // Un proveedor puede abastecer muchos productos
    Proveedor.hasMany(db.proveedor_producto, { foreignKey: "proveedor_id" });
    // Un proveedor puede aparecer en muchos comprobantes de entrada
    Proveedor.hasMany(db.comprobante, { foreignKey: "proveedor_id" });
  };

  return Proveedor;
};
