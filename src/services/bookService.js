// ============================================
// FILE: src/services/bookService.js
// PURPOSE: Business logic for books
// ============================================

const bookRepository = require('../repositories/bookRepository');
const auditService = require('./auditService');
const AppError = require('../utils/appError');

const bookService = {
    // Create book
    createBook: async (bookData, actor) => {
        const { isbn, title, author, category_id, total_copies } = bookData;

        if (!title || !author || !category_id) {
            throw new AppError('Title, author, and category_id are required', 400);
        }

        // Check duplicate ISBN
        if (isbn) {
            const existing = await bookRepository.findByISBN(isbn, bookData.campus_id);
            if (existing) {
                throw new AppError('Book with this ISBN already exists', 400);
            }
        }

        const result = await bookRepository.create({
            ...bookData,
            created_by: actor.user_id
        });

        await auditService.log({
            user_id: actor.user_id,
            action: 'BOOK_CREATE',
            entity_name: 'books',
            entity_id: result.insertId,
            new_values: bookData,
            ip_address: actor.ip_address
        });

        return { id: result.insertId, ...bookData };
    },

    // Get books with pagination
    getBooks: async (options) => {
        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 10;
        const offset = (page - 1) * limit;

        const books = await bookRepository.search({
            search: options.search || null,
            category_id: options.category_id || null,
            author: options.author || null,
            status: options.status || null,
            sortBy: options.sortBy || 'title',
            sortOrder: options.sortOrder || 'ASC',
            limit,
            offset,
            campus_id: options.campus_id || 1
        });

        const totalRecords = await bookRepository.countAll({
            search: options.search || null,
            category_id: options.category_id || null,
            author: options.author || null,
            status: options.status || null,
            campus_id: options.campus_id || 1
        });

        const totalPages = Math.ceil(totalRecords / limit);

        return {
            data: books,
            pagination: {
                page,
                limit,
                total_records: totalRecords,
                total_pages: totalPages
            }
        };
    },

    // Search books
    searchBooks: async (options) => {
        return await bookRepository.search({
            search: options.q || null,
            category_id: options.category_id || null,
            author: options.author || null,
            status: options.status || null,
            sortBy: options.sortBy || 'title',
            sortOrder: options.sortOrder || 'ASC',
            limit: parseInt(options.limit) || 20,
            offset: 0,
            campus_id: options.campus_id || 1
        });
    },

    // Get book by ID
    getBookById: async (id) => {
        const book = await bookRepository.findById(id);
        if (!book) {
            throw new AppError('Book not found', 404);
        }
        return book;
    },

    // Update book
    updateBook: async (id, updateData, actor) => {
        const book = await bookRepository.findById(id);
        if (!book) {
            throw new AppError('Book not found', 404);
        }

        updateData.updated_by = actor.user_id;
        await bookRepository.update(id, updateData);

        await auditService.log({
            user_id: actor.user_id,
            action: 'BOOK_UPDATE',
            entity_name: 'books',
            entity_id: parseInt(id),
            previous_values: book,
            new_values: updateData,
            ip_address: actor.ip_address
        });

        return { id: parseInt(id), message: 'Book updated successfully' };
    },

    // Delete book
    deleteBook: async (id, actor) => {
        const book = await bookRepository.findById(id);
        if (!book) {
            throw new AppError('Book not found', 404);
        }

        if (book.borrowed_copies > 0) {
            throw new AppError('Cannot delete book with borrowed copies', 400);
        }

        await bookRepository.delete(id);

        await auditService.log({
            user_id: actor.user_id,
            action: 'BOOK_DELETE',
            entity_name: 'books',
            entity_id: parseInt(id),
            previous_values: book,
            new_values: null,
            ip_address: actor.ip_address
        });

        return { id: parseInt(id), message: 'Book deleted successfully' };
    }
};

module.exports = bookService;