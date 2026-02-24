import { body } from "express-validator";
import { validateFields } from "./validations.js";
import { Category } from "../models/categories.js";

// Crear categoría
export const createCategoryValidations = [
  body("name")
    .trim()
    .notEmpty().withMessage("El nombre es obligatorio")
    .isLength({ min: 2, max: 100 }).withMessage("El nombre debe tener entre 2 y 100 caracteres")
    .custom(async (name) => {
      const exists = await Category.findOne({ name });
      if (exists) throw new Error("Ya existe una categoría con ese nombre");
    }),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("La descripción no puede superar 500 caracteres"),

  validateFields,
];

// Actualizar categoría
export const updateCategoryValidations = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage("El nombre debe tener entre 2 y 100 caracteres")
    .custom(async (name, { req }) => {
      const exists = await Category.findOne({ name, _id: { $ne: req.params.id } });
      if (exists) throw new Error("Ya existe una categoría con ese nombre");
    }),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("La descripción no puede superar 500 caracteres"),

  validateFields,
];

// Sugerir categorías similares
export const suggestSimilarValidations = [
  body("name")
    .trim()
    .notEmpty().withMessage("El nombre es obligatorio"),

  validateFields,
];
