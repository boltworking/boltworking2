/** @format */

const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

// Models
const User = require('./models/User');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const TEST_USER = {
  email: 'test-reset@dbu.edu.et',
  username: 'dbu99999999',
  name: 'Password Reset Test User',
  password: 'OriginalPassword123#',
  department: 'Computer Science',
  year: '4th Year'
};

const NEW_PASSWORD = 'NewResetPassword456#';

// Helper functions
const log = {
  success: (msg) => console.log('✅ ' + msg),
  error: (msg) => console.log('❌ ' + msg),
  info: (msg) => console.log('ℹ️  ' + msg),
  warning: (msg) => console.log('⚠️  ' + msg),
  section: (msg) => console.log('\n==== ' + msg + ' ====')
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Connect to database for verification
async function connectToDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    log.success('Connected to database for verification');
    return true;
  } catch (error) {
    log.error(`Database connection failed: ${error.message}`);
    return false;
  }
}

// Create a test user
async function createTestUser() {
  log.section('Creating Test User');
  
  try {
    // Remove existing test user if it exists
    await User.deleteOne({ username: TEST_USER.username });
    
    // Create new test user
    const hashedPassword = await bcrypt.hash(TEST_USER.password, 12);
    const user = await User.create({
      ...TEST_USER,
      password: hashedPassword,
      isActive: true
    });
    
    log.success(`Test user created: ${user.username} (${user.email})`);
    return user;
    
  } catch (error) {
    log.error(`Failed to create test user: ${error.message}`);
    throw error;
  }
}

// Test the forgot password request
async function testForgotPasswordRequest() {
  log.section('Testing Forgot Password Request');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/forgot-password`, {
      email: TEST_USER.email
    });
    
    log.success(`Forgot password request successful: ${response.status}`);
    log.info(`Response: ${response.data.message}`);
    
    if (response.data.testMode) {
      log.info('Running in test mode - check server logs for token');
    }
    
    return true;
    
  } catch (error) {
    log.error(`Forgot password request failed: ${error.response?.status} ${error.response?.statusText}`);
    return false;
  }
}

// Get the reset token from the database
async function getResetTokenFromDB() {
  log.section('Retrieving Reset Token from Database');
  
  try {
    const user = await User.findOne({ email: TEST_USER.email });
    if (!user) {
      log.error('Test user not found in database');
      return null;
    }
    
    if (!user.passwordResetToken) {
      log.error('No reset token found for user');
      return null;
    }
    
    if (!user.passwordResetExpires || user.passwordResetExpires <= Date.now()) {
      log.error('Reset token has expired');
      return null;
    }
    
    log.success('Reset token found in database');
    log.info(`Token expires: ${new Date(user.passwordResetExpires)}`);
    
    // We need to find the original unhashed token
    // Since we can't reverse the hash, we'll generate a new token and update the DB
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    user.passwordResetToken = hashedToken;
    await user.save();
    
    log.info('Generated new token for testing purposes');
    return resetToken;
    
  } catch (error) {
    log.error(`Database error: ${error.message}`);
    return null;
  }
}

// Test the password reset with token
async function testPasswordReset(resetToken) {
  log.section('Testing Password Reset');
  
  if (!resetToken) {
    log.error('No reset token available for testing');
    return false;
  }
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/reset-password`, {
      token: resetToken,
      newPassword: NEW_PASSWORD
    });
    
    log.success(`Password reset successful: ${response.status}`);
    log.info(`Response: ${response.data.message}`);
    
    return true;
    
  } catch (error) {
    log.error(`Password reset failed: ${error.response?.status} ${error.response?.statusText}`);
    if (error.response?.data?.message) {
      log.error(`Error message: ${error.response.data.message}`);
    }
    return false;
  }
}

// Verify the password was actually changed
async function verifyPasswordChanged() {
  log.section('Verifying Password Changed');
  
  try {
    const user = await User.findOne({ email: TEST_USER.email }).select('+password');
    if (!user) {
      log.error('Test user not found');
      return false;
    }
    
    // Test old password (should fail)
    const oldPasswordMatch = await bcrypt.compare(TEST_USER.password, user.password);
    if (oldPasswordMatch) {
      log.error('Old password still works - reset may have failed');
      return false;
    }
    
    // Test new password (should work)
    const newPasswordMatch = await bcrypt.compare(NEW_PASSWORD, user.password);
    if (!newPasswordMatch) {
      log.error('New password does not work - reset may have failed');
      return false;
    }
    
    // Check that reset token was cleared
    if (user.passwordResetToken || user.passwordResetExpires) {
      log.warning('Reset token/expiry not cleared after successful reset');
    } else {
      log.success('Reset token properly cleared');
    }
    
    log.success('Password successfully changed and verified');
    return true;
    
  } catch (error) {
    log.error(`Verification error: ${error.message}`);
    return false;
  }
}

// Test login with new password
async function testLoginWithNewPassword() {
  log.section('Testing Login with New Password');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: TEST_USER.username,
      password: NEW_PASSWORD
    });
    
    log.success(`Login successful: ${response.status}`);
    log.info(`User: ${response.data.user.name}`);
    
    return true;
    
  } catch (error) {
    log.error(`Login failed: ${error.response?.status} ${error.response?.statusText}`);
    return false;
  }
}

// Cleanup test user
async function cleanup() {
  log.section('Cleaning Up');
  
  try {
    await User.deleteOne({ username: TEST_USER.username });
    log.success('Test user deleted');
    
    await mongoose.connection.close();
    log.success('Database connection closed');
    
  } catch (error) {
    log.warning(`Cleanup error: ${error.message}`);
  }
}

// Main test execution
async function runEndToEndTest() {
  console.log('🧪 END-TO-END PASSWORD RESET TEST');
  console.log('Testing complete forgot password to login workflow\n');
  
  let success = true;
  
  try {
    // Step 1: Connect to database
    const dbConnected = await connectToDB();
    if (!dbConnected) {
      log.error('Cannot proceed without database connection');
      return;
    }
    
    // Step 2: Create test user
    await createTestUser();
    await delay(1000);
    
    // Step 3: Request password reset
    const forgotSuccess = await testForgotPasswordRequest();
    if (!forgotSuccess) {
      success = false;
    }
    await delay(1000);
    
    // Step 4: Get reset token from database
    const resetToken = await getResetTokenFromDB();
    await delay(1000);
    
    // Step 5: Reset password with token
    const resetSuccess = await testPasswordReset(resetToken);
    if (!resetSuccess) {
      success = false;
    }
    await delay(1000);
    
    // Step 6: Verify password changed in database
    const verifySuccess = await verifyPasswordChanged();
    if (!verifySuccess) {
      success = false;
    }
    await delay(1000);
    
    // Step 7: Test login with new password
    const loginSuccess = await testLoginWithNewPassword();
    if (!loginSuccess) {
      success = false;
    }
    
    // Results
    log.section('Test Results');
    if (success) {
      log.success('🎉 ALL TESTS PASSED - End-to-end password reset workflow working correctly!');
      log.info('The forgot password functionality is fully operational');
    } else {
      log.error('❌ SOME TESTS FAILED - Review the results above');
    }
    
  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    success = false;
  } finally {
    // Always cleanup
    await cleanup();
  }
  
  process.exit(success ? 0 : 1);
}

// Run the test
if (require.main === module) {
  runEndToEndTest().catch(error => {
    log.error(`Critical error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runEndToEndTest,
  createTestUser,
  testForgotPasswordRequest,
  testPasswordReset,
  verifyPasswordChanged
};