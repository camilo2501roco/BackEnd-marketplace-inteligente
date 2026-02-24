import { Category } from "../models/categories.js";
import { Product } from "../models/products.js";
import { getGeminiModel } from "../config/gemini.js";
import fs from "fs";

// POST /api/categories - Privado (solo admin)
export const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const imagen_icono = req.file ? `/uploads/categories/${req.file.filename}` : null;

    const category = await Category.create({ name, description, imagen_icono });

    res.status(201).json({
      error: false,
      mensaje: "Categoría creada exitosamente",
      categoria: category,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/categories - Público
// Query: q (búsqueda), sortBy, order, page, limit, from, to
export const getCategories = async (req, res, next) => {
  try {
    const { q, sortBy = "creation_date", order = "desc", page = 1, limit = 10, from, to } = req.query;

    const filter = {};

    // Búsqueda por nombre
    if (q) filter.name = { $regex: q, $options: "i" };

    // Filtro por fecha de creación
    if (from || to) {
      filter.creation_date = {};
      if (from) filter.creation_date.$gte = new Date(from);
      if (to) filter.creation_date.$lte = new Date(to);
    }

    const parsedLimit = Math.min(Number(limit) || 10, 50);
    const parsedPage = Number(page) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

    // Ordenamiento: desc = -1, asc = 1
    const sortOrder = order === "asc" ? 1 : -1;
    const validSortFields = ["name", "creation_date"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "creation_date";

    const [categories, total] = await Promise.all([
      Category.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(parsedLimit),
      Category.countDocuments(filter),
    ]);

    res.status(200).json({
      error: false,
      total,
      page: parsedPage,
      total_pages: Math.ceil(total / parsedLimit),
      categorias: categories,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/categories/:id - Público
export const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ error: true, mensaje: "Categoría no encontrada" });
    }

    res.status(200).json({ error: false, categoria: category });
  } catch (error) {
    next(error);
  }
};

// PUT /api/categories/:id - Privado (solo admin)
export const updateCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const fields = {};
    if (name) fields.name = name;
    if (description) fields.description = description;

    // Si se subió nueva imagen, eliminamos la anterior
    if (req.file) {
      const current = await Category.findById(req.params.id);
      if (current?.imagen_icono) {
        const oldPath = `.${current.imagen_icono}`;
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      fields.imagen_icono = `/uploads/categories/${req.file.filename}`;
    }

    const category = await Category.findByIdAndUpdate(req.params.id, fields, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return res.status(404).json({ error: true, mensaje: "Categoría no encontrada" });
    }

    res.status(200).json({ error: false, mensaje: "Categoría actualizada", categoria: category });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/categories/:id - Privado (solo admin)
export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ error: true, mensaje: "Categoría no encontrada" });
    }

    // Verificamos si tiene productos asociados
    const productCount = await Product.countDocuments({ category_id: req.params.id });
    if (productCount > 0) {
      return res.status(400).json({
        error: true,
        mensaje: `No se puede eliminar. La categoría tiene ${productCount} producto(s) asociado(s)`,
      });
    }

    // Eliminamos la imagen si existe
    if (category.imagen_icono) {
      const imgPath = `.${category.imagen_icono}`;
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({ error: false, mensaje: "Categoría eliminada exitosamente" });
  } catch (error) {
    next(error);
  }
};

// GET /api/categories/:id/products - Público
// Obtiene los productos de una categoría con estadísticas
export const getCategoryProducts = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: true, mensaje: "Categoría no encontrada" });
    }

    const products = await Product.find({ category_id: req.params.id })
      .populate("seller_id", "name email")
      .lean();

    // Estadísticas
    const total = products.length;
    const avgPrice = total > 0 ? products.reduce((sum, p) => sum + p.price, 0) / total : 0;
    const minPrice = total > 0 ? Math.min(...products.map((p) => p.price)) : 0;
    const maxPrice = total > 0 ? Math.max(...products.map((p) => p.price)) : 0;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);

    res.status(200).json({
      error: false,
      categoria: category.name,
      estadisticas: {
        total_productos: total,
        precio_promedio: parseFloat(avgPrice.toFixed(2)),
        precio_minimo: minPrice,
        precio_maximo: maxPrice,
        stock_total: totalStock,
      },
      productos: products,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/categories/:id/generate-description - Privado (solo admin)
// Genera descripción automática con IA
export const generateCategoryDescription = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: true, mensaje: "Categoría no encontrada" });
    }

    const model = getGeminiModel();

    const prompt = `Eres un experto en marketing para un marketplace.
    Genera una descripción atractiva y profesional en español para esta categoría de productos:
    - Nombre: ${category.name}
    
    La descripción debe tener máximo 100 palabras, ser clara y explicar qué tipo de productos incluye esta categoría.
    Responde únicamente con la descripción, sin títulos ni texto extra.`;

    const result = await model.generateContent(prompt);
    const description = result.response.text();

    res.status(200).json({
      error: false,
      categoria: category.name,
      descripcion_generada: description,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/categories/suggest-similar - Privado (solo admin)
// Sugiere categorías similares o relacionadas con IA
export const suggestSimilarCategories = async (req, res, next) => {
  try {
    const { name } = req.body;

    // Traemos las categorías existentes
    const existing = await Category.find().select("name");
    const existingNames = existing.map((c) => c.name).join(", ");

    const model = getGeminiModel();

    const prompt = `Eres un experto en organización de marketplaces.
    Se quiere crear una categoría llamada "${name}".
    Las categorías que ya existen son: ${existingNames || "ninguna"}.
    
    Sugiere 3 categorías relacionadas o similares que complementarían bien el marketplace.
    Responde únicamente con los 3 nombres separados por comas, sin explicaciones.`;

    const result = await model.generateContent(prompt);
    const suggestions = result.response
      .text()
      .split(",")
      .map((s) => s.trim());

    res.status(200).json({
      error: false,
      categorias_sugeridas: suggestions,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/categories/:id/analyze-products - Privado (solo admin)
// Analiza los productos de una categoría con IA
export const analyzeCategoryProducts = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: true, mensaje: "Categoría no encontrada" });
    }

    const products = await Product.find({ category_id: req.params.id }).lean();
    if (products.length === 0) {
      return res.status(400).json({
        error: true,
        mensaje: "La categoría no tiene productos para analizar",
      });
    }

    const model = getGeminiModel();

    const resumen = products.map((p) => ({
      nombre: p.name,
      precio: p.price,
      stock: p.stock,
      reseñas: p.review?.length || 0,
    }));

    const prompt = `Eres un analista de marketplace experto. Analiza estos productos de la categoría "${category.name}":

DATOS: ${JSON.stringify(resumen)}

Genera un análisis en español en formato JSON con esta estructura exacta:
{
  "tendencias": "descripción de tendencias observadas",
  "rango_precios": "descripción del rango de precios",
  "recomendaciones": ["recomendación 1", "recomendación 2", "recomendación 3"],
  "productos_destacados": ["nombre producto 1", "nombre producto 2"]
}

Responde SOLO con el JSON, sin texto adicional.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let analisis;
    try {
      // Limpiar posibles bloques de código markdown
      const cleaned = responseText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      analisis = JSON.parse(cleaned);
    } catch {
      analisis = { resumen: responseText.trim() };
    }

    res.status(200).json({
      error: false,
      categoria: category.name,
      total_productos: products.length,
      analisis,
    });
  } catch (error) {
    next(error);
  }
};
