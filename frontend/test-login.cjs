const http = require('http');
async function testLogin(role) {
  const email = role === 'owner' ? 'owner@foodies.com' : 'manager@foodies.com';
  const password = 'password123';
  try {
    const res = await fetch(`http://localhost:3000/api/${role}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, remember_me: false })
    });
    const data = await res.json();
    console.log(`${role} login response status:`, res.status);
    console.log(`${role} login response headers:`, res.headers.get('set-cookie'));
    console.log(`${role} login response data:`, data);
  } catch (e) {
    console.error(`Error testing ${role}:`, e);
  }
}
testLogin('owner').then(() => testLogin('manager'));
