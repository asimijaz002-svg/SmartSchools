const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Database Connection Import
require('./config/db'); 

// Initialize Asynchronous Notification Listeners (NEW)
const { initNotificationListeners } = require('./services/notificationService');
initNotificationListeners();

// Routes Imports
const studentRoutes = require('./routes/studentRoutes');
const authRoutes = require('./routes/authRoutes'); // (NEW)
const attendanceRoutes = require('./routes/attendanceRoutes');
const sessionRoutes = require('./routes/sessionRoutes'); // 👈 ADD THIS
const classRoutes = require('./routes/classRoutes'); // 👈 ADD THIS
const subjectRoutes = require('./routes/subjectRoutes'); // 👈 ADD THIS
const feeCategoryRoutes = require('./routes/feeCategoryRoutes'); // 👈 ADD THIS
const guardianRoutes = require('./routes/guardianRoutes'); // 👈 ADD THIS
const employeeRoutes = require('./routes/employeeRoutes');
const examRoutes = require('./routes/examRoutes');
const feePaymentRoutes = require('./routes/feePaymentRoutes');
const libraryRoutes = require('./routes/libraryRoutes');
const transportRoutes = require('./routes/transportRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Import Error Middleware
const errorMiddleware = require('./middlewares/errorMiddleware');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Expose the uploads directory to allow viewing profile pictures
app.use('/uploads', express.static('uploads'));

// Main API Routes
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/auth', authRoutes); // (NEW)
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/sessions', sessionRoutes); // 👈 ADD THIS
app.use('/api/v1/classes', classRoutes); // 👈 ADD THIS
app.use('/api/v1/subjects', subjectRoutes); // 👈 ADD THIS
app.use('/api/v1/fee-categories', feeCategoryRoutes); // 👈 ADD THIS
app.use('/api/v1/guardians', guardianRoutes); // 👈 ADD THIS
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/exams', examRoutes);
app.use('/api/v1/payments', feePaymentRoutes);
app.use('/api/v1/library', libraryRoutes);
app.use('/api/v1/transport', transportRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reports', reportRoutes);

// Testing Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the School ERP API Server!'
  });
});

app.use(errorMiddleware);

// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
