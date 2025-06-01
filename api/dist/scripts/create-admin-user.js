"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_model_1 = require("../models/user.model");
const connection_1 = require("../database/connection");
async function createAdminUser() {
    const adminEmail = 'admin@test.com';
    const adminPassword = 'admin123';
    const adminName = 'Test Admin';
    console.log(`Creating admin user: ${adminEmail}...`);
    try {
        // Ensure the database is connected
        await (0, connection_1.ensureConnected)();
        console.log('Database connection ensured.');
        // Check if user already exists
        const existingUser = await user_model_1.UserModel.findByEmail(adminEmail);
        if (existingUser) {
            console.log(`User ${adminEmail} already exists with ID: ${existingUser.id}`); // Check if they're already an admin
            if (existingUser.role === 'admin') {
                console.log(`User ${adminEmail} is already an admin.`);
                return;
            }
            else {
                // Update role to admin
                const success = await user_model_1.UserModel.updateRole(existingUser.id, 'ADMIN');
                if (success) {
                    console.log(`Successfully updated ${adminEmail} role to admin.`);
                }
                else {
                    console.error(`Failed to update role for ${adminEmail}.`);
                }
                return;
            }
        } // Create new admin user
        const newUser = await user_model_1.UserModel.createUser({
            email: adminEmail,
            password: adminPassword,
            name: adminName,
            role: 'admin' // Using 'admin' to match UserCreate interface, but will store as uppercase in DB
        });
        console.log(`Successfully created admin user: ${adminEmail} with ID: ${newUser.id}`);
        console.log('Admin credentials:');
        console.log('Email:', adminEmail);
        console.log('Password:', adminPassword);
    }
    catch (error) {
        console.error('Error creating admin user:', error);
    }
    finally {
        console.log('Script finished.');
    }
}
createAdminUser();
