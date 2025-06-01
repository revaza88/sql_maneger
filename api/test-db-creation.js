/**
 * Test script to verify database creation with user credentials
 */

const API_BASE = 'http://localhost:3001/api';

// Use node-fetch 2.x compatible syntax
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testDatabaseCreation() {
  try {
    console.log('🧪 Testing Database Creation with User Credentials...\n');

    // Test with existing users
    const testUsers = [
      { email: 'testuser@example.com', password: 'password123' },
      { email: 'testuser2@example.com', password: 'password123' }
    ];

    for (const user of testUsers) {
      console.log(`\n📝 Testing with user: ${user.email}`);

      // Login to get token
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });

      if (!loginResponse.ok) {
        console.log(`❌ Login failed for ${user.email}`);
        continue;
      }

      const loginData = await loginResponse.json();
      const token = loginData.token;
      console.log(`✅ Login successful for ${user.email}`);

      // Check SQL Server credentials
      const credentialsResponse = await fetch(`${API_BASE}/sqlserver/credentials`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (credentialsResponse.ok) {
        const creds = await credentialsResponse.json();
        console.log(`📋 SQL Server username: ${creds.username}`);
      } else {
        console.log(`❌ No SQL Server credentials found for ${user.email}`);
        continue;
      }

      // Try to create a test database
      const dbName = `test_db_${user.email.split('@')[0]}_${Date.now()}`;
      console.log(`📊 Attempting to create database: ${dbName}`);

      const createDbResponse = await fetch(`${API_BASE}/databases`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: dbName,
          collation: 'SQL_Latin1_General_CP1_CI_AS'
        })
      });

      if (createDbResponse.ok) {
        const result = await createDbResponse.json();
        console.log(`✅ Database created successfully: ${result.message}`);

        // List databases to verify
        const listResponse = await fetch(`${API_BASE}/databases/list`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (listResponse.ok) {
          const databases = await listResponse.json();
          console.log(`📋 User now has ${databases.data.length} database(s)`);
          databases.data.forEach(db => console.log(`   - ${db.name}`));
        }
      } else {
        const error = await createDbResponse.json();
        console.log(`❌ Database creation failed: ${error.message}`);
        console.log(`   Details: ${error.details || 'No details available'}`);
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Check if servers are running
async function checkServers() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (response.ok) {
      console.log('✅ API server is running');
      return true;
    }
  } catch (error) {
    console.log('❌ API server is not responding');
    return false;
  }
}

async function main() {
  console.log('🔍 Checking servers...');
  const serverRunning = await checkServers();
  
  if (!serverRunning) {
    console.log('⚠️  Please start the API server first: npm run dev');
    return;
  }

  await testDatabaseCreation();
}

main().catch(console.error);
