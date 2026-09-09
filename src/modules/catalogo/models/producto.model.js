// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "producto"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Producto = sequelize.define("producto", {
    codigo: {
      type: Sequelize.STRING(30),
      allowNull: false
    },
    nombre: {
      type: Sequelize.STRING(150),
      allowNull: false
    },
    descripcion: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    genero: {
      // ENUM restringe los valores permitidos a nivel de base de datos
      type: Sequelize.ENUM("HOMBRE", "MUJER", "NINO", "UNISEX"),
      defaultValue: "UNISEX"
    },
    activo: {
      // Las bajas son lógicas: no se elimina el registro, se desactiva
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    name: { singular: "producto", plural: "productos" },
    indexes: [
      { unique: true, fields: ["codigo"] }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Producto.associate = (db) => {
    // Un producto pertenece a una categoría
    Producto.belongsTo(db.categoria, { foreignKey: "categoria_id" });
    // Un producto puede pertenecer a una marca
    Producto.belongsTo(db.marca, { foreignKey: "marca_id" });
    // Un producto puede pertenecer a una temporada
    Producto.belongsTo(db.temporada, { foreignKey: "temporada_id" });
    // Un producto tiene muchas variantes (talla + color = unidad de inventario)
    Producto.hasMany(db.variante, { foreignKey: "producto_id" });
    // Un producto tiene muchas imágenes en galería
    Producto.hasMany(db.imagen_producto, { foreignKey: "producto_id" });
    // Un producto puede ser suministrado por muchos proveedores
    Producto.hasMany(db.proveedor_producto, { foreignKey: "producto_id" });
  };

  return Producto;
};
