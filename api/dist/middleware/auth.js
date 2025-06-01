"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const authenticate = async (req, res, next) => {
    try {
        console.log('Authenticating request...');
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            console.log('No token provided');
            res.status(401).json({
                status: 'error',
                message: 'Authentication required: No token provided'
            });
            return;
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
            req.user = decoded;
            console.log('Token verified successfully for user:', decoded.email);
            next();
        }
        catch (jwtError) {
            console.error('JWT verification failed:', jwtError);
            res.status(401).json({
                status: 'error',
                message: 'Authentication failed: Invalid token'
            });
            return;
        }
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Authentication error',
            details: error.message
        });
        return;
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        next();
    };
};
exports.authorize = authorize;
