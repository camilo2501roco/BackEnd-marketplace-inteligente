import { User } from "../models/users.js";

// GET /api/users - Privado (solo admin)
export const getUsers = async (req, res, next) => {
  try {
    const { rol, q, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (rol) filter.rol = rol;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    const parsedLimit = Math.min(Number(limit) || 10, 50);
    const parsedPage = Number(page) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .lean()
        .skip(skip)
        .limit(parsedLimit),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      total,
      page: parsedPage,
      total_pages: Math.ceil(total / parsedLimit),
      usuarios: users,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id - Privado (solo admin)
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ error: true, mensaje: "Usuario no encontrado" });
    }

    res.status(200).json({ error: false, usuario: user });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/:id - Privado (solo admin)
export const updateUser = async (req, res, next) => {
  try {
    const { name, rol } = req.body;
    const fields = {};
    if (name) fields.name = name;
    if (rol) fields.rol = rol;

    const user = await User.findByIdAndUpdate(req.params.id, fields, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ error: true, mensaje: "Usuario no encontrado" });
    }

    res
      .status(200)
      .json({ error: false, mensaje: "Usuario actualizado", usuario: user });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/:id - Privado (solo admin)
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res
        .status(404)
        .json({ error: true, mensaje: "Usuario no encontrado" });
    }

    res
      .status(200)
      .json({ error: false, mensaje: "Usuario eliminado exitosamente" });
  } catch (error) {
    next(error);
  }
};
