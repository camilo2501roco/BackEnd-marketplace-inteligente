import bcrypt from "bcrypt";
import { User } from "../models/users.js";
import { generateJWT } from "../utils/generateJWT.js";
import { sendResetCode } from "../config/email.js";

// POST /api/auth/register - Público
export const register = async (req, res, next) => {
  try {
    const { name, email, password, rol } = req.body;

    const allowedRols = ["comprador", "vendedor"];
    const userRol = allowedRols.includes(rol) ? rol : "comprador";

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      rol: userRol,
    });

    const token = generateJWT(user._id);

    res.status(201).json({
      error: false,
      mensaje: "Usuario registrado exitosamente",
      usuario: {
        id: user._id,
        name: user.name,
        email: user.email,
        rol: user.rol,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login - Público
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ error: true, mensaje: "Credenciales incorrectas" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res
        .status(401)
        .json({ error: true, mensaje: "Credenciales incorrectas" });
    }

    const token = generateJWT(user._id);

    res.json({
      error: false,
      mensaje: "Inicio de sesión exitoso",
      usuario: {
        id: user._id,
        name: user.name,
        email: user.email,
        rol: user.rol,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/profile - Privado
export const profile = (req, res) =>
  res.json({ error: false, usuario: req.usuario });

// PUT /api/auth/change-password - Privado
export const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    const user = await User.findById(req.usuario._id);

    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) {
      return res
        .status(401)
        .json({ error: true, mensaje: "La contraseña actual es incorrecta" });
    }

    user.password = await bcrypt.hash(new_password, 10);
    await user.save();

    res.json({ error: false, mensaje: "Contraseña actualizada exitosamente" });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/forgot-password - Público
// Genera un código de 6 dígitos y lo envía al email
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // Por seguridad respondemos igual aunque el email no exista
    if (!user) {
      return res.json({
        error: false,
        mensaje: "Si el email existe recibirás un código de recuperación",
      });
    }

    // Generamos código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Guardamos el código con expiración de 15 minutos
    user.reset_code = code;
    user.reset_code_expires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    // Enviamos el email
    await sendResetCode(email, code);

    res.json({
      error: false,
      mensaje: "Si el email existe recibirás un código de recuperación",
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-password - Público
// Verifica el código y actualiza la contraseña
export const resetPassword = async (req, res, next) => {
  try {
    const { email, code, new_password } = req.body;

    const user = await User.findOne({ email });

    if (!user || !user.reset_code) {
      return res
        .status(400)
        .json({ error: true, mensaje: "Código inválido o expirado" });
    }

    // Verificamos que el código no haya expirado
    if (user.reset_code_expires < new Date()) {
      return res
        .status(400)
        .json({
          error: true,
          mensaje: "El código ha expirado, solicita uno nuevo",
        });
    }

    // Verificamos que el código sea correcto
    if (user.reset_code !== code) {
      return res
        .status(400)
        .json({ error: true, mensaje: "Código incorrecto" });
    }

    // Actualizamos la contraseña y limpiamos el código
    user.password = await bcrypt.hash(new_password, 10);
    user.reset_code = null;
    user.reset_code_expires = null;
    await user.save();

    res.json({ error: false, mensaje: "Contraseña actualizada exitosamente" });
  } catch (error) {
    next(error);
  }
};
