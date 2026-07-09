// ============================================
// FILE: src/controllers/reportController.js
// PURPOSE: Request/Response handlers for reports
// ============================================

const reportService = require('../services/reportService');
const AppError = require('../utils/appError');

const reportController = {
    // Generate report
    generateReport: async (req, res, next) => {
        try {
            const { reportType } = req.params;
            const params = req.query;

            const result = await reportService.generateReport(
                reportType,
                params,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Report generated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get available report types
    getReportTypes: async (req, res, next) => {
        try {
            const result = await reportService.getReportTypes();

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = reportController;