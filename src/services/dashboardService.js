// ============================================
// FILE: src/services/dashboardService.js
// PURPOSE: Business logic for dashboard module
// ============================================

const db = require('../config/db');
const AppError = require('../utils/appError');

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getStudentStatistics(campus_id) {
    const [rows] = await db.execute(
        `SELECT 
            COUNT(*) as total_students,
            SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_students,
            SUM(CASE WHEN gender = 'MALE' THEN 1 ELSE 0 END) as male_students,
            SUM(CASE WHEN gender = 'FEMALE' THEN 1 ELSE 0 END) as female_students,
            COUNT(DISTINCT class_name) as total_classes
        FROM students 
        WHERE campus_id = ? AND deleted_at IS NULL`,
        [campus_id || 1]
    );
    return rows[0];
}

async function getTodayAttendance(campus_id) {
    const today = new Date().toISOString().split('T')[0];
    const [rows] = await db.execute(
        `SELECT 
            COUNT(CASE WHEN status = 'Present' THEN 1 END) as present,
            COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absent,
            COUNT(CASE WHEN status = 'Late' THEN 1 END) as late,
            COUNT(CASE WHEN status = 'Leave' THEN 1 END) as leave_count,
            COUNT(*) as total,
            ROUND((COUNT(CASE WHEN status = 'Present' THEN 1 END) / COUNT(*)) * 100, 2) as attendance_percentage
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        WHERE a.attendance_date = ? AND s.campus_id = ?`,
        [today, campus_id || 1]
    );
    return rows[0] || { total: 0, attendance_percentage: 0 };
}

async function getFeeStatistics(campus_id) {
    const [rows] = await db.execute(
        `SELECT 
            COALESCE(SUM(CASE WHEN fi.status = 'unpaid' THEN fi.amount ELSE 0 END), 0) as outstanding_amount,
            COALESCE(SUM(CASE WHEN fi.status = 'paid' THEN fi.amount ELSE 0 END), 0) as collected_amount,
            COUNT(CASE WHEN fi.status = 'unpaid' THEN 1 END) as unpaid_invoices,
            COUNT(CASE WHEN fi.status = 'paid' THEN 1 END) as paid_invoices
        FROM fee_invoices fi
        JOIN students s ON fi.student_id = s.id
        WHERE s.campus_id = ?`,
        [campus_id || 1]
    );
    return rows[0];
}

async function getExamStatistics(campus_id) {
    const [rows] = await db.execute(
        `SELECT 
            COUNT(CASE WHEN is_published = FALSE THEN 1 END) as pending_exams,
            COUNT(CASE WHEN is_published = TRUE THEN 1 END) as published_exams,
            COUNT(*) as total_exams
        FROM exams
        WHERE campus_id = ?`,
        [campus_id || 1]
    );
    return rows[0];
}

async function getLibraryStatistics(campus_id) {
    const [books] = await db.execute(
        `SELECT 
            SUM(total_copies) as total_books,
            SUM(available_copies) as available_books,
            SUM(borrowed_copies) as borrowed_books
        FROM books
        WHERE campus_id = ?`,
        [campus_id || 1]
    );

    const [members] = await db.execute(
        `SELECT COUNT(*) as active_members
        FROM library_members
        WHERE campus_id = ? AND is_active = TRUE`,
        [campus_id || 1]
    );

    return {
        total_books: books[0]?.total_books || 0,
        available_books: books[0]?.available_books || 0,
        borrowed_books: books[0]?.borrowed_books || 0,
        active_members: members[0]?.active_members || 0
    };
}

async function getInventoryStatistics(campus_id) {
    const [rows] = await db.execute(
        `SELECT 
            COUNT(CASE WHEN quantity <= reorder_level AND quantity > 0 THEN 1 END) as low_stock_items,
            COUNT(CASE WHEN quantity = 0 THEN 1 END) as out_of_stock_items,
            COUNT(*) as total_items
        FROM inventory_items
        WHERE campus_id = ?`,
        [campus_id || 1]
    );
    return rows[0];
}

