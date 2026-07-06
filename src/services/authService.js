const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/appError');

const authService = {
  signup: async (userData) => {
    const { username, email, password, role } = userData;

    // 1. Verify if email is already taken
    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) {
      throw new AppError('Email is already registered.', 400);
    }

    // 2. Verify if username is already taken
    const existingUsername = await userRepository.findByUsername(username);
    if (existingUsername) {
      throw new AppError('Username is already taken.', 400);
    }

    // 3. Hash password (Salt rounds = 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Save to Database
    const result = await userRepository.create({
      username,
      email,
      password: hashedPassword,
      role
    });

    return {
      id: result.insertId,
      username,
      email,
      role: role || 'staff'
    };
  },

  login: async (email, password) => {
    // 1. Check if user exists
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password.', 401); // Unauthorized
    }

    // 2. Verify if password hash matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    // 3. Issue JWT Token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token
    };
  }
};

module.exports = authService;