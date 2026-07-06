const authService = require('../services/authService');
const AppError = require('../utils/appError');

const authController = {
  signup: async (req, res, next) => {
    try {
      const { username, email, password, role } = req.body;
      if (!username || !email || !password) {
        return next(new AppError('Please provide username, email, and password.', 400));
      }

      const newUser = await authService.signup({ username, email, password, role });
      return res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        data: newUser
      });
    } catch (error) {
      next(error);
    }
  },

  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return next(new AppError('Please provide email and password.', 400));
      }

      const { user, token } = await authService.login(email, password);
      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        token,
        user
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;