// ============================================
// ✅ FIXED: getRecentActivity with proper parameter handling
// ============================================
async function getRecentActivity(campus_id, limit = 10) {
    try {
        // Student admissions
        const [students] = await db.execute(
            `SELECT 'student' as source, id, 'STUDENT_ADMISSION' as action,
                    CONCAT(first_name, ' ', last_name) as description, created_at as event_date
             FROM students 
             WHERE campus_id = ? AND deleted_at IS NULL 
             ORDER BY created_at DESC 
             LIMIT ?`,
            [campus_id || 1, limit]
        );

        // Fee payments
        const [fees] = await db.execute(
            `SELECT 'fee' as source, id, 'FEE_PAYMENT' as action,
                    CONCAT('Payment of PKR ', amount_paid, ' received') as description, created_at as event_date
             FROM fee_payments 
             WHERE campus_id = ? 
             ORDER BY created_at DESC 
             LIMIT ?`,
            [campus_id || 1, limit]
        );

        // Book borrowings
        const [library] = await db.execute(
            `SELECT 'library' as source, id, 'BOOK_BORROW' as action,
                    CONCAT('Book borrowed: ', (SELECT title FROM books WHERE id = book_id)) as description, created_at as event_date
             FROM book_transactions 
             WHERE campus_id = ? 
             ORDER BY created_at DESC 
             LIMIT ?`,
            [campus_id || 1, limit]
        );

        // Combine and sort all activities
        const allActivities = [...students, ...fees, ...library];
        allActivities.sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
        
        return allActivities.slice(0, limit);
    } catch (error) {
        console.error('Error in getRecentActivity:', error.message);
        return [];
    }
}

async function getSystemAlerts(campus_id) {
    const alerts = [];

    try {
        // Low stock items
        const [lowStock] = await db.execute(
            `SELECT COUNT(*) as count FROM inventory_items 
             WHERE campus_id = ? AND quantity <= reorder_level AND quantity > 0`,
            [campus_id || 1]
        );
        if (lowStock[0]?.count > 0) {
            alerts.push({
                type: 'warning',
                message: `${lowStock[0].count} items are low in stock`,
                link: '/inventory/low-stock'
            });
        }

        // Overdue books
        const [overdue] = await db.execute(
            `SELECT COUNT(*) as count FROM book_transactions 
             WHERE campus_id = ? AND due_date < CURDATE() AND status IN ('BORROWED', 'OVERDUE')`,
            [campus_id || 1]
        );
        if (overdue[0]?.count > 0) {
            alerts.push({
                type: 'danger',
                message: `${overdue[0].count} books are overdue`,
                link: '/library/overdue'
            });
        }

        // Overdue fees
        const [pendingFees] = await db.execute(
            `SELECT COUNT(*) as count FROM fee_invoices fi
             JOIN students s ON fi.student_id = s.id
             WHERE s.campus_id = ? AND fi.status = 'unpaid' AND fi.due_date < CURDATE()`,
            [campus_id || 1]
        );
        if (pendingFees[0]?.count > 0) {
            alerts.push({
                type: 'danger',
                message: `${pendingFees[0].count} students have overdue fees`,
                link: '/fees/outstanding'
            });
        }

        // Upcoming exams
        const [upcomingExams] = await db.execute(
            `SELECT COUNT(*) as count FROM exams 
             WHERE campus_id = ? AND exam_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) 
             AND is_published = FALSE`,
            [campus_id || 1]
        );
        if (upcomingExams[0]?.count > 0) {
            alerts.push({
                type: 'info',
                message: `${upcomingExams[0].count} exams scheduled in the next 7 days`,
                link: '/exams/upcoming'
            });
        }
    } catch (error) {
        console.error('Error in getSystemAlerts:', error.message);
    }

    return alerts;
}

async function getAttendanceChartData(campus_id) {
    try {
        const [rows] = await db.execute(
            `SELECT 
                DATE(attendance_date) as date,
                COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present,
                COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) as absent
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            WHERE s.campus_id = ? 
              AND attendance_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(attendance_date)
            ORDER BY DATE(attendance_date)`,
            [campus_id || 1]
        );
        return rows;
    } catch (error) {
        console.error('Error in getAttendanceChartData:', error.message);
        return [];
    }
}

async function getFeeChartData(campus_id) {
    try {
        const [rows] = await db.execute(
            `SELECT 
                DATE(payment_date) as date,
                SUM(amount_paid) as amount
            FROM fee_payments
            WHERE campus_id = ? 
              AND payment_status = 'COMPLETED'
              AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(payment_date)
            ORDER BY DATE(payment_date)`,
            [campus_id || 1]
        );
        return rows;
    } catch (error) {
        console.error('Error in getFeeChartData:', error.message);
        return [];
    }
}

