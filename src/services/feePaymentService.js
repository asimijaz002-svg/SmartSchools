// ============================================
// FILE: src/services/feePaymentService.js
// PURPOSE: Business logic for fee payments
// ============================================

const feePaymentRepository = require('../repositories/feePaymentRepository');
const feeInvoiceRepository = require('../repositories/invoiceRepository');
const studentRepository = require('../repositories/studentRepository');
const sessionRepository = require('../repositories/sessionRepository');
const dbPool = require('../config/db');
const auditService = require('./auditService');
const eventEmitter = require('../utils/eventEmitter');
const AppError = require('../utils/appError');

const feePaymentService = {
    // Process payment - FIXED
    processPayment: async (paymentData, actor) => {
        const {
            invoice_id, student_id, amount_paid, payment_method_id,
            transaction_id, remarks, bank_name, cheque_number, cheque_date
        } = paymentData;

        // Validate required fields
        if (!invoice_id || !student_id || !amount_paid || !payment_method_id) {
            throw new AppError('Missing required fields: invoice_id, student_id, amount_paid, payment_method_id', 400);
        }

        // Validate student exists
        const student = await studentRepository.findById(student_id);
        if (!student) {
            throw new AppError('Student not found', 404);
        }

        // Validate invoice exists and is unpaid
        const invoice = await feeInvoiceRepository.findById(invoice_id);
        if (!invoice) {
            throw new AppError('Invoice not found', 404);
        }

        if (invoice.status === 'paid') {
            throw new AppError('This invoice has already been paid', 400);
        }

        if (amount_paid > invoice.amount) {
            throw new AppError(`Amount paid (${amount_paid}) exceeds invoice amount (${invoice.amount})`, 400);
        }

        // Get active session
        const activeSession = await sessionRepository.getActiveSession();
        if (!activeSession) {
            throw new AppError('No active academic session found', 500);
        }

        // ✅ GENERATE RECEIPT NUMBER FIRST (BEFORE ANYTHING ELSE)
        const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            // Create payment record
            const result = await feePaymentRepository.create({
                invoice_id: parseInt(invoice_id),
                student_id: parseInt(student_id),
                amount_paid: parseFloat(amount_paid),
                payment_method_id: parseInt(payment_method_id),
                transaction_id: transaction_id || null,
                payment_status: 'COMPLETED',
                remarks: remarks || null,
                receipt_number: receiptNumber,
                bank_name: bank_name || null,
                cheque_number: cheque_number || null,
                cheque_date: cheque_date || null,
                processed_by: actor.user_id,
                campus_id: student.campus_id || 1
            }, connection);

            // Update invoice status
            await feeInvoiceRepository.updateStatus(invoice_id, 'paid', connection);

            // Update student fee balance
            await feePaymentService.updateStudentBalance(student_id, activeSession.id, connection);

            await connection.commit();

            // Audit log
            await auditService.log({
                user_id: actor.user_id,
                action: 'FEE_PAYMENT',
                entity_name: 'fee_payments',
                entity_id: result.insertId,
                previous_values: { invoice_status: invoice.status },
                new_values: { amount_paid, receipt_number },
                ip_address: actor.ip_address
            });

            // Emit event for notifications
            eventEmitter.emit('fee.paid', {
                student_id,
                invoice_id,
                amount_paid,
                receipt_number,
                student_name: `${student.first_name} ${student.last_name}`
            });

            return {
                id: result.insertId,
                receipt_number: receiptNumber,
                amount_paid: parseFloat(amount_paid),
                invoice_id: parseInt(invoice_id),
                message: 'Payment processed successfully'
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Get payments by student
    getPaymentsByStudent: async (student_id, academic_session_id) => {
        const student = await studentRepository.findById(student_id);
        if (!student) {
            throw new AppError('Student not found', 404);
        }

        return await feePaymentRepository.findByStudent(student_id, academic_session_id);
    },

    // Get payments by invoice
    getPaymentsByInvoice: async (invoice_id) => {
        return await feePaymentRepository.findByInvoice(invoice_id);
    },

    // Get all payments with pagination
    getPayments: async (options) => {
        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 10;
        const offset = (page - 1) * limit;

        const payments = await feePaymentRepository.findAll({
            search: options.search || null,
            student_id: options.student_id || null,
            payment_method_id: options.payment_method_id || null,
            payment_status: options.payment_status || null,
            date_from: options.date_from || null,
            date_to: options.date_to || null,
            sortBy: options.sortBy || 'payment_date',
            sortOrder: options.sortOrder || 'DESC',
            limit,
            offset,
            campus_id: options.campus_id || 1
        });

        const totalRecords = await feePaymentRepository.countAll({
            search: options.search || null,
            student_id: options.student_id || null,
            payment_method_id: options.payment_method_id || null,
            payment_status: options.payment_status || null,
            date_from: options.date_from || null,
            date_to: options.date_to || null,
            campus_id: options.campus_id || 1
        });

        const totalPages = Math.ceil(totalRecords / limit);

        return {
            data: payments,
            pagination: {
                page,
                limit,
                total_records: totalRecords,
                total_pages: totalPages
            }
        };
    },

    // Get payment by ID
    getPaymentById: async (id) => {
        const payment = await feePaymentRepository.findById(id);
        if (!payment) {
            throw new AppError('Payment record not found', 404);
        }
        return payment;
    },

    // Update student balance - FIXED
    updateStudentBalance: async (student_id, academic_session_id, connection = null) => {
        const client = connection || db;

        // Get total unpaid invoices
        const [invoiceTotal] = await client.execute(
            'SELECT COALESCE(SUM(amount), 0) as total FROM fee_invoices WHERE student_id = ? AND status != "paid"',
            [student_id]
        );

        const totalFees = invoiceTotal[0].total;

        const totalPaid = await feePaymentRepository.getTotalPaid(student_id, academic_session_id);

        const outstanding = totalFees - totalPaid;

        const query = `
            INSERT INTO student_fee_balances 
            (student_id, academic_session_id, total_fees, paid_amount, outstanding_balance, campus_id)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                total_fees = VALUES(total_fees),
                paid_amount = VALUES(paid_amount),
                outstanding_balance = VALUES(outstanding_balance),
                updated_at = CURRENT_TIMESTAMP
        `;

        await client.execute(query, [student_id, academic_session_id, totalFees, totalPaid, outstanding, 1]);
    },

    // Get student balance
    getStudentBalance: async (student_id, academic_session_id) => {
        const query = `
            SELECT * FROM student_fee_balances
            WHERE student_id = ? AND academic_session_id = ?
        `;
        const [rows] = await db.execute(query, [student_id, academic_session_id]);
        return rows[0] || { total_fees: 0, paid_amount: 0, outstanding_balance: 0 };
    },

    // Get payment statistics
    getPaymentStats: async (campus_id) => {
        return await feePaymentRepository.getPaymentStats(campus_id || 1);
    },

    // Get daily payment summary
    getDailySummary: async (date, campus_id) => {
        return await feePaymentRepository.getDailySummary(date, campus_id || 1);
    },

    // Refund payment
    refundPayment: async (payment_id, remarks, actor) => {
        const payment = await feePaymentRepository.findById(payment_id);
        if (!payment) {
            throw new AppError('Payment not found', 404);
        }

        if (payment.payment_status === 'REFUNDED') {
            throw new AppError('Payment already refunded', 400);
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            await feePaymentRepository.updateStatus(payment_id, 'REFUNDED', connection);

            // Update invoice status back to unpaid
            await feeInvoiceRepository.updateStatus(payment.invoice_id, 'unpaid', connection);

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'FEE_REFUND',
                entity_name: 'fee_payments',
                entity_id: parseInt(payment_id),
                previous_values: { payment_status: payment.payment_status },
                new_values: { payment_status: 'REFUNDED', remarks },
                ip_address: actor.ip_address
            });

            return { id: payment_id, message: 'Payment refunded successfully' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Get outstanding fees for all students
    getOutstandingFees: async (campus_id) => {
        const query = `
            SELECT s.id, s.roll_no, s.first_name, s.last_name, s.class_name,
                   COALESCE(SUM(fi.amount), 0) as total_fees,
                   COALESCE((
                       SELECT SUM(amount_paid) 
                       FROM fee_payments fp 
                       WHERE fp.student_id = s.id 
                       AND fp.payment_status = 'COMPLETED'
                   ), 0) as paid_amount,
                   COALESCE(SUM(fi.amount), 0) - COALESCE((
                       SELECT SUM(amount_paid) 
                       FROM fee_payments fp 
                       WHERE fp.student_id = s.id 
                       AND fp.payment_status = 'COMPLETED'
                   ), 0) as outstanding
            FROM students s
            LEFT JOIN fee_invoices fi ON s.id = fi.student_id AND fi.status = 'unpaid'
            WHERE s.campus_id = ? AND s.deleted_at IS NULL AND s.status = 'ACTIVE'
            GROUP BY s.id
            HAVING outstanding > 0
            ORDER BY outstanding DESC
        `;
        const [rows] = await db.execute(query, [campus_id || 1]);
        return rows;
    }
};

module.exports = feePaymentService;