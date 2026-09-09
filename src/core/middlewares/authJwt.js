const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../../config/auth.config");
const AppError = require("../utils/AppError");

// verifyToken valida la firma del JWT y adjunta el payload a req.usuario para
// que los middlewares y controladores posteriores no vuelvan a decodificarlo.
const verifyToken = (req, _res, next) => {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return next(AppError.noAutenticado("Token no proporcionado"));

  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(AppError.noAutenticado("Token inválido o expirado"));
  }
};

// hasRole restringe el acceso a los perfiles indicados.
// Uso: router.delete("/usuarios/:id", verifyToken, hasRole("ADMIN", "GERENTE"), handler)
const hasRole = (...perfiles) => (req, _res, next) => {
  if (!perfiles.includes(req.usuario?.perfil)) {
    return next(
      AppError.sinPermiso(
        `Se requiere uno de estos perfiles: ${perfiles.join(", ")}`
      )
    );
  }
  next();
};

// onlyApp impide que un token de la tienda llegue a endpoints del portal
// interno y viceversa. La separación de contextos está en el token (campo app).
// Uso: router.get("/reportes", verifyToken, onlyApp("interno"), handler)
const onlyApp = (appPermitida) => (req, _res, next) => {
  if (req.usuario?.app !== appPermitida) {
    return next(
      AppError.sinPermiso(
        `Este endpoint es exclusivo de la aplicación "${appPermitida}"`
      )
    );
  }
  next();
};

module.exports = { verifyToken, hasRole, onlyApp };