async function getExamChartData(campus_id) {
    try {
        const [rows] = await db.execute(
            `SELECT 
                et.name as exam_type,
                COUNT(e.id) as total,
                SUM(CASE WHEN e.is_published = TRUE THEN 1 ELSE 0 END) as published
            FROM exams e
            JOIN exam_types et ON e.exam_type_id = et.id
            WHERE e.campus_id = ?
            GROUP BY et.name`,
            [campus_id || 1]
        );
        return rows;
    } catch (error) {
        console.error('Error in getExamChartData:', error.message);
        return [];
    }
}

// ============================================
// DASHBOARD SERVICE
// ============================================

const dashboardService = {
    getAdminDashboard: async (campus_id) => {
        try {
            const [
                studentStats,
                attendanceStats,
                feeStats,
                examStats,
                libraryStats,
                inventoryStats,
                recentActivity
            ] = await Promise.all([
                getStudentStatistics(campus_id),
                getTodayAttendance(campus_id),
                getFeeStatistics(campus_id),
                getExamStatistics(campus_id),
                getLibraryStatistics(campus_id),
                getInventoryStatistics(campus_id),
                getRecentActivity(campus_id, 10)
            ]);

            return {
                title: 'Admin Dashboard',
                kpis: [
                    { label: 'Total Students', value: studentStats?.total_students || 0, icon: 'users', color: 'primary' },
                    { label: 'Today\'s Attendance', value: `${attendanceStats?.attendance_percentage || 0}%`, icon: 'calendar-check', color: 'success' },
                    { label: 'Pending Fees', value: `PKR ${feeStats?.outstanding_amount || 0}`, icon: 'coins', color: 'warning' },
                    { label: 'Available Books', value: libraryStats?.available_books || 0, icon: 'book', color: 'info' },
                    { label: 'Low Stock Items', value: inventoryStats?.low_stock_items || 0, icon: 'box', color: 'danger' },
                    { label: 'Active Students', value: studentStats?.active_students || 0, icon: 'user-check', color: 'success' }
                ],
                charts: {
                    attendance: await getAttendanceChartData(campus_id),
                    feeCollection: await getFeeChartData(campus_id),
                    exams: await getExamChartData(campus_id)
                },
                recent_activity: recentActivity || [],
                alerts: await getSystemAlerts(campus_id)
            };
        } catch (error) {
            console.error('Error in getAdminDashboard:', error.message);
            // Return default data on error
            return {
                title: 'Admin Dashboard',
                kpis: [],
                charts: { attendance: [], feeCollection: [], exams: [] },
                recent_activity: [],
                alerts: []
            };
        }
    },

    getTeacherDashboard: async (teacher_id, campus_id) => {
        try {
            const [classes] = await db.execute(
                `SELECT c.id, c.name, c.section, 
                        (SELECT COUNT(*) FROM students WHERE class_name = c.name AND academic_session_id = c.academic_session_id AND deleted_at IS NULL) as student_count
                FROM classes c
                WHERE c.campus_id = ?`,
                [campus_id || 1]
            );

            const [studentCount] = await db.execute(
                `SELECT COUNT(DISTINCT s.id) as count
                FROM students s
                JOIN classes c ON s.class_name = c.name
                WHERE s.campus_id = ? AND s.deleted_at IS NULL`,
                [campus_id || 1]
            );

            const today = new Date().toISOString().split('T')[0];
            const [attendanceToday] = await db.execute(
                `SELECT 
                    COUNT(*) as total,
                    ROUND((COUNT(CASE WHEN status = 'Present' THEN 1 END) / COUNT(*)) * 100, 2) as percentage
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                WHERE a.attendance_date = ? AND s.campus_id = ?`,
                [today, campus_id || 1]
            );

            const [pendingExams] = await db.execute(
                `SELECT COUNT(*) as count
                FROM exams e
                WHERE e.campus_id = ? AND e.is_published = FALSE AND e.exam_date >= CURDATE()`,
                [campus_id || 1]
            );

            const [upcomingExams] = await db.execute(
                `SELECT e.id, e.name, e.exam_date, s.name as subject_name, c.name as class_name
                FROM exams e
                JOIN subjects s ON e.subject_id = s.id
                JOIN classes c ON e.class_id = c.id
                WHERE e.campus_id = ? AND e.exam_date >= CURDATE() AND e.is_published = FALSE
                ORDER BY e.exam_date ASC
                LIMIT 5`,
                [campus_id || 1]
            );

            return {
                title: 'Teacher Dashboard',
                kpis: [
                    { label: 'My Students', value: studentCount[0]?.count || 0, icon: 'users', color: 'primary' },
                    { label: 'Today\'s Attendance', value: `${attendanceToday[0]?.percentage || 0}%`, icon: 'calendar-check', color: 'success' },
                    { label: 'Pending Exams', value: pendingExams[0]?.count || 0, icon: 'clipboard-check', color: 'warning' },
                    { label: 'Classes Assigned', value: classes.length, icon: 'chalkboard', color: 'info' }
                ],
                classes: classes || [],
                upcoming_exams: upcomingExams || [],
                recent_activity: await getRecentActivity(campus_id, 5)
            };
        } catch (error) {
            console.error('Error in getTeacherDashboard:', error.message);
            return {
                title: 'Teacher Dashboard',
                kpis: [],
                classes: [],
                upcoming_exams: [],
                recent_activity: []
            };
        }
    },

    getParentDashboard: async (student_id, campus_id) => {
        try {
            const [student] = await db.execute(
                `SELECT * FROM students WHERE id = ? AND campus_id = ? AND deleted_at IS NULL`,
                [student_id, campus_id || 1]
            );

            if (!student || student.length === 0) {
                throw new AppError('Student not found', 404);
            }

            // ✅ FIXED: Using status column directly instead of status_id
            const [attendance] = await db.execute(
                `SELECT 
                    COUNT(*) as total_days,
                    SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_days,
                    SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_days,
                    SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late_days,
                    SUM(CASE WHEN status = 'Leave' THEN 1 ELSE 0 END) as leave_days,
                    ROUND((SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as percentage
                FROM attendance
                WHERE student_id = ? AND attendance_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
                [student_id]
            );

            const [feeStatus] = await db.execute(
                `SELECT 
                    COALESCE(SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END), 0) as outstanding,
                    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid,
                    CASE 
                        WHEN SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END) > 0 THEN 'PENDING'
                        ELSE 'PAID'
                    END as status
                FROM fee_invoices
                WHERE student_id = ?`,
                [student_id]
            );

            const [recentExams] = await db.execute(
                `SELECT e.name as exam_name, em.total_marks, em.grade, e.exam_date
                FROM exam_marks em
                JOIN exams e ON em.exam_id = e.id
                WHERE em.student_id = ? AND e.is_published = TRUE
                ORDER BY e.exam_date DESC
                LIMIT 5`,
                [student_id]
            );

            const [upcomingExams] = await db.execute(
                `SELECT COUNT(*) as count
                FROM exams e
                JOIN classes c ON e.class_id = c.id
                JOIN students s ON s.class_name = c.name
                WHERE s.id = ? AND e.exam_date >= CURDATE() AND e.is_published = FALSE`,
                [student_id]
            );

            const [libraryStatus] = await db.execute(
                `SELECT 
                    COUNT(*) as borrowed_books,
                    SUM(CASE WHEN bt.due_date < CURDATE() AND bt.status IN ('BORROWED', 'OVERDUE') THEN 1 ELSE 0 END) as overdue_books
                FROM book_transactions bt
                JOIN library_members lm ON bt.member_id = lm.id
                WHERE lm.student_id = ? AND bt.status IN ('BORROWED', 'OVERDUE')`,
                [student_id]
            );

            const studentData = student[0];

            return {
                title: 'Parent Dashboard',
                student: {
                    name: `${studentData.first_name} ${studentData.last_name}`,
                    class: studentData.class_name,
                    roll_no: studentData.roll_no
                },
                kpis: [
                    { label: 'Attendance', value: `${attendance[0]?.percentage || 0}%`, icon: 'calendar-check', color: 'primary' },
                    { label: 'Fee Status', value: feeStatus[0]?.status || 'PAID', icon: 'coins', color: feeStatus[0]?.status === 'PAID' ? 'success' : 'warning' },
                    { label: 'Library Books', value: libraryStatus[0]?.borrowed_books || 0, icon: 'book', color: 'info' },
                    { label: 'Upcoming Exams', value: upcomingExams[0]?.count || 0, icon: 'clipboard', color: 'warning' }
                ],
                attendance_details: attendance[0] || { total_days: 0, percentage: 0 },
                fee_details: feeStatus[0] || { outstanding: 0, paid: 0, status: 'PAID' },
                exam_results: recentExams || [],
                upcoming_events: []
            };
        } catch (error) {
            console.error('Error in getParentDashboard:', error.message);
            throw error;
        }
    }
};

module.exports = dashboardService;