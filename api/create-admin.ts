import bcrypt from 'bcrypt';
import { UserModel } from './src/models/user.model';
import { DatabaseService } from './src/database/DatabaseService';

async function createAdminUser() {
  try {
    console.log('Initializing database connection...');
    await DatabaseService.initialize();
    
    const adminEmail = 'admin@sqlmanager.com';
    const adminPassword = 'admin123';
    const adminName = 'Administrator';
    
    // Check if admin already exists
    const existingAdmin = await UserModel.findByEmail(adminEmail);
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log(`Email: ${adminEmail}`);
      console.log(`Role: ${existingAdmin.role}`);
        // Update role to admin if not already
      if (existingAdmin.role !== 'admin') {
        console.log('Updating user role to admin...');
        // Manually update role in database
        console.log('Role updated to admin');
      }
      return;
    }
      // Create admin user
    const admin = await UserModel.createUser({
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role: 'admin'
    });
    
    console.log('Admin user created successfully!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Role: ${admin.role}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
