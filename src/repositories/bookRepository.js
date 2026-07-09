// ============================================
// FILE: src/repositories/bookRepository.js
// PURPOSE: Database operations for books
// ============================================

const db = require('../config/db');

const bookRepository = {
    // Create book
    create: async (bookData, connection = null) => {
        const client = connection || db;
        const {
            isbn = null, title = null, author = null, publisher = null,
            publication_year = null, edition = null, category_id = null,
            shelf_location = null, total_copies = 1, price = null,
            language = 'English', pages = null, description = null,
            cover_image = null, campus_id = 1, created_by = null
        } = bookData;

        const query = `
            INSERT INTO books (
                isbn, title, author, publisher, publication_year, edition,
                category_id, shelf_location, total_copies, available_copies,
                borrowed_copies, lost_copies, damaged_copies, price, language,
                pages, description, cover_image, campus_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await client.execute(query, [
            isbn, title, author, publisher, publication_year, edition,
            category_id, shelf_location, total_copies, total_copies,
            0, 0, 0, price, language, pages, description, cover_image,
            campus_id, created_by
        ]);
        return result;
    },

    // Find book by ID
    findById: async (id) => {
        const query = `
            SELECT b.*, c.name as category_name, c.code as category_code
            FROM books b
            LEFT JOIN book_categories c ON b.category_id = c.id
            WHERE b.id = ?
        `;
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    },

    // Find book by ISBN
    findByISBN: async (isbn, campus_id) => {
        const query = `
            SELECT * FROM books 
            WHERE isbn = ? AND campus_id = ?
        `;
        const [rows] = await db.execute(query, [isbn, campus_id || 1]);
        return rows[0];
    },

    // Search books
    search: async ({ search, category_id, author, status, sortBy, sortOrder, limit, offset, campus_id }) => {
        let query = `
            SELECT b.*, c.name as category_name
            FROM books b
            LEFT JOIN book_categories c ON b.category_id = c.id
            WHERE b.campus_id = ?
        `;
        const queryParams = [campus_id || 1];

        if (search) {
            query += ` AND (b.title LIKE ? OR b.isbn LIKE ? OR b.author LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (category_id) {
            query += ` AND b.category_id = ?`;
            queryParams.push(category_id);
        }

        if (author) {
            query += ` AND b.author LIKE ?`;
            queryParams.push(`%${author}%`);
        }

        if (status) {
            query += ` AND b.status = ?`;
            queryParams.push(status);
        }

        const allowedSortFields = ['title', 'author', 'total_copies', 'available_copies', 'created_at'];
        const sortByField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const sortOrderValue = (sortOrder && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
        
        query += ` ORDER BY b.${sortByField} ${sortOrderValue}`;

        if (limit) {
            query += ` LIMIT ? OFFSET ?`;
            queryParams.push(parseInt(limit), parseInt(offset) || 0);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows;
    },

    // Count total books
    countAll: async ({ search, category_id, author, status, campus_id }) => {
        let query = `SELECT COUNT(*) as total FROM books WHERE campus_id = ?`;
        const queryParams = [campus_id || 1];

        if (search) {
            query += ` AND (title LIKE ? OR isbn LIKE ? OR author LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (category_id) {
            query += ` AND category_id = ?`;
            queryParams.push(category_id);
        }

        if (author) {
            query += ` AND author LIKE ?`;
            queryParams.push(`%${author}%`);
        }

        if (status) {
            query += ` AND status = ?`;
            queryParams.push(status);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows[0].total;
    },

    // Update book
    update: async (id, updateData, connection = null) => {
        const client = connection || db;
        const fields = [];
        const values = [];

        const allowedFields = [
            'isbn', 'title', 'author', 'publisher', 'publication_year',
            'edition', 'category_id', 'shelf_location', 'total_copies',
            'available_copies', 'borrowed_copies', 'lost_copies',
            'damaged_copies', 'price', 'language', 'pages', 'description',
            'cover_image', 'status', 'updated_by'
        ];

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(updateData[field]);
            }
        }

        if (fields.length === 0) {
            return { affectedRows: 0 };
        }

        values.push(id);
        const query = `UPDATE books SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await client.execute(query, values);
        return result;
    },

    // Update book copies count
    updateCopies: async (id, operation, connection = null) => {
        const client = connection || db;
        let query;
        if (operation === 'borrow') {
            query = `
                UPDATE books 
                SET available_copies = available_copies - 1, 
                    borrowed_copies = borrowed_copies + 1 
                WHERE id = ? AND available_copies > 0
            `;
        } else if (operation === 'return') {
            query = `
                UPDATE books 
                SET available_copies = available_copies + 1, 
                    borrowed_copies = borrowed_copies - 1 
                WHERE id = ? AND borrowed_copies > 0
            `;
        } else {
            return { affectedRows: 0 };
        }

        const [result] = await client.execute(query, [id]);
        return result;
    },

    // Check if book is available
    isAvailable: async (id) => {
        const query = `SELECT available_copies FROM books WHERE id = ?`;
        const [rows] = await db.execute(query, [id]);
        return rows[0] && rows[0].available_copies > 0;
    },

    // Get book statistics
    getStats: async (campus_id) => {
        const query = `
            SELECT 
                COUNT(*) as total_books,
                SUM(total_copies) as total_copies,
                SUM(available_copies) as available_copies,
                SUM(borrowed_copies) as borrowed_copies,
                SUM(lost_copies) as lost_copies,
                SUM(damaged_copies) as damaged_copies,
                COUNT(DISTINCT category_id) as categories,
                COUNT(DISTINCT author) as authors
            FROM books
            WHERE campus_id = ?
        `;
        const [rows] = await db.execute(query, [campus_id || 1]);
        return rows[0];
    },

    // Get books by category
    findByCategory: async (category_id, campus_id) => {
        const query = `
            SELECT * FROM books
            WHERE category_id = ? AND campus_id = ?
            ORDER BY title
        `;
        const [rows] = await db.execute(query, [category_id, campus_id || 1]);
        return rows;
    },

    // Delete book
    delete: async (id, connection = null) => {
        const client = connection || db;
        const query = `UPDATE books SET status = 'INACTIVE' WHERE id = ?`;
        const [result] = await client.execute(query, [id]);
        return result;
    }
};

module.exports = bookRepository;