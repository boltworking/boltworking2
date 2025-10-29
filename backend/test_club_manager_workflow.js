/** @format */

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// Models
const User = require('./models/User');
const Club = require('./models/Club');

// Configuration
const BASE_URL = 'http://localhost:5000/api';

// Test data
const SUPER_ADMIN = {
  username: 'dbu10101030',  // Existing super admin
  password: 'Admin123#'
};

const TEST_CLUB = {
  name: 'Test Programming Club',
  description: 'A test club for programming enthusiasts',
  category: 'Technology',
  founded: '2024',
  contactEmail: 'programming@test.dbu.edu.et',
  meetingSchedule: 'Every Friday at 3 PM',
  requirements: 'Basic programming knowledge',
  // Club manager details
  clubManagerName: 'John Manager',
  clubManagerUsername: 'dbu10178844',
  clubManagerPassword: 'ADMin124#',
  clubManagerEmail: 'john.manager@dbu.edu.et',
  clubManagerPhone: '+251911234567'
};

// Helper functions
const log = {
  success: (msg) => console.log('✅ ' + msg),
  error: (msg) => console.log('❌ ' + msg),
  info: (msg) => console.log('ℹ️  ' + msg),
  warning: (msg) => console.log('⚠️  ' + msg),
  section: (msg) => console.log('\n==== ' + msg + ' ====')
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let superAdminToken = null;
let clubManagerToken = null;
let createdClub = null;

// Connect to database for cleanup
async function connectToDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    log.success('Connected to database');
    return true;
  } catch (error) {
    log.error(`Database connection failed: ${error.message}`);
    return false;
  }
}

// Cleanup test data
async function cleanup() {
  log.section('Cleaning Up Test Data');
  
  try {
    // Remove test club manager
    await User.deleteOne({ username: TEST_CLUB.clubManagerUsername });
    log.success('Test club manager removed');
    
    // Remove test club
    await Club.deleteOne({ name: TEST_CLUB.name });
    log.success('Test club removed');
    
    await mongoose.connection.close();
    log.success('Database connection closed');
    
  } catch (error) {
    log.warning(`Cleanup error: ${error.message}`);
  }
}

// Test super admin login
async function testSuperAdminLogin() {
  log.section('Testing Super Admin Login');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/admin-login`, {
      username: SUPER_ADMIN.username,
      password: SUPER_ADMIN.password
    });
    
    superAdminToken = response.data.token;
    
    log.success('Super admin login successful');
    log.info(`User: ${response.data.user.name} (${response.data.user.role})`);
    
    return true;
    
  } catch (error) {
    log.error(`Super admin login failed: ${error.response?.status} ${error.response?.statusText}`);
    if (error.response?.data?.message) {
      log.error(`Error: ${error.response.data.message}`);
    }
    return false;
  }
}

// Test creating club with manager
async function testCreateClubWithManager() {
  log.section('Testing Club Creation with Manager Assignment');
  
  if (!superAdminToken) {
    log.error('No super admin token available');
    return false;
  }
  
  try {
    const response = await axios.post(`${BASE_URL}/clubs`, TEST_CLUB, {
      headers: {
        'Authorization': `Bearer ${superAdminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    createdClub = response.data.club;
    
    log.success('Club creation successful');
    log.info(`Club: ${createdClub.name}`);
    
    if (response.data.clubManager) {
      log.success('Club manager created successfully');
      log.info(`Manager: ${response.data.clubManager.name} (${response.data.clubManager.username})`);
      log.info(`Login instructions: ${response.data.loginInstructions}`);
    } else {
      log.warning('No club manager was created');
    }
    
    return true;
    
  } catch (error) {
    log.error(`Club creation failed: ${error.response?.status} ${error.response?.statusText}`);
    if (error.response?.data?.message) {
      log.error(`Error: ${error.response.data.message}`);
    }
    return false;
  }
}

// Test club manager login
async function testClubManagerLogin() {
  log.section('Testing Club Manager Login');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: TEST_CLUB.clubManagerUsername,
      password: TEST_CLUB.clubManagerPassword
    });
    
    clubManagerToken = response.data.token;
    
    log.success('Club manager login successful');
    log.info(`User: ${response.data.user.name} (${response.data.user.role})`);
    log.info(`Assigned role: ${response.data.user.role}`);
    
    // Verify it's a club admin
    if (response.data.user.role === 'club_admin') {
      log.success('Club manager has correct role assignment');
    } else {
      log.warning(`Unexpected role: ${response.data.user.role}`);
    }
    
    return true;
    
  } catch (error) {
    log.error(`Club manager login failed: ${error.response?.status} ${error.response?.statusText}`);
    if (error.response?.data?.message) {
      log.error(`Error: ${error.response.data.message}`);
    }
    return false;
  }
}

