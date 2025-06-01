"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profile_controller_1 = require("../controllers/profile.controller");
const auth_1 = require("../middleware/auth");
const profileRouter = (0, express_1.Router)();
// Define a wrapper for async route handlers to ensure correct error handling and type compatibility
const asyncHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    }
    catch (err) {
        next(err);
    }
};
// Profile routes with authentication
profileRouter.get('/', auth_1.authenticate, asyncHandler(profile_controller_1.ProfileController.getProfile));
profileRouter.put('/', auth_1.authenticate, asyncHandler(profile_controller_1.ProfileController.updateProfile));
profileRouter.put('/password', auth_1.authenticate, asyncHandler(profile_controller_1.ProfileController.updatePassword));
exports.default = profileRouter;
