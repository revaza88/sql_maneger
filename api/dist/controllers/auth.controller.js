"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_model_1 = require("../models/user.model");
const SQLServerUserService_1 = require("../services/SQLServerUserService");
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
    static async register(req, res, next) {
        try {
            const validatedData = registerSchema.parse(req.body);
            // Check if user already exists
            const existingUser = await user_model_1.UserModel.findByEmail(validatedData.email);
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }
            // Create new user
            const user = await user_model_1.UserModel.createUser(validatedData);
            // Automatically create SQL Server credentials for the new user
            try {
                const sqlCredentials = await SQLServerUserService_1.SQLServerUserService.createSQLServerUser(user.id, user.email);
                await user_model_1.UserModel.updateSQLServerCredentials(user.id, sqlCredentials.username, sqlCredentials.password);
                console.log(`SQL Server credentials created for user ${user.email}: ${sqlCredentials.username}`);
            }
            catch (sqlError) {
                console.error('Failed to create SQL Server credentials during registration:', sqlError);
                // Don't fail registration if SQL Server creation fails
            }
            // Generate token
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
            res.status(201).json({
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
            // Add logging to capture errors
            console.error('Error in register method:', error);
            next(error);
        }
    }
    static async login(req, res, next) {
        try {
            const validatedData = loginSchema.parse(req.body);
            // Find user
            const user = await user_model_1.UserModel.findByEmail(validatedData.email);
            if (!user) {
                // More specific error for user not found
                return res.status(401).json({ message: 'User with this email not found.' });
            }
            // Verify password
            // Ensure user.password is not undefined or null before comparison
            if (!user.password) {
                console.error(`User ${user.email} has no password set in the database.`);
                return res.status(500).json({ message: 'Authentication error. Please contact support.' });
            }
            const isValidPassword = await bcrypt_1.default.compare(validatedData.password, user.password);
            if (!isValidPassword) {
                // More specific error for incorrect password
                return res.status(401).json({ message: 'Incorrect password. Please try again.' });
            }
            // Generate token
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
            res.json({
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
            // Log the error for server-side debugging
            console.error('Login error:', error);
            // Pass to the global error handler for consistent response format
            next(error);
        }
    }
}
exports.AuthController = AuthController;
