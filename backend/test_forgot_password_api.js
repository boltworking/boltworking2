/** @format */

const axios = require('axios');

// Server configuration
const BASE_URL = 'http://localhost:5000/api';
const SERVER_URL = 'http://localhost:5000';

// Test users (based on the existing users from createAdmin.js)
const TEST_USERS = [
  {
    email: 'admin@dbu.edu.et',
    username: 'dbu10101030',
    type: 'Admin'
  },
  {
    email: 'john.doe@dbu.edu.et', 
    username: 'dbu10304058',
    type: 'Student'
  },
  {
    email: 'clubs@dbu.edu.et',
    username: 'dbu10101040', 
    type: 'Clubs Admin'
  }
];

// Helper functions
const log = {
  success: (msg) => console.log('✅ ' + msg),
  error: (msg) => console.log('❌ ' + msg),
  info: (msg) => console.log('ℹ️  ' + msg),
  warning: (msg) => console.log('⚠️  ' + msg),
  section: (msg) => console.log('\n==== ' + msg + ' ====') 
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test server connectivity
async function testServerConnectivity() {
  log.section('Testing Server Connectivity');
  
  try {
    const response = await axios.get(`${SERVER_URL}/health`, { timeout: 5000 });
    log.success('Server is running and accessible');
    log.info(`Health status: ${response.data.status}`);
    log.info(`Database: ${response.data.database}`);
    return true;
  } catch (error) {
    log.error(`Server not accessible: ${error.message}`);
    log.info('Please ensure the backend server is running on port 5000');
    return false;
  }
}

// Test forgot password request endpoint
async function testForgotPasswordRequest(testUser) {
  log.section(`Testing Forgot Password Request - ${testUser.type}`);
  
  try {
    // Test with email
    log.info(`Requesting password reset for email: ${testUser.email}`);
    const emailResponse = await axios.post(`${BASE_URL}/auth/forgot-password`, {
      email: testUser.email
    });
    
    log.success(`Email request successful: ${emailResponse.status} ${emailResponse.statusText}`);
    log.info(`Response: ${emailResponse.data.message}`);
    
    // Wait a bit before testing username
    await delay(1000);
    
    // Test with username
    log.info(`Requesting password reset for username: ${testUser.username}`);
    const usernameResponse = await axios.post(`${BASE_URL}/auth/forgot-password`, {
      username: testUser.username
    });
    
    log.success(`Username request successful: ${usernameResponse.status} ${usernameResponse.statusText}`);
    log.info(`Response: ${usernameResponse.data.message}`);
    
    return true;
    
  } catch (error) {
    log.error(`Forgot password request failed: ${error.response?.status} ${error.response?.statusText}`);
    if (error.response?.data?.error) {
      log.error(`Error details: ${error.response.data.error}`);
    }
    return false;
  }
}

// Test invalid forgot password requests
async function testInvalidForgotPasswordRequests() {
  log.section('Testing Invalid Forgot Password Requests');
  
  const invalidRequests = [
    { 
      data: { email: 'nonexistent@dbu.edu.et' },
      description: 'Non-existent email'
    },
    { 
      data: { username: 'nonexistentuser' },
      description: 'Non-existent username'
    },
    { 
      data: { email: 'invalid-email' },
      description: 'Invalid email format'
    },
    { 
      data: {},
      description: 'Empty request body'
    },
    { 
      data: { randomField: 'value' },
      description: 'Invalid fields'
    }
  ];
  
  for (const request of invalidRequests) {
    try {
      log.info(`Testing: ${request.description}`);
      const response = await axios.post(`${BASE_URL}/auth/forgot-password`, request.data);
      
      // If we get here, it means the request succeeded when it should have failed
      log.warning(`Unexpected success for ${request.description}: ${response.status}`);
      
    } catch (error) {
      if (error.response?.status >= 400 && error.response?.status < 500) {
        log.success(`Correctly rejected ${request.description}: ${error.response.status} ${error.response.statusText}`);
        if (error.response.data?.error) {
          log.info(`Error message: ${error.response.data.error}`);
        }
      } else {
        log.error(`Unexpected error for ${request.description}: ${error.response?.status || 'No response'}`);
      }
    }
    
    await delay(500); // Brief delay between requests
  }
}

// Test reset password endpoint (this requires a valid token from database)
async function testResetPasswordEndpoint() {
  log.section('Testing Reset Password Endpoint Structure');
  
  try {
    // Test with invalid token to check endpoint structure
    log.info('Testing reset password endpoint with invalid token');
    const response = await axios.post(`${BASE_URL}/auth/reset-password`, {
      token: 'invalid-token-123',
      newPassword: 'NewPassword123#'
    });
    
    log.warning('Reset password endpoint accepted invalid token (unexpected)');
    
  } catch (error) {
    if (error.response?.status === 400 || error.response?.status === 401) {
      log.success(`Reset password endpoint correctly rejects invalid token: ${error.response.status}`);
      if (error.response.data?.error) {
        log.info(`Error message: ${error.response.data.error}`);
      }
    } else {
      log.error(`Unexpected error testing reset password: ${error.response?.status || 'No response'}`);
    }
  }
  
  // Test with missing fields
  const invalidResetRequests = [
    { 
      data: { token: 'some-token' },
      description: 'Missing new password'
    },
    { 
      data: { newPassword: 'NewPassword123#' },
      description: 'Missing token'
    },
    { 
      data: { token: 'some-token', newPassword: '123' },
      description: 'Weak password'
    },
    { 
      data: {},
      description: 'Empty request'
    }
  ];
  
  for (const request of invalidResetRequests) {
    try {
      log.info(`Testing reset password: ${request.description}`);
      const response = await axios.post(`${BASE_URL}/auth/reset-password`, request.data);
      
      log.warning(`Unexpected success for ${request.description}: ${response.status}`);
      
    } catch (error) {
      if (error.response?.status >= 400 && error.response?.status < 500) {
        log.success(`Correctly rejected ${request.description}: ${error.response.status}`);
      } else {
        log.error(`Unexpected error for ${request.description}: ${error.response?.status || 'No response'}`);
      }
    }
    
    await delay(500);
  }
}

// Test rate limiting (if implemented)
async function testRateLimiting() {
  log.section('Testing Rate Limiting (if implemented)');
  
  const testEmail = 'admin@dbu.edu.et';
  const maxRequests = 5;
  
  log.info(`Sending ${maxRequests} rapid requests to test rate limiting`);
  
  for (let i = 1; i <= maxRequests; i++) {
    try {
      const response = await axios.post(`${BASE_URL}/auth/forgot-password`, {
        email: testEmail
      });
      
      log.info(`Request ${i}: ${response.status} ${response.statusText}`);
      
      // Small delay between requests
      await delay(100);
      
    } catch (error) {
      if (error.response?.status === 429) {
        log.success(`Rate limiting activated after ${i-1} requests: ${error.response.status}`);
        break;
      } else {
        log.info(`Request ${i} failed: ${error.response?.status || 'No response'}`);
      }
    }
  }
}

// Test CORS and headers
async function testCorsAndHeaders() {
  log.section('Testing CORS and Headers');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/forgot-password`, {
      email: 'admin@dbu.edu.et'
    }, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json'
      }
    });
    
    log.success('CORS request successful');
    
    // Check response headers
    const corsHeaders = response.headers['access-control-allow-origin'];
    if (corsHeaders) {
      log.success(`CORS headers present: ${corsHeaders}`);
    } else {
      log.warning('CORS headers not found in response');
    }
    
  } catch (error) {
    if (error.response?.status !== 500) {
      log.info(`CORS test completed with status: ${error.response?.status}`);
    } else {
      log.error(`CORS test failed: ${error.message}`);
    }
  }
}

// Main test execution
async function runAllTests() {
  console.log('🧪 FORGOT PASSWORD API TESTING SUITE');
  console.log('Testing forgot password functionality via HTTP endpoints\n');
  
  // Check server connectivity first
  const serverReachable = await testServerConnectivity();
  if (!serverReachable) {
    log.error('Cannot proceed with tests - server not accessible');
    return;
  }
  
  // Test valid forgot password requests for each user type
  for (const user of TEST_USERS) {
    const success = await testForgotPasswordRequest(user);
    if (!success) {
      log.warning(`Skipping remaining tests for ${user.type} due to failure`);
    }
    await delay(1000); // Delay between different user tests
  }
  
  // Test invalid requests
  await testInvalidForgotPasswordRequests();
  await delay(1000);
  
  // Test reset password endpoint
  await testResetPasswordEndpoint();
  await delay(1000);
  
  // Test rate limiting
  await testRateLimiting();
  await delay(1000);
  
  // Test CORS and headers
  await testCorsAndHeaders();
  
  log.section('Test Suite Complete');
  log.info('Review the results above to verify forgot password API functionality');
  log.info('For complete testing, manually verify:');
  log.info('1. Emails are being sent (check server logs)');
  log.info('2. Password reset tokens work end-to-end');
  log.info('3. Database is properly updated');
}

// Handle script execution
if (require.main === module) {
  runAllTests().catch(error => {
    log.error(`Test suite failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testForgotPasswordRequest,
  testInvalidForgotPasswordRequests,
  testResetPasswordEndpoint,
  testServerConnectivity
};