const fetch = require('node-fetch').default;

const API_BASE = 'http://localhost:3001/api';

async function testDatabaseSecurity() {
  console.log('🔒 Testing Database Security Implementation...\n');

  try {
    // Step 1: Create a new test user
    console.log('1. Creating test user...');
    const registerRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'security.test@demo.com',
        password: 'password123',
        name: 'Security Test'
      })
    });

    const registerData = await registerRes.json();
    console.log('   ✅ User created:', registerData.user?.email);

    // Step 2: Login to get token
    console.log('\n2. Logging in...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'security.test@demo.com',
        password: 'password123'
      })
    });

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('   ✅ Login successful');

    // Step 3: Test database listing WITHOUT SQL Server user (should be empty)
    console.log('\n3. Testing database access WITHOUT SQL Server user...');
    const dbListRes = await fetch(`${API_BASE}/sqlserver/databases`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const dbListData = await dbListRes.json();
    console.log('   📊 Database count:', dbListData.databases?.length || 0);
    console.log('   📋 Databases:', dbListData.databases || []);
    
    if (dbListData.databases?.length === 0) {
      console.log('   ✅ SECURITY TEST PASSED: No databases shown without SQL Server user');
    } else {
      console.log('   ❌ SECURITY TEST FAILED: Databases visible without SQL Server user');
    }

    // Step 4: Create SQL Server user
    console.log('\n4. Creating SQL Server user...');
    const createSqlUserRes = await fetch(`${API_BASE}/sqlserver/create-user`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const createSqlUserData = await createSqlUserRes.json();
    console.log('   ✅ SQL Server user created:', createSqlUserData.username);

    // Step 5: Test database listing WITH SQL Server user (should show filtered list)
    console.log('\n5. Testing database access WITH SQL Server user...');
    const dbListRes2 = await fetch(`${API_BASE}/sqlserver/databases`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const dbListData2 = await dbListRes2.json();
    console.log('   📊 Database count:', dbListData2.databases?.length || 0);
    console.log('   📋 Databases:', dbListData2.databases || []);
    console.log('   🔑 Has credentials:', dbListData2.hasCredentials);

    if (dbListData2.hasCredentials) {
      console.log('   ✅ CREDENTIALS TEST PASSED: User has SQL Server credentials');
    } else {
      console.log('   ❌ CREDENTIALS TEST FAILED: User should have SQL Server credentials');
    }

    console.log('\n🎉 Database security test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Install node-fetch if not available
try {
  require('node-fetch');
  testDatabaseSecurity();
} catch (e) {
  console.log('Installing node-fetch...');
  require('child_process').exec('npm install node-fetch@2', (err) => {
    if (err) {
      console.error('Failed to install node-fetch:', err.message);
    } else {
      console.log('node-fetch installed, running test...');
      testDatabaseSecurity();
    }
  });
}
