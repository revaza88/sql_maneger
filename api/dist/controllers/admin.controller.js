"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const user_model_1 = require("../models/user.model"); // Assuming UserModel can fetch all users
class AdminController {
    constructor() {
        this.getUsers = async (req, res, next) => {
            try {
                // TODO: Add pagination and filtering options
                const users = await user_model_1.UserModel.findAll(); // Assuming UserModel.findAll() exists or will be created
                res.json({
                    status: 'success',
                    data: users, // users are already Omit<User, 'password'>
                });
            }
            catch (error) {
                next(error);
            }
        };
        // TODO: Implement other admin actions like updateUserRole, deleteUser, etc.
        this.updateUserRole = async (req, res, next) => {
            try {
                const { userId } = req.params;
                const { role } = req.body;
                if (!['ADMIN', 'USER'].includes(role.toUpperCase())) { // Validate against uppercase and convert to uppercase
                    res.status(400).json({ status: 'error', message: 'Invalid role specified' });
                    return;
                }
                const success = await user_model_1.UserModel.updateRole(parseInt(userId, 10), role.toUpperCase()); // Pass uppercase role
                if (success) {
                    res.json({ status: 'success', message: 'User role updated successfully' });
                }
                else {
                    res.status(404).json({ status: 'error', message: 'User not found or role not updated' });
                }
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteUser = async (req, res, next) => {
            try {
                const { userId } = req.params;
                const success = await user_model_1.UserModel.delete(parseInt(userId, 10)); // Assuming UserModel.delete() exists
                if (success) {
                    res.json({ status: 'success', message: 'User deleted successfully' });
                }
                else {
                    res.status(404).json({ status: 'error', message: 'User not found or not deleted' });
                }
            }
            catch (error) {
                next(error);
            }
        };
    }
}
exports.AdminController = AdminController;
