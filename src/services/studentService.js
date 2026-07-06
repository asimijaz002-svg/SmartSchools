const eventEmitter = require('../utils/eventEmitter'); // Import Event Emitter (NEW)
const fs = require('fs');
const path = require('path');
const studentRepository = require('../repositories/studentRepository');
const sessionRepository = require('../repositories/sessionRepository');
const invoiceRepository = require('../repositories/invoiceRepository'); // Import Invoice Repository (NEW)
const dbPool = require('../config/db'); // Import DB Pool to manage transactions manually (NEW)
const auditService = require('./auditService');
const AppError = require('../utils/appError');

const studentService = {
  // UPDATED: Now runs atomically as a Transaction
  registerStudent: async (studentData, actor) => {
    const activeSession = await sessionRepository.getActiveSession();
    if (!activeSession) {
      throw new AppError('No active academic session found. Please contact the administrator.', 500);
    }

    const existingStudent = await studentRepository.findByRollNo(studentData.roll_no);
    if (existingStudent) {
      throw new AppError('Roll number already exists', 400);
    }

    studentData.academic_session_id = activeSession.id;

    // 1. Acquire a manual connection from our DB pool
    const connection = await dbPool.getConnection();

    try {
      // 2. Start the Database Transaction
      await connection.beginTransaction();

      // 3. Step A: Register the Student (Pass the connection)
      const studentResult = await studentRepository.create(studentData, connection);
      const studentId = studentResult.insertId;

      // 4. Step B: Generate the Admission Fee Invoice (e.g., 5000 PKR admission fee due in 15 days)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15); // Set due date to 15 days from now
      
      const invoiceData = {
        student_id: studentId,
        amount: 5000.00, // Hardcoded standard admission fee
        due_date: dueDate.toISOString().slice(0, 10) // Format date: YYYY-MM-DD
      };

      await invoiceRepository.create(invoiceData, connection);

      // 5. Commit Transaction (Saves student and invoice atomically to the database)
      await connection.commit();

      // 6. Emit Asynchronous Notification Event (Completely decoupled and non-blocking!) (NEW)
      eventEmitter.emit('student.admitted', {
        id: studentId,
        ...studentData
      });

      // 7. Audit Log: Log the successful admission sequence
      await auditService.log({
        user_id: actor.user_id,
        action: 'STUDENT_ADMISSION',
        entity_name: 'students',
        entity_id: studentId,
        previous_values: null,
        new_values: { ...studentData, admission_fee_invoice: invoiceData },
        ip_address: actor.ip_address
      });

      return { id: studentId, ...studentData };

    } catch (error) {
      // 8. If any step fails, Rollback EVERYTHING to prevent partial writes
      await connection.rollback();
      throw error; // Let Express global error handler return the clean error message
    } finally {
      // 9. Always release the manual connection back to the pool
      connection.release();
    }
  },

  getStudents: async (options) => {
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 10;
    const offset = (page - 1) * limit;

    const allowedSortFields = ['first_name', 'last_name', 'roll_no', 'created_at'];
    const sortBy = allowedSortFields.includes(options.sortBy) ? options.sortBy : 'created_at';
    const sortOrder = (options.sortOrder && options.sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

    const search = options.search || null;
    const class_name = options.class_name || null;

    const activeSession = await sessionRepository.getActiveSession();
    const academic_session_id = options.academic_session_id 
      ? parseInt(options.academic_session_id) 
      : (activeSession ? activeSession.id : null);

    const students = await studentRepository.findAll({ search, class_name, academic_session_id, sortBy, sortOrder, limit, offset });
    const totalRecords = await studentRepository.countAll({ search, class_name, academic_session_id });
    const totalPages = Math.ceil(totalRecords / limit);

    return {
      data: students,
      pagination: { page, limit, total_records: totalRecords, total_pages: totalPages, academic_session_id }
    };
  },

  getStudentById: async (id) => {
    const student = await studentRepository.findById(id);
    if (!student) {
      throw new AppError('Student not found or has been deactivated', 404);
    }
    return student;
  },

  updateStudent: async (id, updateData, actor) => {
    const student = await studentRepository.findById(id);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    if (updateData.roll_no && updateData.roll_no !== student.roll_no) {
      const existing = await studentRepository.findByRollNo(updateData.roll_no);
      if (existing) {
        throw new AppError('This new roll number is already assigned to another student', 400);
      }
    }

    const finalData = {
      roll_no: updateData.roll_no || student.roll_no,
      first_name: updateData.first_name || student.first_name,
      last_name: updateData.last_name || student.last_name,
      email: updateData.email !== undefined ? updateData.email : student.email,
      class_name: updateData.class_name || student.class_name
    };

    await studentRepository.update(id, finalData);

    await auditService.log({
      user_id: actor.user_id,
      action: 'STUDENT_UPDATE',
      entity_name: 'students',
      entity_id: parseInt(id),
      previous_values: student,
      new_values: finalData,
      ip_address: actor.ip_address
    });

    return { id: parseInt(id), ...finalData };
  },

  deleteStudent: async (id, actor) => {
    const student = await studentRepository.findById(id);
    if (!student) {
      throw new AppError('Student not found or already deactivated', 404);
    }
    await studentRepository.softDelete(id);

    await auditService.log({
      user_id: actor.user_id,
      action: 'STUDENT_DEACTIVATE',
      entity_name: 'students',
      entity_id: parseInt(id),
      previous_values: student,
      new_values: { deleted_at: 'CURRENT_TIMESTAMP' },
      ip_address: actor.ip_address
    });

    return { id: parseInt(id) };
  },

  // NEW: Manage profile picture update and server file cleanup
  updateStudentProfilePicture: async (id, fileName, actor) => {
    const student = await studentRepository.findById(id);
    
    if (!student) {
      const tempFilePath = path.join(__dirname, '../../uploads', fileName);
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      throw new AppError('Student not found or has been deactivated', 404);
    }

    if (student.profile_picture) {
      const oldFilePath = path.join(__dirname, '../../uploads', student.profile_picture);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (err) {
          console.warn('⚠️ Failed to clean up old profile picture file:', err.message);
        }
      }
    }

    await studentRepository.updateProfilePicture(id, fileName);

    await auditService.log({
      user_id: actor.user_id,
      action: 'STUDENT_PICTURE_UPLOAD',
      entity_name: 'students',
      entity_id: parseInt(id),
      previous_values: { profile_picture: student.profile_picture },
      new_values: { profile_picture: fileName },
      ip_address: actor.ip_address
    });

    return { id: parseInt(id), profile_picture: fileName };
  }
};

module.exports = studentService;
