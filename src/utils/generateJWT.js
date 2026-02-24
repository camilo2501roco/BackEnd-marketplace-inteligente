import jwt from "jsonwebtoken";

/**
 * Genera un JWT para un usuario
 * @param {string} uid - ID del usuario
 * @returns {string} Token generado
 */
export const generateJWT = (uid) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  return jwt.sign({ uid }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "4h",
  });
};
