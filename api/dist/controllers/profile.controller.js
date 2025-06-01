"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileController = void 0;
const user_model_1 = require("../models/user.model");
const zod_1 = require("zod");
const profileUpdateSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    email: zod_1.z.string().email().optional()
});
const passwordUpdateSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(6)
});
class ProfileController {
    static async getProfile(req, res, next) {
        try {
            if (!req.user?.id) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }
            const user = await user_model_1.UserModel.findById(req.user.id);
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }
            const { password, ...userProfile } = user;
            res.json({
                status: 'success',
                data: userProfile
            });
            return;
        }
        catch (error) {
            console.error('Error in getProfile:', error);
            next(error);
        }
    }
    static async updateProfile(req, res, next) {
        try {
            if (!req.user?.id) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }
            const validatedData = profileUpdateSchema.parse(req.body);
            // Check if email is being updated and if it already exists
            if (validatedData.email) {
                const existingUser = await user_model_1.UserModel.findByEmail(validatedData.email);
                if (existingUser && existingUser.id !== req.user.id) {
                    res.status(400).json({
                        status: 'error',
                        message: 'Email already exists'
                    });
                    return;
                }
            }
            const updatedUser = await user_model_1.UserModel.updateProfile(req.user.id, validatedData);
            if (!updatedUser) {
                res.status(404).json({
                    status: 'error',
                    message: 'User not found'
                });
                return;
            }
            const { password, ...userProfile } = updatedUser;
            res.json({
                status: 'success',
                message: 'Profile updated successfully',
                data: userProfile
            });
            return;
        }
        catch (error) {
            console.error('Error in updateProfile:', error);
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    status: 'error',
                    message: 'Validation error',
                    errors: error.errors
                });
                return;
            }
            next(error);
        }
    }
    static async updatePassword(req, res, next) {
        try {
            if (!req.user?.id) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }
            const validatedData = passwordUpdateSchema.parse(req.body);
            // Verify current password
            const isCurrentPasswordValid = await user_model_1.UserModel.verifyPassword(req.user.id, validatedData.currentPassword);
            if (!isCurrentPasswordValid) {
                res.status(400).json({
                    status: 'error',
                    message: 'Current password is incorrect'
                });
                return;
            }
            // Update password
            const success = await user_model_1.UserModel.updatePassword(req.user.id, validatedData.newPassword);
            if (!success) {
                res.status(404).json({
                    status: 'error',
                    message: 'User not found'
                });
                return;
            }
            res.json({
                status: 'success',
                message: 'Password updated successfully'
            });
            return;
        }
        catch (error) {
            console.error('Error in updatePassword:', error);
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    status: 'error',
                    message: 'Validation error',
                    errors: error.errors
                });
                return;
            }
            next(error);
        }
    }
}
exports.ProfileController = ProfileController;
