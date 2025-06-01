// filepath: c:\WWW\sqlmanager V2\api\src\scripts\set-admin.ts
import { UserModel } from '../models/user.model';
import { ensureConnected, pool } from '../database/connection'; // Import ensureConnected

async function grantAdminRights() {
  const emailToMakeAdmin = 'revazkvlividze@gmail.com';
  console.log(`Attempting to grant ADMIN rights to ${emailToMakeAdmin}...`);

  try {
    // Ensure the database is connected
    await ensureConnected();
    console.log('Database connection ensured.');

    const user = await UserModel.findByEmail(emailToMakeAdmin);

    if (!user) {
      console.error(`User with email ${emailToMakeAdmin} not found.`);
      return;
    }

    // Convert to uppercase for comparison and for updating
    const currentRole = user.role?.toUpperCase(); 

    if (currentRole === 'ADMIN') {
      console.log(`User ${emailToMakeAdmin} is already an ADMIN.`);
      return;
    }

    // UserModel.updateRole expects a number for id
    const success = await UserModel.updateRole(user.id as number, 'ADMIN');

    if (success) {
      console.log(`Successfully granted ADMIN rights to ${emailToMakeAdmin} (ID: ${user.id}).`);
    } else {
      console.error(`Failed to update role for ${emailToMakeAdmin} (ID: ${user.id}). Check UserModel.updateRole implementation and database logs.`);
    }
  } catch (error) {
    console.error('Error granting admin rights:', error);
  } finally {
    console.log('Script finished. Database connection state managed by application.');
    // Close the pool if this script initiated the connection and no other operations are pending.
    // This is tricky with a shared pool; for a standalone script, dedicated connection management is safer.
    // Given ensureConnected, the pool might be used by other parts of the app if it was already connected.
    // For now, let's assume the main application will handle the pool lifecycle or that this script is run when the app is not heavily using the DB.
    // if (pool && pool.connected) {
    //   await pool.close();
    //   console.log('Database pool closed by script.');
    // }
  }
}

grantAdminRights();
