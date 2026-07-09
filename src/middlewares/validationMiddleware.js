// ============================================
// FILE: src/middlewares/validationMiddleware.js
// PURPOSE: Centralized request validation
// ============================================

const validateStudent = (req, res, next) => {
  const { roll_no, first_name, last_name, email, class_name } = req.body;
  const errors = [];

  if (!roll_no) errors.push('Roll number is required');
  if (!first_name) errors.push('First name is required');
  if (!last_name) errors.push('Last name is required');
  if (!class_name) errors.push('Class name is required');

  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      errors.push('Invalid email format');
  }

  if (errors.length > 0) {
      return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
      });
  }

  next();
};

const validateAttendance = (req, res, next) => {
  const { student_id, class_id, attendance_date, status_id } = req.body;
  const errors = [];

  if (!student_id) errors.push('Student ID is required');
  if (!class_id) errors.push('Class ID is required');
  if (!attendance_date) errors.push('Attendance date is required');
  if (!status_id) errors.push('Status ID is required');

  if (attendance_date && isNaN(Date.parse(attendance_date))) {
      errors.push('Invalid attendance date format');
  }

  if (status_id && isNaN(parseInt(status_id))) {
      errors.push('Status ID must be a number');
  }

  if (errors.length > 0) {
      return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
      });
  }

  next();
};

module.exports = {
  validateStudent,
  validateAttendance
};