import { body } from "express-validator";
import { validateFields } from "../middlewares/validations.js";

// Crear producto
export const createProductValidations = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("El nombre del producto es obligatorio")
    .isLength({ min: 2, max: 200 })
    .withMessage("El nombre debe tener entre 2 y 200 caracteres"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("La descripción no puede superar 1000 caracteres"),

  body("price")
    .notEmpty()
    .withMessage("El precio es obligatorio")
    .isFloat({ min: 0 })
    .withMessage("El precio debe ser un número mayor a 0"),

  body("stock")
    .notEmpty()
    .withMessage("El stock es obligatorio")
    .isInt({ min: 0 })
    .withMessage("El stock debe ser un número entero mayor o igual a 0"),

  body("category_id")
    .notEmpty()
    .withMessage("La categoría es obligatoria")
    .isMongoId()
    .withMessage("El ID de categoría no es válido"),

  validateFields,
];

// Actualizar producto
export const updateProductValidations = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage("El nombre debe tener entre 2 y 200 caracteres"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("La descripción no puede superar 1000 caracteres"),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("El precio debe ser un número mayor a 0"),

  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("El stock debe ser un número entero mayor o igual a 0"),

  body("category_id")
    .optional()
    .isMongoId()
    .withMessage("El ID de categoría no es válido"),

  validateFields,
];

// Agregar reseña
export const createReviewValidations = [
  body("qualification")
    .notEmpty()
    .withMessage("La calificación es obligatoria")
    .isInt({ min: 1, max: 5 })
    .withMessage("La calificación debe ser entre 1 y 5"),

  body("comment")
    .trim()
    .notEmpty()
    .withMessage("El comentario es obligatorio")
    .isLength({ min: 5, max: 500 })
    .withMessage("El comentario debe tener entre 5 y 500 caracteres"),

  validateFields,
];
