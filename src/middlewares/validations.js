import { body, param } from "express-validator";
import { validationResult } from "express-validator";
import { User } from "../models/users.js";

// ─────────────────────────────────────────────
// GLOBAL
// Detiene la ejecución si hay errores de validación
// Se coloca al final de cada array de validaciones
// ─────────────────────────────────────────────
export const validateFields = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      mensaje: "Datos inválidos",
      errores: errors.array().map((e) => ({
        campo: e.path,
        mensaje: e.msg,
      })),
    });
  }
  next();
};

// Valida que el :id sea un MongoID válido
export const validateMongoId = [
  param("id").isMongoId().withMessage("El ID proporcionado no es válido"),
  validateFields,
];

// Factory para validar cualquier parámetro MongoID
// Uso: validateMongoIdParam('sellerId'), validateMongoIdParam('productId'), etc.
export const validateMongoIdParam = (paramName = "id") => [
  param(paramName)
    .isMongoId()
    .withMessage(`El ${paramName} proporcionado no es válido`),
  validateFields,
];

// ─────────────────────────────────────────────
// AUTH - Registro
// ─────────────────────────────────────────────
export const registerValidations = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("El nombre es obligatorio")
    .isLength({ min: 2, max: 100 })
    .withMessage("El nombre debe tener entre 2 y 100 caracteres"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("El email es obligatorio")
    .isEmail()
    .withMessage("El email no es válido")
    .normalizeEmail()
    .custom(async (email) => {
      const exists = await User.findOne({ email });
      if (exists) throw new Error("El email ya está registrado");
    }),

  body("password")
    .notEmpty()
    .withMessage("La contraseña es obligatoria")
    .isLength({ min: 8 })
    .withMessage("La contraseña debe tener mínimo 8 caracteres")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "La contraseña debe tener al menos una mayúscula, una minúscula y un número",
    ),

  body("rol")
    .optional()
    .isIn(["comprador", "vendedor"])
    .withMessage("El rol debe ser comprador o vendedor"),

  validateFields,
];

// ─────────────────────────────────────────────
// AUTH - Login
// ─────────────────────────────────────────────
export const loginValidations = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("El email es obligatorio")
    .isEmail()
    .withMessage("El email no es válido")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("La contraseña es obligatoria"),

  validateFields,
];

// ─────────────────────────────────────────────
// AUTH - Cambio de contraseña
// ─────────────────────────────────────────────
export const changePasswordValidations = [
  body("current_password")
    .notEmpty()
    .withMessage("La contraseña actual es obligatoria"),

  body("new_password")
    .notEmpty()
    .withMessage("La nueva contraseña es obligatoria")
    .isLength({ min: 8 })
    .withMessage("La nueva contraseña debe tener mínimo 8 caracteres")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "La nueva contraseña debe tener al menos una mayúscula, una minúscula y un número",
    ),

  body("confirm_password")
    .notEmpty()
    .withMessage("Debes confirmar la nueva contraseña")
    .custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error("Las contraseñas no coinciden");
      }
      return true;
    }),

  validateFields,
];

// ─────────────────────────────────────────────
// AUTH - Actualizar perfil propio
// El usuario puede cambiar su nombre y/o email
// ─────────────────────────────────────────────
export const updateProfileValidations = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("El nombre debe tener entre 2 y 100 caracteres"),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("El email no es válido")
    .normalizeEmail(),

  body("password")
    .not()
    .exists()
    .withMessage("No se puede cambiar la contraseña desde este endpoint"),

  validateFields,
];

// ─────────────────────────────────────────────
// AUTH - Olvidé mi contraseña
// ─────────────────────────────────────────────
export const forgotPasswordValidations = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("El email es obligatorio")
    .isEmail()
    .withMessage("El email no es válido")
    .normalizeEmail(),

  validateFields,
];

// ─────────────────────────────────────────────
// AUTH - Resetear contraseña
// ─────────────────────────────────────────────
export const resetPasswordValidations = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("El email es obligatorio")
    .isEmail()
    .withMessage("El email no es válido")
    .normalizeEmail(),

  body("code")
    .trim()
    .notEmpty()
    .withMessage("El código es obligatorio")
    .isLength({ min: 6, max: 6 })
    .withMessage("El código debe tener 6 dígitos"),

  body("new_password")
    .notEmpty()
    .withMessage("La nueva contraseña es obligatoria")
    .isLength({ min: 8 })
    .withMessage("La contraseña debe tener mínimo 8 caracteres")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "La contraseña debe tener al menos una mayúscula, una minúscula y un número",
    ),

  validateFields,
];
