// ============================================
// FILE: src/routes/sessionRoutes.js
// PURPOSE: API route definitions for academic sessions
// ============================================

const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

// ============================================
// READ Operations
// ============================================

// Get all sessions (with pagination)
router.get(
    '/',
    protect,
    checkPermission('read:settings'),
    sessionController.getSessions
);

// Get active session
router.get(
    '/active',
    protect,
    sessionController.getActiveSession
);

// Get single session by ID
router.get(
    '/:id',
    protect,
    checkPermission('manage:admins'),  // 🟢 Comma fixed here
    sessionController.getSession
);

// ============================================
// WRITE Operations
// ============================================

// Create new session
router.post(
    '/',
    protect,
    checkPermission('write:settings'),
    sessionController.createSession
);

// Update session
router.put(
    '/:id',
    protect,
    checkPermission('write:settings'),
    sessionController.updateSession
);

// Activate session
router.patch(
    '/:id/activate',
    protect,
    checkPermission('write:settings'),
    sessionController.activateSession
);

// Delete session
router.delete(
    '/:id',
    protect,
    checkPermission('delete:settings'),
    sessionController.deleteSession
);

module.exports = router;
