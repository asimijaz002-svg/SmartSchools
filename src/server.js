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