// Test club manager dashboard access
async function testClubManagerDashboard() {
  log.section('Testing Club Manager Dashboard Access');
  
  if (!clubManagerToken) {
    log.error('No club manager token available');
    return false;
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/club-management/dashboard`, {
      headers: {
        'Authorization': `Bearer ${clubManagerToken}`
      }
    });
    
    const dashboard = response.data.dashboard;
    
    log.success('Club manager dashboard access successful');
    log.info(`Managing club: ${dashboard.club.name}`);
    log.info(`Club status: ${dashboard.club.status}`);
    log.info(`Total members: ${dashboard.statistics.totalMembers}`);
    log.info(`Total events: ${dashboard.statistics.totalEvents}`);
    
    // Verify they can only see their assigned club
    if (dashboard.club.name === TEST_CLUB.name) {
      log.success('Club manager can access their assigned club');
    } else {
      log.error('Club manager accessing wrong club!');
      return false;
    }
    
    return true;
    
  } catch (error) {
    log.error(`Dashboard access failed: ${error.response?.status} ${error.response?.statusText}`);
    if (error.response?.data?.message) {
      log.error(`Error: ${error.response.data.message}`);
    }
    return false;
  }
}

// Test club manager trying to access another club (should fail)
async function testClubManagerAccessRestriction() {
  log.section('Testing Club Manager Access Restrictions');
  
  if (!clubManagerToken) {
    log.error('No club manager token available');
    return false;
  }
  
  try {
    // Try to get list of all clubs (should work but filtered)
    const clubsResponse = await axios.get(`${BASE_URL}/clubs`, {
      headers: {
        'Authorization': `Bearer ${clubManagerToken}`
      }
    });
    
    log.info(`Can view ${clubsResponse.data.clubs.length} clubs (public access)`);
    
    // Try to access club management for a different club (should fail)
    // First get another club ID
    const allClubs = await axios.get(`${BASE_URL}/clubs`);
    const otherClub = allClubs.data.clubs.find(club => club.id !== createdClub.id);
    
    if (otherClub) {
      try {
        await axios.get(`${BASE_URL}/club-management/club/${otherClub.id}/members`, {
          headers: {
            'Authorization': `Bearer ${clubManagerToken}`
          }
        });
        
        log.error('Club manager was able to access another club! This is a security issue.');
        return false;
        
      } catch (restrictionError) {
        if (restrictionError.response?.status === 403) {
          log.success('Club manager correctly denied access to other clubs');
        } else {
          log.info(`Access denied with status: ${restrictionError.response?.status}`);
        }
      }
    }
    
    return true;
    
  } catch (error) {
    log.error(`Access restriction test failed: ${error.response?.status} ${error.response?.statusText}`);
    return false;
  }
}

// Test super admin can see all club admins
async function testSuperAdminViewClubAdmins() {
  log.section('Testing Super Admin View of Club Admins');
  
  if (!superAdminToken) {
    log.error('No super admin token available');
    return false;
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/club-admin`, {
      headers: {
        'Authorization': `Bearer ${superAdminToken}`
      }
    });
    
    log.success('Super admin can view club admins');
    log.info(`Total club admins: ${response.data.count}`);
    
    // Find our test club admin
    const testAdmin = response.data.clubAdmins.find(
      admin => admin.username === TEST_CLUB.clubManagerUsername
    );
    
    if (testAdmin) {
      log.success('Created club admin found in the list');
      log.info(`Admin: ${testAdmin.name} managing ${testAdmin.assignedClub?.name || 'No club'}`);
    } else {
      log.warning('Created club admin not found in the list');
    }
    
    return true;
    
  } catch (error) {
    log.error(`View club admins failed: ${error.response?.status} ${error.response?.statusText}`);
    return false;
  }
}

// Main test execution
async function runCompleteWorkflowTest() {
  console.log('🏢 COMPLETE CLUB MANAGEMENT WORKFLOW TEST');
  console.log('Testing Super Admin creating club with manager and club manager login\n');
  
  let success = true;
  
  try {
    // Step 1: Connect to database for cleanup
    const dbConnected = await connectToDB();
    if (!dbConnected) {
      log.error('Cannot proceed without database connection');
      return;
    }
    
    // Clean up any existing test data
    await cleanup();
    await delay(1000);
    
    // Step 2: Test super admin login
    const adminLoginSuccess = await testSuperAdminLogin();
    if (!adminLoginSuccess) {
      success = false;
    }
    await delay(1000);
    
    // Step 3: Test creating club with manager
    const clubCreationSuccess = await testCreateClubWithManager();
    if (!clubCreationSuccess) {
      success = false;
    }
    await delay(1000);
    
    // Step 4: Test club manager login
    const managerLoginSuccess = await testClubManagerLogin();
    if (!managerLoginSuccess) {
      success = false;
    }
    await delay(1000);
    
    // Step 5: Test club manager dashboard access
    const dashboardSuccess = await testClubManagerDashboard();
    if (!dashboardSuccess) {
      success = false;
    }
    await delay(1000);
    
    // Step 6: Test access restrictions
    const restrictionSuccess = await testClubManagerAccessRestriction();
    if (!restrictionSuccess) {
      success = false;
    }
    await delay(1000);
    
    // Step 7: Test super admin can view all club admins
    const viewAdminsSuccess = await testSuperAdminViewClubAdmins();
    if (!viewAdminsSuccess) {
      success = false;
    }
    
    // Results
    log.section('Test Results');
    if (success) {
      log.success('🎉 ALL TESTS PASSED - Complete club management workflow is working!');
      log.info('✅ Super admin can create clubs and assign managers');
      log.info('✅ Club managers receive correct login credentials');
      log.info('✅ Club managers can login and access their dashboard');
      log.info('✅ Club managers are restricted to their assigned club');
      log.info('✅ Super admin can monitor all club managers');
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
  runCompleteWorkflowTest().catch(error => {
    log.error(`Critical error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runCompleteWorkflowTest,
  testSuperAdminLogin,
  testCreateClubWithManager,
  testClubManagerLogin,
  testClubManagerDashboard
};