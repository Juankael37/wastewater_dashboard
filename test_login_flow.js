// Test script to simulate frontend login flow
const fetch = require('node-fetch');
const FormData = require('form-data');

async function testLogin() {
  console.log('Testing login flow...\n');
  
  // Simulate what the frontend does
  const url = 'http://localhost:5000/login';
  const formData = new FormData();
  formData.append('username', 'admin');
  formData.append('password', 'admin123');
  
  const headers = {
    'X-Requested-With': 'XMLHttpRequest',
    // Note: FormData sets its own Content-Type with boundary
  };
  
  console.log('Sending POST request to /login with FormData...');
  console.log('Headers:', headers);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: headers,
      credentials: 'include', // Include cookies
      redirect: 'manual' // Don't follow redirects
    });
    
    console.log('\nResponse Status:', response.status, response.statusText);
    console.log('Response Headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    const responseText = await response.text();
    console.log('\nResponse Body:', responseText);
    
    // Try to parse as JSON
    try {
      const jsonResponse = JSON.parse(responseText);
      console.log('\nParsed JSON:', jsonResponse);
      
      // Check if this matches what authApi.login expects
      console.log('\nChecking response structure:');
      console.log('  Has success property?', 'success' in jsonResponse);
      console.log('  Has message property?', 'message' in jsonResponse);
      console.log('  Has username property?', 'username' in jsonResponse);
      console.log('  success value:', jsonResponse.success);
      
      if (jsonResponse.success) {
        console.log('\n✓ Login should be successful according to response');
      } else {
        console.log('\n✗ Login failed according to response');
      }
    } catch (e) {
      console.log('\nResponse is not valid JSON');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();