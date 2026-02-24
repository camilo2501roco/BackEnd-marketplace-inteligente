import multer from "multer";
import path from "path";
import fs from "fs";

const createFolder = (folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
};

// Configuración de storage reutilizable
const createStorage = (folder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      createFolder(folder);
      cb(null, folder);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, uniqueName);
    },
  });

// Solo permite imágenes
const imageFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de archivo no permitido. Solo JPG, PNG o WEBP"), false);
  }
};

// Para productos
export const uploadProductImage = multer({
  storage: createStorage("uploads/products"),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Para categorías
export const uploadCategoryImage = multer({
  storage: createStorage("uploads/categories"),
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});
