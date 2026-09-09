// asyncHandler evita repetir try/catch en cada controlador async.
// Express 5 ya propaga promesas rechazadas, pero este wrapper es explícito y
// hace que el código del equipo quede uniforme sin importar la versión de Express.
//
// Uso:
//   router.get("/productos", asyncHandler(async (req, res) => {
//     const data = await ProductoService.listar();
//     ok(res, data);
//   }));
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
