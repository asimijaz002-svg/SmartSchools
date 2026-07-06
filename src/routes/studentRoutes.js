const express = require('express');
const router = express.Router(); 
const studentController = require('../controllers/studentController');

const { validateStudent } = require('../middlewares/validationMiddleware');
const { protect, checkPermission } = require('../middlewares/authMiddleware'); 
const upload = require('../middlewares/uploadMiddleware'); 

// 🔍 CRITICAL SAFETY CHECK: Terminal par check karne ke liye ke kaun sa controller undefined hay
console.log('--- 🛡️ ROUTE DEPENDENCY CHECK ---');
console.log('getAllStudents:', typeof studentController.getAllStudents);
console.log('getStudentById:', typeof studentController.getStudentById);
console.log('createStudent:', typeof studentController.createStudent);
console.log('updateStudent:', typeof studentController.updateStudent);
console.log('deleteStudent:', typeof studentController.deleteStudent);
console.log('uploadProfilePicture:', typeof studentController.uploadProfilePicture);
console.log('protect:', typeof protect);
console.log('checkPermission:', typeof checkPermission);
console.log('upload:', typeof upload);
console.log('--------------------------------');

// 1. Read Operations
if (studentController.getAllStudents) {
  router.get('/', protect, checkPermission('read:students'), studentController.getAllStudents);
}
if (studentController.getStudentById) {
  router.get('/:id', protect, checkPermission('read:students'), studentController.getStudentById);
}

// 2. Write Operations
if (studentController.createStudent) {
  router.post('/', protect, checkPermission('write:students'), validateStudent, studentController.createStudent);
}
if (studentController.updateStudent) {
  router.put('/:id', protect, checkPermission('write:students'), validateStudent, studentController.updateStudent);
}

// 3. Delete Operation
if (studentController.deleteStudent) {
  router.delete('/:id', protect, checkPermission('delete:students'), studentController.deleteStudent);
}

// NEW: Upload Student Profile Picture
if (studentController.uploadProfilePicture && upload) {
  router.patch(
    '/:id/profile-picture', 
    protect, 
    checkPermission('write:students'), 
    upload.single('profile_picture'), 
    studentController.uploadProfilePicture
  );
}

module.exports = router;
