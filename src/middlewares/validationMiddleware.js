// ============================================
// FILE: src/middlewares/validationMiddleware.js
// PURPOSE: Centralized request validation
// ============================================

const validateStudent = (req, res, next) => {
    // ✅ Skip validation for GET and DELETE requests (no body)
    if (req.method === 'GET' || req.method === 'DELETE') {
        return next();
    }

    const { roll_no, first_name, last_name, email, class_name } = req.body || {};

    // ✅ For PUT requests, only validate fields that are being updated
    const isUpdate = req.method === 'PUT' || req.method === 'PATCH';

    const errors = [];

    // ✅ For POST (create), all fields are required
    if (!isUpdate) {
        if (!roll_no) errors.push('Roll number is required');
        if (!first_name) errors.push('First name is required');
        if (!last_name) errors.push('Last name is required');
        if (!class_name) errors.push('Class name is required');
    } else {
        // ✅ For PUT, only validate if the field is provided
        if (roll_no !== undefined && !roll_no) errors.push('Roll number cannot be empty');
        if (first_name !== undefined && !first_name) errors.push('First name cannot be empty');
        if (last_name !== undefined && !last_name) errors.push('Last name cannot be empty');
        if (class_name !== undefined && !class_name) errors.push('Class name cannot be empty');
    }

    // ✅ Email validation (always check if provided)
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