import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';

dotenv.config();

const API_URL = 'http://localhost:5000/api/auth';

async function runTests() {
  console.log('\n=============================================');
  console.log('  STARTING AUTH SYSTEM END-TO-END TEST');
  console.log('=============================================\n');

  // Short delay to ensure server has finished initialization if run in parallel
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const testUser = {
    name: 'Auth Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'securePassword123!',
  };

  let accessToken = '';
  let cookies = [];

  try {
    // 1. Register User
    console.log('1. Testing POST /api/auth/register...');
    const regRes = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    
    const regData = await regRes.json();
    if (regRes.status !== 201) {
      throw new Error(`Register failed (Status ${regRes.status}): ${JSON.stringify(regData)}`);
    }
    console.log('   ✅ Registration successful! Created user ID:', regData.user.id);
    
    // Save set-cookie headers
    const rawCookies = regRes.headers.get('set-cookie');
    if (rawCookies) {
      cookies.push(rawCookies);
    }

    // 2. Login User
    console.log('\n2. Testing POST /api/auth/login...');
    const loginRes = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: testUser.password }),
    });
    
    const loginData = await loginRes.json();
    if (loginRes.status !== 200) {
      throw new Error(`Login failed (Status ${loginRes.status}): ${JSON.stringify(loginData)}`);
    }
    console.log('   ✅ Login successful! Generated AccessToken.');
    accessToken = loginData.accessToken;

    const loginCookies = loginRes.headers.get('set-cookie');
    if (loginCookies) {
      cookies = [loginCookies]; // use cookies from login
    }

    // 3. Access Protected Route (GET /me)
    console.log('\n3. Testing GET /api/auth/me (Protected Route with valid header)...');
    const meRes = await fetch(`${API_URL}/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    const meData = await meRes.json();
    if (meRes.status !== 200) {
      throw new Error(`Accessing /me failed (Status ${meRes.status}): ${JSON.stringify(meData)}`);
    }
    console.log(`   ✅ Authorized access successful! Logged in as: ${meData.user.name}`);

    // 4. Access Protected Route without token
    console.log('\n4. Testing GET /api/auth/me (Protected Route without header)...');
    const failRes = await fetch(`${API_URL}/me`, { method: 'GET' });
    if (failRes.status === 401) {
      console.log('   ✅ Correctly blocked unauthorized request with 401 status.');
    } else {
      throw new Error(`Unauthorized request was not blocked. Status: ${failRes.status}`);
    }

    // 5. Test Refresh Token
    console.log('\n5. Testing POST /api/auth/refresh-token (Cookie-based auth)...');
    const refreshHeaders = {};
    if (cookies.length > 0) {
      // Parse cookie string to send back
      refreshHeaders['Cookie'] = cookies.map(c => c.split(';')[0]).join('; ');
    }
    
    const refreshRes = await fetch(`${API_URL}/refresh-token`, {
      method: 'POST',
      headers: refreshHeaders,
    });
    
    const refreshData = await refreshRes.json();
    if (refreshRes.status !== 200) {
      throw new Error(`Refresh token failed (Status ${refreshRes.status}): ${JSON.stringify(refreshData)}`);
    }
    console.log('   ✅ Refresh token rotating successful! New AccessToken generated.');
    accessToken = refreshData.accessToken;

    // 6. Test Logout
    console.log('\n6. Testing POST /api/auth/logout...');
    const logoutRes = await fetch(`${API_URL}/logout`, {
      method: 'POST',
      headers: refreshHeaders,
    });
    
    const logoutData = await logoutRes.json();
    if (logoutRes.status !== 200) {
      throw new Error(`Logout failed (Status ${logoutRes.status}): ${JSON.stringify(logoutData)}`);
    }
    console.log('   ✅ Logout successful! Cookie cleared.');

    // 7. Cleanup database
    console.log('\n7. Cleaning up test user from MongoDB database...');
    const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-interview-simulator';
    await mongoose.connect(dbUri);
    const deleteResult = await User.deleteOne({ email: testUser.email });
    console.log(`   ✅ DB Cleanup result: Deleted ${deleteResult.deletedCount} user(s).`);
    await mongoose.disconnect();

    console.log('\n=============================================');
    console.log('  SUCCESS: ALL AUTH SYSTEM TESTS PASSED!');
    console.log('=============================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FAILURE: Test script failed:', error.message);
    
    // Attempt cleanup
    try {
      const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-interview-simulator';
      await mongoose.connect(dbUri);
      await User.deleteOne({ email: testUser.email });
      await mongoose.disconnect();
      console.log('   Database cleanup completed post-failure.');
    } catch (e) {
      console.error('   Could not clean up DB post-failure:', e.message);
    }
    process.exit(1);
  }
}

runTests();
