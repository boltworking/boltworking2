const axios = require('axios');

async function testForgotPassword() {
  try {
    console.log('Testing forgot password endpoint...');
    
    const response = await axios.post('http://localhost:5000/api/auth/forgot-password', {
      email: 'admin@dbu.edu.et'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success:', response.status, response.data);
    
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.statusText);
    console.log('Error details:', error.response?.data);
    console.log('Full error:', error.message);
  }
}

testForgotPassword();