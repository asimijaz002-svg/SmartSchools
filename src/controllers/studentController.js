const studentService = require('../services/studentService');

const studentController = {
  createStudent: async (req, res, next) => {
    try {
      const { roll_no, first_name, last_name, email, class_name } = req.body;
      
      // Extract Actor Details (NEW)
      const actor = { user_id: req.user.id, ip_address: req.ip };

      const newStudent = await studentService.registerStudent({ roll_no, first_name, last_name, email, class_name }, actor);
      return res.status(201).json({
        success: true,
        message: 'Student registered successfully',
        data: newStudent
      });
    } catch (error) {
      next(error);
    }
  },

  getAllStudents: async (req, res, next) => {
    try {
      const { page, limit, search, class_name, academic_session_id, sortBy, sortOrder } = req.query;
      const result = await studentService.getStudents({ page, limit, search, class_name, academic_session_id, sortBy, sortOrder });
      return res.status(200).json({
        success: true,
        message: 'Students retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  },

  getStudentById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const student = await studentService.getStudentById(id);
      return res.status(200).json({
        success: true,
        message: 'Student details retrieved successfully',
        data: student
      });
    } catch (error) {
      next(error);
    }
  },

  updateStudent: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Extract Actor Details (NEW)
      const actor = { user_id: req.user.id, ip_address: req.ip };

      const updatedStudent = await studentService.updateStudent(id, updateData, actor);
      return res.status(200).json({
        success: true,
        message: 'Student details updated successfully',
        data: updatedStudent
      });
    } catch (error) {
      next(error);
    }
  },

  deleteStudent: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Extract Actor Details (NEW)
      const actor = { user_id: req.user.id, ip_address: req.ip };

      const deletedInfo = await studentService.deleteStudent(id, actor);
      return res.status(200).json({
        success: true,
        message: 'Student has been deactivated successfully',
        data: deletedInfo
      });
    } catch (error) {
      next(error);
    }
  }, // 🔴 Yahan comma laga kar naya function object ke andar shamil kar diya hay

  // NEW: Profile Picture Upload Controller (Ab ye perfect jagah par hay)
  uploadProfilePicture: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check if a file was actually uploaded by Multer
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please select an image file to upload.'
        });
      }

      const actor = { user_id: req.user.id, ip_address: req.ip };
      const updated = await studentService.updateStudentProfilePicture(id, req.file.filename, actor);

      return res.status(200).json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }
}; // 🔴 studentController object yahan sahi se band ho raha hay

module.exports = studentController;
