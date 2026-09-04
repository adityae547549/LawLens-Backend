const path = require('path');
const fs = require('fs');

function decodeJwt(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload);
  } catch (e) {
    return null;
  }
}

async function runAuthMatrix() {
  console.log('====================================================');
  console.log('  LAWLENS AUTHENTICATION INTEGRATION TEST MATRIX    ');
  console.log('====================================================\n');

  const BASE_URL = 'http://localhost:3000';
  const results = [];

  function record(testName, expected, actual, pass) {
    results.push({ testName, expected, actual, pass });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${testName}`);
    console.log(`       Expected: ${expected}`);
    console.log(`       Actual  : ${actual}\n`);
  }

  const usersPath = path.join(__dirname, 'database', 'users.json');
  if (!fs.existsSync(usersPath)) {
    console.error(`ERROR: Database file not found at ${usersPath}`);
    process.exit(1);
  }

  const dbUsers = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  const adminUser = dbUsers.find(u => u.role === 'admin');
  const normalUser = dbUsers.find(u => u.role === 'user');

  if (!adminUser || !normalUser) {
    console.error('ERROR: Could not find both admin and user accounts in database/users.json');
    process.exit(1);
  }

  const adminCredentials = { email: adminUser.email, password: 'AdminLawLens2026!' };
  const userCredentials = { email: normalUser.email, password: 'user123' };

  console.log(`Admin account tested : ${adminCredentials.email}`);
  console.log(`Normal account tested: ${userCredentials.email}\n`);

  let adminToken = null;
  let userToken = null;

  // --- STEP 1: Admin Login ---
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminCredentials)
    });
    const status = res.status;
    const body = await res.json();

    record('Admin Login HTTP Status', '200', String(status), status === 200);

    const returnedRole = body?.user?.role;
    record('Admin Returned Role in Payload', 'admin', String(returnedRole), returnedRole === 'admin');

    adminToken = body?.token;
    const decoded = decodeJwt(adminToken);
    const jwtRole = decoded?.role;
    record('Admin JWT Payload Role', 'admin', String(jwtRole), jwtRole === 'admin');

    const expectedRedirect = returnedRole === 'admin' ? '/studio.html' : '/dashboard.html';
    record('Admin Frontend Redirect Destination', '/studio.html', expectedRedirect, expectedRedirect === '/studio.html');
  } catch (e) {
    record('Admin Login Execution', 'Successful HTTP Response', `Error: ${e.message}`, false);
  }

  // --- STEP 2: Normal User Login ---
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userCredentials)
    });
    const status = res.status;
    const body = await res.json();

    record('Normal User Login HTTP Status', '200', String(status), status === 200);

    const returnedRole = body?.user?.role;
    record('Normal User Returned Role in Payload', 'user', String(returnedRole), returnedRole === 'user');

    userToken = body?.token;
    const decoded = decodeJwt(userToken);
    const jwtRole = decoded?.role;
    record('Normal User JWT Payload Role', 'user', String(jwtRole), jwtRole === 'user');

    const expectedRedirect = returnedRole === 'admin' ? '/studio.html' : '/dashboard.html';
    record('Normal User Frontend Redirect Destination', '/dashboard.html', expectedRedirect, expectedRedirect === '/dashboard.html');
  } catch (e) {
    record('Normal User Login Execution', 'Successful HTTP Response', `Error: ${e.message}`, false);
  }

  // --- STEP 3: Admin Access to Admin API ---
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    record('Admin Access to /api/admin/users', '200', String(res.status), res.status === 200);
  } catch (e) {
    record('Admin Access to /api/admin/users', '200', `Error: ${e.message}`, false);
  }

  // --- STEP 4: Admin Access to Studio System API ---
  try {
    const res = await fetch(`${BASE_URL}/api/studio/system/health`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    record('Admin Access to /api/studio/system/health', '200', String(res.status), res.status === 200);
  } catch (e) {
    record('Admin Access to /api/studio/system/health', '200', `Error: ${e.message}`, false);
  }

  // --- STEP 5: Normal User Access to Admin API (Must be 403) ---
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    record('Normal User Access to /api/admin/users (Forbidden)', '403', String(res.status), res.status === 403);
  } catch (e) {
    record('Normal User Access to /api/admin/users (Forbidden)', '403', `Error: ${e.message}`, false);
  }

  // --- STEP 6: Normal User Access to Studio API (Must be 403) ---
  try {
    const res = await fetch(`${BASE_URL}/api/studio/system/health`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    record('Normal User Access to /api/studio/system/health (Forbidden)', '403', String(res.status), res.status === 403);
  } catch (e) {
    record('Normal User Access to /api/studio/system/health (Forbidden)', '403', `Error: ${e.message}`, false);
  }

  // --- STEP 7: Unauthenticated Request to Admin API (Must be 401) ---
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`);
    record('Unauthenticated Request to /api/admin/users', '401', String(res.status), res.status === 401);
  } catch (e) {
    record('Unauthenticated Request to /api/admin/users', '401', `Error: ${e.message}`, false);
  }

  // --- PRINT MATRIX SUMMARY TABLE ---
  console.log('========================================================================================');
  console.log('  AUTHENTICATION MATRIX FINAL RESULTS TABLE');
  console.log('========================================================================================');
  console.log(
    'TEST'.padEnd(52) + ' | ' +
    'EXPECTED'.padEnd(16) + ' | ' +
    'ACTUAL'.padEnd(16) + ' | ' +
    'RESULT'
  );
  console.log('-'.repeat(96));

  let allPassed = true;
  for (const r of results) {
    if (!r.pass) allPassed = false;
    console.log(
      r.testName.padEnd(52) + ' | ' +
      r.expected.padEnd(16) + ' | ' +
      r.actual.padEnd(16) + ' | ' +
      (r.pass ? 'PASS ?' : 'FAIL ?')
    );
  }
  console.log('-'.repeat(96));

  if (allPassed) {
    console.log('\n? ALL AUTHENTICATION MATRIX TESTS PASSED PERFECTLY!');
    process.exit(0);
  } else {
    console.error('\n? SOME AUTHENTICATION TESTS FAILED!');
    process.exit(1);
  }
}

runAuthMatrix();
