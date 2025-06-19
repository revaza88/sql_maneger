import { UserModel } from './src/models/user.model';

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    const adminEmail = 'admin@sqlmanager.com';
    const adminPassword = 'admin123';
    const adminName = 'Administrator';
    
    // Check if admin already exists
    try {
      const existingAdmin = await UserModel.findByEmail(adminEmail);
      if (existingAdmin) {
        console.log('Admin user already exists!');
        console.log(`Email: ${adminEmail}`);
        console.log(`Role: ${existingAdmin.role}`);
        console.log('You can login with these credentials.');
        return;
      }
    } catch (error) {
      console.log('Admin user does not exist, creating...');
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
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdminUser();
