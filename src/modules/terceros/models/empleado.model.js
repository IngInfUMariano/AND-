// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "empleado"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Empleado = sequelize.define("empleado", {
    codigo: {
      type: Sequelize.STRING(20),
      allowNull: false
    },
    nombres: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    apellidos: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    dpi: {
      type: Sequelize.STRING(20),
      allowNull: false
    },
    puesto: {
      type: Sequelize.STRING(80),
      allowNull: false
    },
    fecha_ingreso: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    telefono: {
      type: Sequelize.STRING(20),
      allowNull: true
    },
    email: {
      type: Sequelize.STRING(150),
      allowNull: true
    },
    activo: {
      // Las bajas son lógicas: no se elimina el registro, se desactiva
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    name: { singular: "empleado", plural: "empleados" },
    indexes: [
      { unique: true, fields: ["codigo"] },
      { unique: true, fields: ["dpi"] }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Empleado.associate = (db) => {
    // Un empleado pertenece a una sucursal
    Empleado.belongsTo(db.sucursal, { foreignKey: "sucursal_id" });
    // Un empleado puede tener una cuenta de usuario en el sistema interno
    Empleado.hasOne(db.usuario, { foreignKey: "empleado_id" });
  };

  return Empleado;
};
