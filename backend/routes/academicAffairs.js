const express = require('express');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Middleware to check if user is academic affairs or admin
const academicAffairsOnly = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No user found.'
      });
    }

    if (req.user.role !== 'academic_affairs' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Academic affairs or admin privileges required.'
      });
    }

    next();
  } catch (error) {
    console.error('Academic affairs middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authorization'
    });
  }
};

// @desc    Academic Affairs Login
// @route   POST /api/academic-affairs/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    // Find academic affairs user
    const academicUser = await User.findOne({ 
      username, 
      role: 'academic_affairs',
      isActive: true 
    }).select('+password');

    if (!academicUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or account not found'
      });
    }

    // Check if account is locked
    if (academicUser.isLocked && academicUser.lockUntil > Date.now()) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to too many failed login attempts'
      });
    }

    // Reset lock if expired
    if (academicUser.isLocked && academicUser.lockUntil <= Date.now()) {
      academicUser.loginAttempts = 0;
      academicUser.isLocked = false;
      academicUser.lockUntil = undefined;
      await academicUser.save();
    }

    // Check password
    const isMatch = await bcrypt.compare(password, academicUser.password);

    if (!isMatch) {
      // Increment login attempts
      academicUser.loginAttempts = (academicUser.loginAttempts || 0) + 1;
      if (academicUser.loginAttempts >= 5) {
        academicUser.isLocked = true;
        academicUser.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
      }
      await academicUser.save();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    academicUser.loginAttempts = 0;
    academicUser.isLocked = false;
    academicUser.lockUntil = undefined;
    academicUser.lastLogin = new Date();
    await academicUser.save();

    // Generate token
    const token = generateToken(academicUser._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: academicUser._id,
        name: academicUser.name,
        username: academicUser.username,
        email: academicUser.email,
        role: academicUser.role,
        isAcademicAffairs: academicUser.isAcademicAffairs,
        academicResponsibilities: academicUser.academicResponsibilities,
        department: academicUser.department,
        profileImage: academicUser.profileImage
      }
    });

  } catch (error) {
    console.error('Academic affairs login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @desc    Get Academic Affairs Dashboard
// @route   GET /api/academic-affairs/dashboard
// @access  Private/AcademicAffairs
router.get('/dashboard', protect, academicAffairsOnly, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Get statistics for academic affairs dashboard
    const totalStudents = await User.countDocuments({ role: 'student', isActive: true });
    const totalComplaints = 0; // This would be from a Complaints model if you have one
    const recentComplaints = []; // This would be recent complaints
    
    // Academic policy statistics (you can expand this based on your needs)
    const academicStats = {
      totalStudents,
      totalComplaints,
      resolvedComplaints: 0,
      pendingComplaints: 0,
      policyProposals: 0,
      curriculumFeedbacks: 0
    };

    res.json({
      success: true,
      dashboard: {
        user: {
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          department: user.department,
          responsibilities: user.academicResponsibilities
        },
        stats: academicStats,
        recentActivity: recentComplaints
      }
    });
  } catch (error) {
    console.error('Get academic affairs dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard data'
    });
  }
});

// @desc    Get all students for academic support
// @route   GET /api/academic-affairs/students
// @access  Private/AcademicAffairs
router.get('/students', protect, academicAffairsOnly, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, department, year } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = { role: 'student', isActive: true };
    
    if (department) query.department = department;
    if (year) query.year = year;
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      count: students.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      students
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching students'
    });
  }
});

// @desc    Get academic policy proposals (placeholder for future implementation)
// @route   GET /api/academic-affairs/policy-proposals
// @access  Private/AcademicAffairs
router.get('/policy-proposals', protect, academicAffairsOnly, async (req, res) => {
  try {
    // Placeholder for policy proposals - you can implement this based on your needs
    const policyProposals = [
      {
        id: 1,
        title: 'Extended Library Hours During Exams',
        description: 'Proposal to extend library operating hours during examination periods',
        status: 'pending',
        submittedBy: 'Student Body',
        submittedAt: new Date(),
        category: 'library_services'
      },
      {
        id: 2,
        title: 'Online Course Evaluation System',
        description: 'Implementation of digital platform for course and instructor evaluation',
        status: 'approved',
        submittedBy: 'Academic Committee',
        submittedAt: new Date(),
        category: 'evaluation_system'
      }
    ];

    res.json({
      success: true,
      count: policyProposals.length,
      proposals: policyProposals
    });
  } catch (error) {
    console.error('Get policy proposals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching policy proposals'
    });
  }
});

// @desc    Get curriculum feedback (placeholder for future implementation)
// @route   GET /api/academic-affairs/curriculum-feedback
// @access  Private/AcademicAffairs
router.get('/curriculum-feedback', protect, academicAffairsOnly, async (req, res) => {
  try {
    // Placeholder for curriculum feedback - you can implement this based on your needs
    const curriculumFeedback = [
      {
        id: 1,
        course: 'Computer Science 101',
        feedback: 'More practical labs needed',
        rating: 3.5,
        submittedBy: 'CS Students',
        department: 'Computer Science',
        submittedAt: new Date(),
        status: 'pending_review'
      },
      {
        id: 2,
        course: 'Mathematics 201',
        feedback: 'Course content is well structured but needs more examples',
        rating: 4.2,
        submittedBy: 'Math Students', 
        department: 'Mathematics',
        submittedAt: new Date(),
        status: 'reviewed'
      }
    ];

    res.json({
      success: true,
      count: curriculumFeedback.length,
      feedback: curriculumFeedback
    });
  } catch (error) {
    console.error('Get curriculum feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching curriculum feedback'
    });
  }
});

// @desc    Update academic affairs responsibilities
// @route   PUT /api/academic-affairs/responsibilities
// @access  Private/Admin
router.put('/responsibilities/:userId', protect, adminOnly, async (req, res) => {
  try {
    const { responsibilities } = req.body;
    const { userId } = req.params;

    const validResponsibilities = [
      'academic_policy_advocacy',
      'student_academic_support',
      'curriculum_feedback_coordination',
      'academic_complaint_resolution'
    ];

    // Validate responsibilities
    const invalidResponsibilities = responsibilities.filter(r => !validResponsibilities.includes(r));
    if (invalidResponsibilities.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid responsibilities provided',
        invalid: invalidResponsibilities
      });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'academic_affairs') {
      return res.status(404).json({
        success: false,
        message: 'Academic affairs user not found'
      });
    }

    user.academicResponsibilities = responsibilities;
    await user.save();

    res.json({
      success: true,
      message: 'Academic responsibilities updated successfully',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        responsibilities: user.academicResponsibilities
      }
    });
  } catch (error) {
    console.error('Update responsibilities error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating responsibilities'
    });
  }
});

module.exports = router;