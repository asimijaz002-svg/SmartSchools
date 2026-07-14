const { query } = require('../config/database');

class DashboardRepository {
    /**
     * Get recent activity for dashboard
     */
    async getRecentActivity(userId, userRole, limit = 10) {
        try {
            let sql = `
                SELECT 
                    a.id,
                    a.user_id,
                    a.action,
                    a.entity_type,
                    a.entity_id,
                    a.description,
                    a.ip_address,
                    a.user_agent,
                    a.created_at,
                    u.username,
                    u.email
                FROM audit_logs a
                LEFT JOIN users u ON u.id = a.user_id
                WHERE 1=1
            `;
            
            const params = [];
            
            // Role-based filtering
            if (userRole === 'teacher') {
                sql += ` AND a.user_id = ?`;
                params.push(userId);
            } else if (userRole === 'parent') {
                sql += ` AND a.entity_type IN ('student', 'fee', 'attendance')`;
            }
            
            sql += ` ORDER BY a.created_at DESC LIMIT ?`;
            params.push(limit);
            
            const results = await query(sql, params);
            return results;
        } catch (error) {
            console.error('Error in getRecentActivity:', error);
            return []; // Return empty array instead of throwing error
        }
    }

    /**
     * Get dashboard statistics
     */
    async getStats(userRole, userId) {
        try {
            const stats = {};
            
            // Total students
            const studentResult = await query('SELECT COUNT(*) as count FROM students WHERE deleted_at IS NULL');
            stats.totalStudents = studentResult[0]?.count || 0;
            
            // Total teachers
            const teacherResult = await query("SELECT COUNT(*) as count FROM employees WHERE role = 'teacher' AND deleted_at IS NULL");
            stats.totalTeachers = teacherResult[0]?.count || 0;
            
            // Total classes
            const classResult = await query('SELECT COUNT(*) as count FROM classes WHERE deleted_at IS NULL');
            stats.totalClasses = classResult[0]?.count || 0;
            
            // Pending fees
            const feeResult = await query(`SELECT COALESCE(SUM(total_amount - paid_amount), 0) as total 
                                          FROM fee_invoices 
                                          WHERE status IN ('unpaid', 'partial', 'overdue') AND deleted_at IS NULL`);
            stats.pendingFees = feeResult[0]?.total || 0;
            
            // Today's attendance
            const attendanceResult = await query(`SELECT COUNT(*) as count 
                                                 FROM attendance 
                                                 WHERE DATE(created_at) = CURDATE() 
                                                 AND deleted_at IS NULL`);
            stats.todayAttendance = attendanceResult[0]?.count || 0;
            
            // Recent enrollments (last 30 days)
            const enrollmentResult = await query(`SELECT COUNT(*) as count 
                                                 FROM students 
                                                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) 
                                                 AND deleted_at IS NULL`);
            stats.recentEnrollments = enrollmentResult[0]?.count || 0;
            
            return stats;
        } catch (error) {
            console.error('Error in getStats:', error);
            return {
                totalStudents: 0,
                totalTeachers: 0,
                totalClasses: 0,
                pendingFees: 0,
                todayAttendance: 0,
                recentEnrollments: 0
            };
        }
    }

    /**
     * Get chart data
     */
    async getChartData(chartType, userId, userRole) {
        try {
            let sql = '';
            
            switch (chartType) {
                case 'attendance':
                    sql = `
                        SELECT 
                            DATE(created_at) as date,
                            COUNT(*) as present,
                            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
                            SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
                        FROM attendance
                        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                        AND deleted_at IS NULL
                        GROUP BY DATE(created_at)
                        ORDER BY date ASC
                    `;
                    break;
                    
                case 'fees':
                    sql = `
                        SELECT 
                            DATE_FORMAT(created_at, '%Y-%m') as month,
                            SUM(total_amount) as total,
                            SUM(paid_amount) as collected,
                            SUM(total_amount - paid_amount) as pending
                        FROM fee_invoices
                        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                        AND deleted_at IS NULL
                        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                        ORDER BY month ASC
                    `;
                    break;
                    
                case 'enrollment':
                    sql = `
                        SELECT 
                            DATE_FORMAT(created_at, '%Y-%m') as month,
                            COUNT(*) as count
                        FROM students
                        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                        AND deleted_at IS NULL
                        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                        ORDER BY month ASC
                    `;
                    break;
                    
                default:
                    return [];
            }
            
            const results = await query(sql);
            return results;
        } catch (error) {
            console.error('Error in getChartData:', error);
            return [];
        }
    }

    /**
     * Get upcoming events
     */
    async getUpcomingEvents(limit = 5) {
        try {
            const sql = `
                SELECT 
                    id,
                    title,
                    description,
                    event_date,
                    event_type,
                    location,
                    created_at
                FROM events
                WHERE event_date >= CURDATE()
                AND deleted_at IS NULL
                ORDER BY event_date ASC
                LIMIT ?
            `;
            
            const results = await query(sql, [limit]);
            return results;
        } catch (error) {
            console.error('Error in getUpcomingEvents:', error);
            return [];
        }
    }

    /**
     * Get notifications for user
     */
    async getNotifications(userId, limit = 10) {
        try {
            const sql = `
                SELECT 
                    id,
                    user_id,
                    title,
                    message,
                    type,
                    is_read,
                    created_at
                FROM notifications
                WHERE user_id = ?
                AND deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT ?
            `;
            
            const results = await query(sql, [userId, limit]);
            return results;
        } catch (error) {
            console.error('Error in getNotifications:', error);
            return [];
        }
    }
}

module.exports = new DashboardRepository();