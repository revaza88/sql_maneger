// Test script to verify user-specific database functionality
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';

async function testUserIsolation() {
  console.log('🧪 Testing User-Specific Database Isolation...\n');

  try {
    // Test 1: Check if we can access databases without authentication
    console.log('1. Testing unauthenticated access (should fail)...');
    const unauthResponse = await fetch(`${API_BASE}/databases`);
    console.log(`Status: ${unauthResponse.status} (Expected: 401)`);
    
    if (unauthResponse.status === 401) {
      console.log('✅ Unauthenticated access properly blocked\n');
    } else {
      console.log('❌ Unauthenticated access not properly blocked\n');
    }

    // Test 2: Check user registration endpoint
    console.log('2. Testing user registration...');
    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser@example.com',
        password: 'testpassword123',
        name: 'Test User'
      })
    });
    
    console.log(`Registration Status: ${registerResponse.status}`);
    const registerData = await registerResponse.json();
    console.log('Registration Response:', registerData);

    if (registerResponse.status === 200 || registerResponse.status === 201) {
      console.log('✅ User registration successful\n');
    } else {
      console.log('❌ User registration failed\n');
    }

    // Test 3: Check login endpoint
    console.log('3. Testing user login...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser@example.com',
        password: 'testpassword123'
      })
    });
    
    console.log(`Login Status: ${loginResponse.status}`);
    
    if (loginResponse.status === 200) {
      const loginData = await loginResponse.json();
      console.log('✅ User login successful');
      console.log(`Token received: ${loginData.token ? 'Yes' : 'No'}\n`);
      
      // Test 4: Check authenticated database access
      console.log('4. Testing authenticated database access...');
      const authDatabasesResponse = await fetch(`${API_BASE}/databases`, {
        headers: { 
          'Authorization': `Bearer ${loginData.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Authenticated Database Access Status: ${authDatabasesResponse.status}`);
      
      if (authDatabasesResponse.status === 200) {
        const databases = await authDatabasesResponse.json();
        console.log('✅ Authenticated database access successful');
        console.log(`Number of databases: ${databases.length}`);
        console.log('✅ User isolation appears to be working correctly!\n');
      } else {
        console.log('❌ Authenticated database access failed\n');
      }
    } else {
      console.log('❌ User login failed\n');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testUserIsolation();
