"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_model_1 = require("../models/user.model");
const config_1 = require("../config");
const zod_1 = require("zod");
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    name: zod_1.z.string().min(2)
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string()
});
class AuthController {
    async register(req, res, next) {
        try {
            const validatedData = registerSchema.parse(req.body);
            // Check if user already exists
            const existingUser = await user_model_1.UserModel.findByEmail(validatedData.email);
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }
            // Create new user
            const user = await user_model_1.UserModel.createUser({
                email: validatedData.email,
                password: validatedData.password,
                name: validatedData.name
            });
            // Generate token
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
            return res.status(201).json({
                message: 'User registered successfully',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            });
        }
        catch (error) {
            console.error('Error in register method:', error);
            next(error);
        }
    }
    async login(req, res, next) {
        try {
            const validatedData = loginSchema.parse(req.body);
            // Find user
            const user = await user_model_1.UserModel.findByEmail(validatedData.email);
            if (!user) {
                return res.status(401).json({ message: 'User with this email not found.' });
            }
            // Verify password
            if (!user.password) {
                console.error(`User ${user.email} has no password set in the database.`);
                return res.status(500).json({ message: 'Authentication error. Please contact support.' });
            }
            const isValidPassword = await bcrypt_1.default.compare(validatedData.password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ message: 'Incorrect password. Please try again.' });
            }
            // Generate token
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
            return res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            });
        }
        catch (error) {
            console.error('Login error:', error);
            next(error);
        }
    }
    async verifyPassword(req, res, next) {
        try {
            const { password } = req.body;
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Authentication required' });
            }
            if (!password) {
                return res.status(400).json({ message: 'Password is required' });
            }
            // Get user from database
            const user = await user_model_1.UserModel.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            // Verify password
            const isValidPassword = await bcrypt_1.default.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(400).json({ message: 'Invalid password' });
            }
            return res.json({ message: 'Password verified successfully' });
        }
        catch (error) {
            console.error('Password verification error:', error);
            next(error);
        }
    }
}
exports.AuthController = AuthController;
