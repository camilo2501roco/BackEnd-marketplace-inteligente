import { getGeminiModel } from "../config/gemini.js";
import { Product } from "../models/products.js";
import { Category } from "../models/categories.js";

// POST /api/ai/generate-description
// Genera descripción automática de un producto
// Privado (solo vendedor)
export const generateDescription = async (req, res, next) => {
  try {
    const { name, price, category } = req.body;

    const model = getGeminiModel();

    const prompt = `Eres un experto en marketing de productos para un marketplace.
    Genera una descripción atractiva y profesional en español para este producto:
    - Nombre: ${name}
    - Precio: $${price}
    - Categoría: ${category}
    
    La descripción debe tener máximo 150 palabras, ser clara y resaltar los beneficios del producto.
    Responde únicamente con la descripción, sin títulos ni texto extra.`;

    const result = await model.generateContent(prompt);
    const description = result.response.text();

    res.status(200).json({
      descripcion: description,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/ai/analyze-reviews/:id
// Analiza y resume las reseñas de un producto
// Público
export const analyzeReviews = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res
        .status(404)
        .json({ error: true, mensaje: "Producto no encontrado" });
    }

    if (product.review.length === 0) {
      return res
        .status(400)
        .json({ error: true, mensaje: "Este producto no tiene reseñas aún" });
    }

    // Preparamos las reseñas para el prompt
    const reviewsText = product.review
      .map(
        (r) =>
          `- Calificación: ${r.qualification}/5 | Comentario: ${r.comment}`,
      )
      .join("\n");

    const model = getGeminiModel();

    const prompt = `Analiza las siguientes reseñas de un producto llamado "${product.name}" y genera un resumen en español:

    ${reviewsText}

    El resumen debe incluir:
    1. Puntos positivos más mencionados
    2. Puntos negativos más mencionados
    3. Conclusión general en una frase

    Responde de forma clara y concisa, máximo 100 palabras.`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    res.status(200).json({
      producto: product.name,
      total_reseñas: product.review.length,
      resumen: summary,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/ai/suggest-category
// Sugiere una categoría basada en la descripción del producto
// Privado (solo vendedor)
export const suggestCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    // Traemos las categorías disponibles
    const categories = await Category.find().select("name");

    if (categories.length === 0) {
      return res
        .status(400)
        .json({ error: true, mensaje: "No hay categorías disponibles" });
    }

    const categoryNames = categories.map((c) => c.name).join(", ");

    const model = getGeminiModel();

    const prompt = `Tienes un producto con las siguientes características:
    - Nombre: ${name}
    - Descripción: ${description}

    Las categorías disponibles en el marketplace son: ${categoryNames}

    ¿A cuál de estas categorías pertenece mejor este producto?
    Responde únicamente con el nombre exacto de la categoría, sin explicaciones.`;

    const result = await model.generateContent(prompt);
    const suggestedCategory = result.response.text().trim();

    // Buscamos la categoría sugerida en la base de datos
    const category = await Category.findOne({
      name: { $regex: suggestedCategory, $options: "i" },
    });

    res.status(200).json({
      categoria_sugerida: suggestedCategory,
      category_id: category ? category._id : null,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/ai/ask
// Responde preguntas sobre el marketplace
// Público
export const askQuestion = async (req, res, next) => {
  try {
    const { question } = req.body;

    const model = getGeminiModel();

    const prompt = `Eres el asistente virtual de un marketplace en línea.
    Tu trabajo es responder preguntas de los usuarios de forma amable y clara en español.
    
    Solo respondes preguntas relacionadas con:
    - Cómo comprar productos
    - Cómo vender productos
    - Políticas de envío y devoluciones
    - Cómo crear una cuenta
    - Cómo funcionan las reseñas
    - Dudas generales del marketplace

    Si la pregunta no está relacionada con el marketplace, responde amablemente que solo puedes ayudar con temas del marketplace.

    Pregunta del usuario: ${question}
    
    Responde de forma concisa, máximo 80 palabras.`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    res.status(200).json({
      pregunta: question,
      respuesta: answer,
    });
  } catch (error) {
    next(error);
  }
};
