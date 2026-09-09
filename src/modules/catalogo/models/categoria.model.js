// Utilizamos module.exports para exportar el modelo para que pueda ser usado en otras clases
module.exports = (sequelize, Sequelize) => {
  // sequelize.define() define el nombre de la entidad en la BD, en este caso "categoria"
  // Sequelize.<TIPO> define el tipo de dato de cada atributo
  const Categoria = sequelize.define("categoria", {
    nombre: {
      type: Sequelize.STRING(80),
      allowNull: false
    },
    descripcion: {
      type: Sequelize.STRING(250),
      allowNull: true
    },
    activo: {
      // Las bajas son lógicas: no se elimina el registro, se desactiva
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    name: { singular: "categoria", plural: "categorias" },
    indexes: [
      { unique: true, fields: ["nombre"] }
    ]
  });

  // associate() define las relaciones de esta entidad con las demás.
  // El loader la ejecuta después de cargar todos los modelos.
  Categoria.associate = (db) => {
    // Autorreferencia: una categoría puede tener una categoría padre (árbol de categorías)
    Categoria.belongsTo(db.categoria, { foreignKey: "categoria_padre_id", as: "categoriaPadre" });
    // Una categoría padre tiene muchas subcategorías
    Categoria.hasMany(db.categoria, { foreignKey: "categoria_padre_id", as: "subcategorias" });
    // Una categoría agrupa muchos productos
    Categoria.hasMany(db.producto, { foreignKey: "categoria_id" });
  };

  return Categoria;
};
