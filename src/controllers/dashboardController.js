// ============================================
// FILE: src/controllers/dashboardController.js
// PURPOSE: Controller for dashboard module
// ============================================

const dashboardService = require('../services/dashboardService');
const AppError = require('../utils/appError');

/**
 * Dashboard Controller
 * Handles all dashboard related HTTP requests
 */
const dashboardController = {
    /**
     * Get Admin Dashboard Data
     * @route GET /api/v1/dashboard/admin
     * @access Private (Admin only)
     */
    getAdminDashboard: async (req, res, next) => {
        try {
            // Get campus_id from user or default to 1
            const campus_id = req.user?.campus_id || 1;
            
            // Get dashboard data from service
            const dashboardData = await dashboardService.getAdminDashboard(campus_id);
            
            // Send response
            res.status(200).json({
                success: true,
                message: 'Admin dashboard data fetched successfully',
                data: dashboardData
            });
        } catch (error) {
            console.error('Error in getAdminDashboard:', error.message);
            next(new AppError(error.message || 'Failed to fetch admin dashboard data', 500));
        }
    },

    /**
     * Get Teacher Dashboard Data
     * @route GET /api/v1/dashboard/teacher
     * @access Private (Teacher only)
     */
    getTeacherDashboard: async (req, res, next) => {
        try {
            // Get teacher_id and campus_id from user
            const teacher_id = req.user?.id;
            const campus_id = req.user?.campus_id || 1;
            
            if (!teacher_id) {
                return next(new AppError('Teacher ID not found', 400));
            }
            
            // Get dashboard data from service
            const dashboardData = await dashboardService.getTeacherDashboard(teacher_id, campus_id);
            
            // Send response
            res.status(200).json({
                success: true,
                message: 'Teacher dashboard data fetched successfully',
                data: dashboardData
            });
        } catch (error) {
            console.error('Error in getTeacherDashboard:', error.message);
            next(new AppError(error.message || 'Failed to fetch teacher dashboard data', 500));
        }
    },

    /**
     * Get Parent Dashboard Data
     * @route GET /api/v1/dashboard/parent/:student_id
     * @access Private (Parent only)
     */
    getParentDashboard: async (req, res, next) => {
        try {
            const student_id = parseInt(req.params.student_id);
            const campus_id = req.user?.campus_id || 1;
            
            if (!student_id || isNaN(student_id)) {
                return next(new AppError('Invalid student ID', 400));
            }
            
            // Get dashboard data from service
            const dashboardData = await dashboardService.getParentDashboard(student_id, campus_id);
            
            // Send response
            res.status(200).json({
                success: true,
                message: 'Parent dashboard data fetched successfully',
                data: dashboardData
            });
        } catch (error) {
            console.error('Error in getParentDashboard:', error.message);
            
            // Handle specific error
            if (error.statusCode === 404) {
                return next(new AppError(error.message, 404));
            }
            
            next(new AppError(error.message || 'Failed to fetch parent dashboard data', 500));
        }
    },

    /**
     * Get Accountant Dashboard Data
     * @route GET /api/v1/dashboard/accountant
     * @access Private (Accountant only)
     */
    getAccountantDashboard: async (req, res, next) => {
        try {
            const campus_id = req.user?.campus_id || 1;
            
            // Get dashboard data - reusing admin dashboard for accountant
            const dashboardData = await dashboardService.getAdminDashboard(campus_id);
            
            // Filter data for accountant specific view
            const accountantData = {
                title: 'Accountant Dashboard',
                kpis: dashboardData.kpis?.filter(kpi => 
                    ['Pending Fees', 'Collected Fees', 'Total Invoices', 'Overdue Payments'].includes(kpi.label)
                ) || [],
                charts: {
                    feeCollection: dashboardData.charts?.feeCollection || [],
                    paymentMethods: await dashboardService.getPaymentMethodStats(campus_id)
                },
                recent_transactions: dashboardData.recent_activity?.filter(activity => 
                    activity.source === 'fee'
                ) || [],
                alerts: dashboardData.alerts?.filter(alert => 
                    alert.message.includes('fee') || alert.message.includes('payment')
                ) || []
            };
            
            // Send response
            res.status(200).json({
                success: true,
                message: 'Accountant dashboard data fetched successfully',
                data: accountantData
            });
        } catch (error) {
            console.error('Error in getAccountantDashboard:', error.message);
            next(new AppError(error.message || 'Failed to fetch accountant dashboard data', 500));
        }
    },

    /**
     * Get Student Dashboard Data
     * @route GET /api/v1/dashboard/student/:student_id
     * @access Private (Student/Parent)
     */
    getStudentDashboard: async (req, res, next) => {
        try {
            const student_id = parseInt(req.params.student_id);
            const campus_id = req.user?.campus_id || 1;
            
            if (!student_id || isNaN(student_id)) {
                return next(new AppError('Invalid student ID', 400));
            }
            
            // Get parent dashboard data (reuse for student)
            const dashboardData = await dashboardService.getParentDashboard(student_id, campus_id);
            
            // Send response
            res.status(200).json({
                success: true,
                message: 'Student dashboard data fetched successfully',
                data: dashboardData
            });
        } catch (error) {
            console.error('Error in getStudentDashboard:', error.message);
            next(new AppError(error.message || 'Failed to fetch student dashboard data', 500));
        }
    },

    /**
     * Get Dashboard Widgets
     * @route GET /api/v1/dashboard/widgets
     * @access Private
     */
    getDashboardWidgets: async (req, res, next) => {
        try {
            const campus_id = req.user?.campus_id || 1;
            const userRole = req.user?.role || 'admin';
            
            let widgets = [];
            
            // Define widgets based on user role
            switch (userRole) {
                case 'admin':
                    widgets = [
                        { id: 'student_stats', title: 'Student Statistics', type: 'stats', size: 'large' },
                        { id: 'attendance_chart', title: 'Attendance Overview', type: 'chart', size: 'large' },
                        { id: 'fee_summary', title: 'Fee Summary', type: 'stats', size: 'medium' },
                        { id: 'recent_activity', title: 'Recent Activity', type: 'list', size: 'large' },
                        { id: 'system_alerts', title: 'System Alerts', type: 'alerts', size: 'medium' },
                        { id: 'exam_summary', title: 'Exam Summary', type: 'stats', size: 'medium' },
                        { id: 'library_stats', title: 'Library Statistics', type: 'stats', size: 'small' },
                        { id: 'inventory_alerts', title: 'Inventory Alerts', type: 'alerts', size: 'small' }
                    ];
                    break;
                    
                case 'teacher':
                    widgets = [
                        { id: 'my_classes', title: 'My Classes', type: 'list', size: 'large' },
                        { id: 'today_attendance', title: 'Today\'s Attendance', type: 'stats', size: 'medium' },
                        { id: 'upcoming_exams', title: 'Upcoming Exams', type: 'list', size: 'medium' },
                        { id: 'recent_activity', title: 'Recent Activity', type: 'list', size: 'large' }
                    ];
                    break;
                    
                case 'parent':
                    widgets = [
                        { id: 'student_summary', title: 'Student Summary', type: 'stats', size: 'large' },
                        { id: 'attendance_details', title: 'Attendance Details', type: 'chart', size: 'large' },
                        { id: 'fee_status', title: 'Fee Status', type: 'stats', size: 'medium' },
                        { id: 'exam_results', title: 'Recent Exam Results', type: 'list', size: 'medium' },
                        { id: 'library_status', title: 'Library Status', type: 'stats', size: 'small' },
                        { id: 'upcoming_events', title: 'Upcoming Events', type: 'list', size: 'small' }
                    ];
                    break;
                    
                case 'accountant':
                    widgets = [
                        { id: 'fee_collection', title: 'Fee Collection', type: 'chart', size: 'large' },
                        { id: 'payment_methods', title: 'Payment Methods', type: 'chart', size: 'medium' },
                        { id: 'outstanding_fees', title: 'Outstanding Fees', type: 'list', size: 'large' },
                        { id: 'recent_payments', title: 'Recent Payments', type: 'list', size: 'medium' },
                        { id: 'fee_summary', title: 'Fee Summary', type: 'stats', size: 'small' }
                    ];
                    break;
                    
                default:
                    widgets = [
                        { id: 'welcome', title: 'Welcome', type: 'message', size: 'large' }
                    ];
            }
            
            res.status(200).json({
                success: true,
                message: 'Dashboard widgets fetched successfully',
                data: { widgets, userRole }
            });
        } catch (error) {
            console.error('Error in getDashboardWidgets:', error.message);
            next(new AppError(error.message || 'Failed to fetch dashboard widgets', 500));
        }
    },

    /**
     * Get Dashboard Statistics
     * @route GET /api/v1/dashboard/statistics
     * @access Private
     */
    getDashboardStatistics: async (req, res, next) => {
        try {
            const campus_id = req.user?.campus_id || 1;
            const userRole = req.user?.role || 'admin';
            
            let statistics = {};
            
            switch (userRole) {
                case 'admin':
                case 'accountant':
                    // Get all statistics
                    const [
                        studentStats,
                        attendanceStats,
                        feeStats,
                        examStats,
                        libraryStats,
                        inventoryStats
                    ] = await Promise.all([
                        dashboardService.getStudentStatistics?.(campus_id) || {},
                        dashboardService.getTodayAttendance?.(campus_id) || {},
                        dashboardService.getFeeStatistics?.(campus_id) || {},
                        dashboardService.getExamStatistics?.(campus_id) || {},
                        dashboardService.getLibraryStatistics?.(campus_id) || {},
                        dashboardService.getInventoryStatistics?.(campus_id) || {}
                    ]);
                    
                    statistics = {
                        students: studentStats,
                        attendance: attendanceStats,
                        fees: feeStats,
                        exams: examStats,
                        library: libraryStats,
                        inventory: inventoryStats
                    };
                    break;
                    
                case 'teacher':
                    // Teacher specific statistics
                    const teacherStats = await dashboardService.getTeacherDashboard(req.user.id, campus_id);
                    statistics = {
                        classes: teacherStats.classes?.length || 0,
                        students: teacherStats.kpis?.find(k => k.label === 'My Students')?.value || 0,
                        attendance: teacherStats.kpis?.find(k => k.label === 'Today\'s Attendance')?.value || '0%',
                        pendingExams: teacherStats.kpis?.find(k => k.label === 'Pending Exams')?.value || 0
                    };
                    break;
                    
                case 'parent':
                    // Parent specific statistics
                    const parentStats = await dashboardService.getParentDashboard(req.user.student_id, campus_id);
                    statistics = {
                        attendance: parentStats.attendance_details?.percentage || 0,
                        feeStatus: parentStats.fee_details?.status || 'PAID',
                        exams: parentStats.exam_results?.length || 0,
                        library: parentStats.kpis?.find(k => k.label === 'Library Books')?.value || 0
                    };
                    break;
                    
                default:
                    statistics = { message: 'No statistics available for this role' };
            }
            
            res.status(200).json({
                success: true,
                message: 'Dashboard statistics fetched successfully',
                data: statistics
            });
        } catch (error) {
            console.error('Error in getDashboardStatistics:', error.message);
            next(new AppError(error.message || 'Failed to fetch dashboard statistics', 500));
        }
    }
};

module.exports = dashboardController;