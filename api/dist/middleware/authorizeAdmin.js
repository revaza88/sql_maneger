"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeAdmin = void 0;
const authorizeAdmin = (req, res, next) => {
    if (req.user?.role?.toUpperCase() !== 'ADMIN') { // Convert to uppercase for comparison
        res.status(403).json({ status: 'error', message: 'Forbidden: Access is restricted to administrators.' });
        return;
    }
    next();
};
exports.authorizeAdmin = authorizeAdmin;
