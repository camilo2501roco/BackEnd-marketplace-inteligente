import jwt from "jsonwebtoken";
import { User } from "../models/users.js";

/**
 * Verifica que el token sea válido
 * El token se envía en el header: Authorization: Bearer <token>
 */
export const validateJWT = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      error: true,
      mensaje: "No hay token en la petición",
    });
  }

  try {
    const { uid } = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await User.findById(uid).select("-password");

    if (!usuario) {
      return res.status(401).json({
        error: true,
        mensaje: "Token no válido - usuario no existe",
      });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: true,
        mensaje: "Token expirado, por favor inicia sesión nuevamente",
      });
    }
    return res.status(401).json({
      error: true,
      mensaje: "Token no válido",
    });
  }
};

/**
 * Verifica que el usuario tenga el rol requerido
 * Siempre va después de validateJWT
 * Uso: checkRole("admin") o checkRole("admin", "vendedor")
 */
export const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: true,
        mensaje: `Acceso denegado. Se requiere rol: ${roles.join(" o ")}`,
      });
    }
    next();
  };
};
