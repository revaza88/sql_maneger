import { UserModel } from '../models/user.model';
import { ensureConnected } from '../database/connection';

async function createAdminUser() {
  const adminEmail = 'admin@test.com';
  const adminPassword = 'admin123';
  const adminName = 'Test Admin';
  
  console.log(`Creating admin user: ${adminEmail}...`);

  try {
    // Ensure the database is connected
    await ensureConnected();
    console.log('Database connection ensured.');

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(adminEmail);
    
    if (existingUser) {
      console.log(`User ${adminEmail} already exists with ID: ${existingUser.id}`);      // Check if they're already an admin
      if (existingUser.role === 'admin') {
        console.log(`User ${adminEmail} is already an admin.`);
        return;
      } else {
        // Update role to admin
        const success = await UserModel.updateRole(existingUser.id as number, 'ADMIN');
        if (success) {
          console.log(`Successfully updated ${adminEmail} role to admin.`);
        } else {
          console.error(`Failed to update role for ${adminEmail}.`);
        }
        return;
      }
    }    // Create new admin user
    const newUser = await UserModel.createUser({
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role: 'admin' as any // Using 'admin' to match UserCreate interface, but will store as uppercase in DB
    });

    console.log(`Successfully created admin user: ${adminEmail} with ID: ${newUser.id}`);
    console.log('Admin credentials:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    console.log('Script finished.');
  }
}

createAdminUser();
