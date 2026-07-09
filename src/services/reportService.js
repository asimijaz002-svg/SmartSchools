// ============================================
// FILE: src/services/reportService.js
// PURPOSE: Business logic for reports module
// ============================================

const db = require('../config/db');
const auditService = require('./auditService');
const AppError = require('../utils/appError');

// ============================================
// REPORT QUERY BUILDERS
// ============================================

const reportQueries = {
    // Student List Report
    studentList: async (params) => {
        let query = `
            SELECT s.id, s.roll_no, s.admission_number, s.first_name, s.last_name,
                   s.class_name, s.gender, s.admission_date, s.status,
                   s.father_occupation, s.mother_occupation, s.emergency_contact
            FROM students s
            WHERE s.deleted_at IS NULL
        `;
        const queryParams = [];

        if (params.class_name) {
            query += ` AND s.class_name = ?`;
            queryParams.push(params.class_name);
        }

        if (params.status) {
            query += ` AND s.status = ?`;
            queryParams.push(params.status);
        }

        if (params.academic_session_id) {
            query += ` AND s.academic_session_id = ?`;
            queryParams.push(params.academic_session_id);
        }

        query += ` ORDER BY s.roll_no`;

        const [rows] = await db.execute(query, queryParams);
        return { data: rows, columns: getStudentListColumns() };
    },

    // Fee Collection Report
    feeCollection: async (params) => {
        const { academic_session_id, date_from, date_to } = params;

        let query = `
            SELECT 
                DATE(fp.payment_date) as payment_date,
                s.roll_no,
                CONCAT(s.first_name, ' ', s.last_name) as student_name,
                fp.amount_paid,
                pm.name as payment_method,
                fp.receipt_number,
                fp.remarks
            FROM fee_payments fp
            JOIN students s ON fp.student_id = s.id
            JOIN payment_methods pm ON fp.payment_method_id = pm.id
            WHERE fp.payment_status = 'COMPLETED'
        `;
        const queryParams = [];

        if (academic_session_id) {
            query += ` AND fp.academic_session_id = ?`;
            queryParams.push(academic_session_id);
        }

        if (date_from && date_to) {
            query += ` AND DATE(fp.payment_date) BETWEEN ? AND ?`;
            queryParams.push(date_from, date_to);
        }

        query += ` ORDER BY fp.payment_date DESC`;

        const [rows] = await db.execute(query, queryParams);
        return { data: rows, columns: getFeeCollectionColumns() };
    },

    // Library Borrowing Report
    libraryBorrowing: async (params) => {
        const { date_from, date_to } = params;

        let query = `
            SELECT 
                bt.borrow_date,
                bt.due_date,
                b.title as book_title,
                b.isbn,
                lm.full_name as member_name,
                lm.member_code,
                bt.status,
                bt.fine_amount
            FROM book_transactions bt
            JOIN books b ON bt.book_id = b.id
            JOIN library_members lm ON bt.member_id = lm.id
            WHERE 1=1
        `;
        const queryParams = [];

        if (date_from && date_to) {
            query += ` AND DATE(bt.borrow_date) BETWEEN ? AND ?`;
            queryParams.push(date_from, date_to);
        }

        query += ` ORDER BY bt.borrow_date DESC`;

        const [rows] = await db.execute(query, queryParams);
        return { data: rows, columns: getLibraryBorrowingColumns() };
    }
};

// ============================================
// COLUMN DEFINITIONS
// ============================================

const getStudentListColumns = () => [
    { key: 'id', label: 'ID' },
    { key: 'roll_no', label: 'Roll Number' },
    { key: 'admission_number', label: 'Admission Number' },
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'class_name', label: 'Class' },
    { key: 'gender', label: 'Gender' },
    { key: 'admission_date', label: 'Admission Date' },
    { key: 'status', label: 'Status' },
    { key: 'father_occupation', label: "Father's Occupation" },
    { key: 'emergency_contact', label: 'Emergency Contact' }
];

const getFeeCollectionColumns = () => [
    { key: 'payment_date', label: 'Payment Date' },
    { key: 'roll_no', label: 'Roll Number' },
    { key: 'student_name', label: 'Student Name' },
    { key: 'amount_paid', label: 'Amount Paid' },
    { key: 'payment_method', label: 'Payment Method' },
    { key: 'receipt_number', label: 'Receipt Number' },
    { key: 'remarks', label: 'Remarks' }
];

const getLibraryBorrowingColumns = () => [
    { key: 'borrow_date', label: 'Borrow Date' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'book_title', label: 'Book' },
    { key: 'isbn', label: 'ISBN' },
    { key: 'member_name', label: 'Member' },
    { key: 'status', label: 'Status' },
    { key: 'fine_amount', label: 'Fine Amount' }
];

// ============================================
// REPORT SERVICE
// ============================================

const reportService = {
    generateReport: async (reportType, params, actor) => {
        const reportGenerators = {
            'student-list': reportQueries.studentList,
            'fee-collection': reportQueries.feeCollection,
            'library-borrowing': reportQueries.libraryBorrowing
        };

        const generator = reportGenerators[reportType];
        if (!generator) {
            throw new AppError(`Report type '${reportType}' not found. Available: student-list, fee-collection, library-borrowing`, 404);
        }

        const result = await generator(params);

        await auditService.log({
            user_id: actor.user_id,
            action: 'REPORT_GENERATE',
            entity_name: 'reports',
            entity_id: null,
            new_values: { report_type: reportType, record_count: result.data.length },
            ip_address: actor.ip_address
        });

        return {
            report_type: reportType,
            generated_at: new Date().toISOString(),
            record_count: result.data.length,
            columns: result.columns,
            data: result.data
        };
    },

    getReportTypes: async () => {
        return [
            { code: 'student-list', name: 'Student List', category: 'STUDENT' },
            { code: 'fee-collection', name: 'Fee Collection Report', category: 'FINANCIAL' },
            { code: 'library-borrowing', name: 'Library Borrowing History', category: 'LIBRARY' }
        ];
    }
};

module.exports = reportService;