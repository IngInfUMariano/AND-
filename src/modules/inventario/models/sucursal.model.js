// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "sucursal"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Sucursal = sequelize.define("sucursal", {
    codigo: {
      // El código es el prefijo de los correlativos de documentos generados en esta sucursal
      type: Sequelize.STRING(10),
      allowNull: false
    },
    nombre: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    direccion: {
      type: Sequelize.STRING(250),
      allowNull: true
    },
    telefono: {
      type: Sequelize.STRING(20),
      allowNull: true
    },
    es_bodega_central: {
      // La bodega central es el origen de los traslados hacia otras sucursales
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    vende_en_linea: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },
    activo: {
      // Las bajas son lógicas: no se elimina el registro, se desactiva
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    name: { singular: "sucursal", plural: "sucursales" },
    indexes: [
      { unique: true, fields: ["codigo"] }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Sucursal.associate = (db) => {
    // Una sucursal tiene muchos registros de existencia (uno por variante)
    Sucursal.hasMany(db.existencia, { foreignKey: "sucursal_id" });
    // Una sucursal tiene muchos movimientos de inventario
    Sucursal.hasMany(db.movimiento_inventario, { foreignKey: "sucursal_id" });
    // Una sucursal tiene muchos empleados asignados
    Sucursal.hasMany(db.empleado, { foreignKey: "sucursal_id" });
    // Una sucursal tiene muchos usuarios asignados
    Sucursal.hasMany(db.usuario, { foreignKey: "sucursal_id" });
    // Una sucursal es origen de muchos traslados
    Sucursal.hasMany(db.traslado, { foreignKey: "sucursal_origen_id", as: "trasladosSalientes" });
    // Una sucursal es destino de muchos traslados
    Sucursal.hasMany(db.traslado, { foreignKey: "sucursal_destino_id", as: "trasladosEntrantes" });
    // Una sucursal tiene muchos pedidos asignados
    Sucursal.hasMany(db.pedido, { foreignKey: "sucursal_id" });
  };

  return Sucursal;
};
