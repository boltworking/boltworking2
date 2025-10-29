/**
 * Comprehensive Test Suite for Role-Based Student Council System
 * Tests all major functionalities including:
 * - President Admin functionalities
 * - Club creation and management
 * - Election management
 * - News posting
 * - Complaint system with document upload
 * - Role-based permissions
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
let authTokens = {};

// Test utilities
const createTestFile = () => {
  const testFilePath = path.join(__dirname, 'test-document.txt');
  fs.writeFileSync(testFilePath, 'This is a test document for complaint upload.');
  return testFilePath;
};

const cleanup = () => {
  const testFilePath = path.join(__dirname, 'test-document.txt');
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }
};

// Authentication helper
const authenticate = async (username, password, role = 'student') => {
  try {
    const endpoint = role === 'student' ? '/api/auth/login' : '/api/auth/admin-login';
    const response = await axios.post(`${BASE_URL}${endpoint}`, {
      username,
      password
    });
    
    if (response.data.success) {
      authTokens[role] = response.data.token;
      console.log(`✅ Authentication successful for ${role}: ${username}`);
      return response.data;
    }
  } catch (error) {
    console.log(`❌ Authentication failed for ${role}: ${username}`);
    console.log('Error:', error.response?.data?.message || error.message);
    return null;
  }
};

// Test functions
const testHealthCheck = async () => {
  console.log('\n🏥 Testing Health Check...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return false;
  }
};

const testPresidentAdminDashboard = async () => {
  console.log('\n👑 Testing President Admin Dashboard...');
  if (!authTokens.president_admin) {
    console.log('❌ No president admin token available');
    return false;
  }

  try {
    const response = await axios.get(`${BASE_URL}/api/president-admin/dashboard`, {
      headers: { Authorization: `Bearer ${authTokens.president_admin}` }
    });
    
    if (response.data.success) {
      console.log('✅ President admin dashboard loaded successfully');
      console.log('Statistics:', response.data.data.statistics);
      return true;
    }
  } catch (error) {
    console.log('❌ President admin dashboard failed:', error.response?.data?.message || error.message);
    return false;
  }
};

const testClubCreation = async () => {
  console.log('\n🏫 Testing Club Creation...');
  if (!authTokens.president_admin) {
    console.log('❌ No president admin token available');
    return false;
  }

  const clubData = {
    name: 'Test Technology Club',
    description: 'A test club for technology enthusiasts',
    category: 'Technology',
    contactEmail: 'test@tech.dbu.edu.et',
    clubManagerName: 'Test Manager',
    clubManagerUsername: 'test_manager',
    clubManagerPassword: 'testpass123',
    clubManagerEmail: 'manager@tech.dbu.edu.et'
  };

  try {
    const response = await axios.post(`${BASE_URL}/api/president-admin/clubs`, clubData, {
      headers: { 
        Authorization: `Bearer ${authTokens.president_admin}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Club created successfully:', response.data.data.club.name);
      return response.data.data.club;
    }
  } catch (error) {
    console.log('❌ Club creation failed:', error.response?.data?.message || error.message);
    return false;
  }
};

const testElectionCreation = async () => {
  console.log('\n🗳️ Testing Election Creation...');
  if (!authTokens.president_admin) {
    console.log('❌ No president admin token available');
    return false;
  }

  const electionData = {
    title: 'Test Student Council Election',
    description: 'A test election for student council positions',
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    electionType: 'general',
    candidates: [
      {
        name: 'Test Candidate 1',
        username: 'candidate1',
        department: 'Computer Science',
        year: '3rd Year',
        position: 'President',
        platform: ['Improve campus facilities', 'Better student services']
      },
      {
        name: 'Test Candidate 2',
        username: 'candidate2',
        department: 'Engineering',
        year: '4th Year',
        position: 'President',
        platform: ['Enhanced communication', 'More student events']
      }
    ],
    votingEligibility: {
      roles: ['student', 'club_admin', 'academic_affairs'],
      departments: [],
      years: []
    }
  };

  try {
    const response = await axios.post(`${BASE_URL}/api/president-admin/elections`, electionData, {
      headers: { 
        Authorization: `Bearer ${authTokens.president_admin}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Election created successfully:', response.data.data.title);
      return response.data.data;
    }
  } catch (error) {
    console.log('❌ Election creation failed:', error.response?.data?.message || error.message);
    return false;
  }
};

const testNewsPosting = async () => {
  console.log('\n📰 Testing News Posting...');
  if (!authTokens.president_admin) {
    console.log('❌ No president admin token available');
    return false;
  }

  const newsData = {
    title: 'Test News Announcement',
    content: 'This is a test news announcement to verify the news posting functionality.',
    category: 'general',
    isPinned: true
  };

  try {
    const response = await axios.post(`${BASE_URL}/api/news`, newsData, {
      headers: { 
        Authorization: `Bearer ${authTokens.president_admin}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ News posted successfully:', response.data.data.title);
      return response.data.data;
    }
  } catch (error) {
    console.log('❌ News posting failed:', error.response?.data?.message || error.message);
    return false;
  }
};

const testComplaintWithDocuments = async () => {
  console.log('\n📄 Testing Complaint Submission with Documents...');
  if (!authTokens.student) {
    console.log('❌ No student token available');
    return false;
  }

  const testFilePath = createTestFile();
  const formData = new FormData();
  
  formData.append('title', 'Test Complaint with Document');
  formData.append('description', 'This is a test complaint with document attachment.');
  formData.append('category', 'general');
  formData.append('priority', 'medium');
  formData.append('documents', fs.createReadStream(testFilePath));

  try {
    const response = await axios.post(`${BASE_URL}/api/complaints`, formData, {
      headers: { 
        Authorization: `Bearer ${authTokens.student}`,
        ...formData.getHeaders()
      }
    });
    
    if (response.data.success) {
      console.log('✅ Complaint with document submitted successfully');
      console.log('Complaint ID:', response.data.complaint._id);
      return response.data.complaint;
    }
  } catch (error) {
    console.log('❌ Complaint submission failed:', error.response?.data?.message || error.message);
    return false;
  } finally {
    cleanup();
  }
};

const testComplaintResolution = async (complaintId) => {
  console.log('\n✅ Testing Complaint Resolution...');
  if (!authTokens.president_admin || !complaintId) {
    console.log('❌ Missing president admin token or complaint ID');
    return false;
  }

  try {
    const response = await axios.put(`${BASE_URL}/api/complaints/${complaintId}/resolve`, {
      resolutionNotes: 'Test complaint resolved successfully through automated testing.'
    }, {
      headers: { 
        Authorization: `Bearer ${authTokens.president_admin}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Complaint resolved successfully');
      return true;
    }
  } catch (error) {
    console.log('❌ Complaint resolution failed:', error.response?.data?.message || error.message);
    return false;
  }
};

const testRolePermissions = async () => {
  console.log('\n🔐 Testing Role-Based Permissions...');
  
  // Test student trying to create a club (should fail)
  if (authTokens.student) {
    try {
      await axios.post(`${BASE_URL}/api/president-admin/clubs`, {
        name: 'Unauthorized Club',
        description: 'This should fail',
        category: 'Technology'
      }, {
        headers: { Authorization: `Bearer ${authTokens.student}` }
      });
      console.log('❌ Permission system failed - student was able to create club');
      return false;
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Permission system working - student correctly denied club creation');
      } else {
        console.log('❌ Unexpected error in permission test:', error.response?.data?.message);
        return false;
      }
    }
  }
  
  return true;
};

const testForgotPassword = async () => {
  console.log('\n🔑 Testing Forgot Password Functionality...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/forgot-password`, {
      email: 'test@example.com'
    });
    
    if (response.data.success) {
      console.log('✅ Forgot password request processed successfully');
      return true;
    }
  } catch (error) {
    console.log('❌ Forgot password failed:', error.response?.data?.message || error.message);
    return false;
  }
};

// Main test runner
const runAllTests = async () => {
  console.log('🚀 Starting Comprehensive Role-Based System Tests\n');
  console.log('=' .repeat(60));
  
  const testResults = {
    total: 0,
    passed: 0,
    failed: 0
  };

  // Track test results
  const trackTest = (result) => {
    testResults.total++;
    if (result) {
      testResults.passed++;
    } else {
      testResults.failed++;
    }
    return result;
  };

  // Run tests
  trackTest(await testHealthCheck());
  
  // Authenticate users
  await authenticate('dbu10101020', 'password123', 'president_admin');  // President admin
  await authenticate('dbu10304058', 'password123', 'student');          // Regular student
  await authenticate('dbu10101030', 'password123', 'admin');            // Super admin
  
  // Core functionality tests
  trackTest(await testPresidentAdminDashboard());
  const club = await testClubCreation();
  trackTest(!!club);
  
  const election = await testElectionCreation();
  trackTest(!!election);
  
  const news = await testNewsPosting();
  trackTest(!!news);
  
  const complaint = await testComplaintWithDocuments();
  trackTest(!!complaint);
  
  if (complaint) {
    trackTest(await testComplaintResolution(complaint._id));
  }
  
  trackTest(await testRolePermissions());
  trackTest(await testForgotPassword());

  // Print results
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 Test Results Summary');
  console.log('=' .repeat(60));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! The role-based system is working correctly.');
  } else {
    console.log(`\n⚠️  ${testResults.failed} test(s) failed. Please review the issues above.`);
  }
  
  console.log('=' .repeat(60));
  
  return testResults.failed === 0;
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('🔥 Test runner crashed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests };