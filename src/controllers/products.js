import { Product } from "../models/products.js";
import fs from "fs";

// POST /api/products - Privado (solo vendedor)
export const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, stock, category_id } = req.body;

    // Si se subió imagen, guardamos la URL
    const img_url = req.file ? `/uploads/products/${req.file.filename}` : null;

    const product = await Product.create({
      seller_id: req.usuario._id,
      category_id,
      name,
      description,
      price,
      stock,
      img_url,
    });

    res.status(201).json({
      mensaje: "Producto creado exitosamente",
      producto: product,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/products - Público
// Query params: category_id, q (búsqueda), page, limit
export const getProducts = async (req, res, next) => {
  try {
    const { category_id, q, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (category_id) filter.category_id = category_id;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    const parsedLimit = Math.min(Number(limit) || 10, 50);
    const parsedPage = Number(page) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("seller_id", "name email")
        .populate("category_id", "name")
        .lean()
        .skip(skip)
        .limit(parsedLimit),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      total,
      page: parsedPage,
      total_pages: Math.ceil(total / parsedLimit),
      productos: products,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/products/:id - Público
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("seller_id", "name email")
      .populate("category_id", "name")
      .populate("review.buyer_id", "name");

    if (!product) {
      return res
        .status(404)
        .json({ error: true, mensaje: "Producto no encontrado" });
    }

    res.status(200).json({ producto: product });
  } catch (error) {
    next(error);
  }
};

// GET /api/products/seller/:sellerId - Público
// Obtiene todos los productos de un vendedor
export const getProductsBySeller = async (req, res, next) => {
  try {
    const products = await Product.find({ seller_id: req.params.sellerId })
      .populate("category_id", "name")
      .lean();

    res.status(200).json({ productos: products });
  } catch (error) {
    next(error);
  }
};

// PUT /api/products/:id - Privado (solo el vendedor dueño del producto)
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res
        .status(404)
        .json({ error: true, mensaje: "Producto no encontrado" });
    }

    // Solo el vendedor dueño o admin puede editar
    if (
      product.seller_id.toString() !== req.usuario._id.toString() &&
      req.usuario.rol !== "admin"
    ) {
      return res.status(403).json({
        error: true,
        mensaje: "No puedes editar un producto que no es tuyo",
      });
    }

    const { name, description, price, stock, category_id } = req.body;
    const fields = {};
    if (name) fields.name = name;
    if (description) fields.description = description;
    if (price !== undefined) fields.price = price;
    if (stock !== undefined) fields.stock = stock;
    if (category_id) fields.category_id = category_id;

    // Si se subió nueva imagen, eliminamos la anterior y guardamos la nueva
    if (req.file) {
      if (product.img_url) {
        const oldPath = `.${product.img_url}`;
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      fields.img_url = `/uploads/products/${req.file.filename}`;
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, fields, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      mensaje: "Producto actualizado",
      producto: updated,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/products/:id - Privado (vendedor dueño o admin)
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res
        .status(404)
        .json({ error: true, mensaje: "Producto no encontrado" });
    }

    // Solo el vendedor dueño o admin puede eliminar
    if (
      product.seller_id.toString() !== req.usuario._id.toString() &&
      req.usuario.rol !== "admin"
    ) {
      return res.status(403).json({
        error: true,
        mensaje: "No puedes eliminar un producto que no es tuyo",
      });
    }

    // Eliminamos la imagen si existe
    if (product.img_url) {
      const imgPath = `.${product.img_url}`;
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await Product.findByIdAndDelete(req.params.id);

    res
      .status(200)
      .json({ mensaje: "Producto eliminado exitosamente" });
  } catch (error) {
    next(error);
  }
};

// POST /api/products/:id/reviews - Privado (solo comprador)
export const addReview = async (req, res, next) => {
  try {
    const { qualification, comment } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ error: true, mensaje: "Producto no encontrado" });
    }

    // Un comprador no puede reseñar su propio producto
    if (product.seller_id.toString() === req.usuario._id.toString()) {
      return res
        .status(403)
        .json({ error: true, mensaje: "No puedes reseñar tu propio producto" });
    }

    // Un comprador no puede reseñar el mismo producto dos veces
    const alreadyReviewed = product.review.find(
      (r) => r.buyer_id.toString() === req.usuario._id.toString(),
    );
    if (alreadyReviewed) {
      return res
        .status(400)
        .json({ error: true, mensaje: "Ya reseñaste este producto" });
    }

    product.review.push({
      buyer_id: req.usuario._id,
      qualification,
      comment,
    });

    await product.save();

    res.status(201).json({
      mensaje: "Reseña agregada exitosamente",
      producto: product,
    });
  } catch (error) {
    next(error);
  }
};
