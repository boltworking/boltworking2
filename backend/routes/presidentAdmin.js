const express = require('express');
const Club = require('../models/Club');
const Election = require('../models/Election');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { validateElectionDates } = require('../utils/electionTimer');

const router = express.Router();

// @desc    Get President Admin Dashboard
// @route   GET /api/president-admin/dashboard
// @access  Private (President Admin only)
router.get('/dashboard', protect, authorize(['president_admin']), async (req, res) => {
  try {
    // Get statistics for president admin dashboard
    const totalClubs = await Club.countDocuments();
    const activeClubs = await Club.countDocuments({ status: 'active' });
    const pendingClubs = await Club.countDocuments({ status: 'pending_approval' });
    
    const totalElections = await Election.countDocuments({ createdBy: req.user.id });
    const activeElections = await Election.countDocuments({ 
      createdBy: req.user.id, 
      status: 'active' 
    });
    const upcomingElections = await Election.countDocuments({ 
      createdBy: req.user.id, 
      status: 'upcoming' 
    });

    // Recent clubs created
    const recentClubs = await Club.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name category status createdAt');

    // Recent elections created by this president admin
    const recentElections = await Election.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status startDate endDate createdAt');

    res.status(200).json({
      success: true,
      data: {
        statistics: {
          totalClubs,
          activeClubs,
          pendingClubs,
          totalElections,
          activeElections,
          upcomingElections
        },
        recentClubs,
        recentElections
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard data',
      error: error.message
    });
  }
});

// @desc    Create new club
// @route   POST /api/president-admin/clubs
// @access  Private (President Admin only)
router.post('/clubs', 
  protect, 
  authorize(['president_admin']),
  [
    body('name').notEmpty().withMessage('Club name is required'),
    body('description').notEmpty().withMessage('Club description is required'),
    body('category').notEmpty().withMessage('Club category is required'),
    body('category').isIn(['Academic', 'Sports', 'Cultural', 'Technology', 'Service', 'Arts', 'Religious', 'Professional']).withMessage('Invalid category')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Check user permissions
      if (!req.user.permissions || !req.user.permissions.canCreateClubs) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to create clubs'
        });
      }

      const { 
        name, 
        description, 
        category, 
        founded, 
        image, 
        contactEmail, 
        meetingSchedule, 
        requirements,
        // Club manager fields (optional)
        clubManagerName,
        clubManagerUsername,
        clubManagerPassword,
        clubManagerEmail,
        clubManagerPhone
      } = req.body;
      
      // Check if club name already exists
      const existingClub = await Club.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') } 
      });
      if (existingClub) {
        return res.status(409).json({
          success: false,
          message: 'Club with this name already exists'
        });
      }

      const clubData = {
        name,
        description,
        category,
        founded: founded || new Date().getFullYear().toString(),
        image: image || 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
        contactEmail,
        meetingSchedule,
        requirements,
        status: 'active' // President admin creates active clubs
      };

      const club = await Club.create(clubData);
      
      let clubManager = null;
      
      // Create club manager if details provided
      if (clubManagerName && clubManagerUsername && clubManagerPassword && clubManagerEmail) {
        // Check if username already exists
        const existingUser = await User.findOne({ 
          $or: [{ username: clubManagerUsername }, { email: clubManagerEmail }] 
        });
        
        if (existingUser) {
          await Club.findByIdAndDelete(club._id);
          return res.status(400).json({
            success: false,
            message: 'Username or email already exists for club manager'
          });
        }
        
        try {
          clubManager = await User.create({
            name: clubManagerName,
            username: clubManagerUsername,
            password: clubManagerPassword,
            email: clubManagerEmail,
            phoneNumber: clubManagerPhone || '',
            department: 'Club Management',
            year: '1st Year',
            role: 'club_admin',
            isClubAdmin: true,
            assignedClub: club._id
          });
          
          // Assign manager to club
          club.clubAdmin = clubManager._id;
          await club.save();
          
        } catch (managerError) {
          await Club.findByIdAndDelete(club._id);
          return res.status(400).json({
            success: false,
            message: 'Failed to create club manager: ' + managerError.message
          });
        }
      }
      
      const response = {
        success: true,
        message: clubManager 
          ? 'Club and club manager created successfully'
          : 'Club created successfully',
        data: {
          club: {
            id: club._id,
            name: club.name,
            description: club.description,
            category: club.category,
            status: club.status,
            createdAt: club.createdAt
          }
        }
      };
      
      if (clubManager) {
        response.data.clubManager = {
          id: clubManager._id,
          name: clubManager.name,
          username: clubManager.username,
          email: clubManager.email,
          role: clubManager.role
        };
        response.loginInstructions = `Club manager can login using username: ${clubManager.username} and the provided password.`;
      }

      res.status(201).json(response);
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error creating club',
        error: error.message
      });
    }
  }
);

// @desc    Get all clubs created by system (for president admin view)
// @route   GET /api/president-admin/clubs
// @access  Private (President Admin only)
router.get('/clubs', protect, authorize(['president_admin']), async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const clubs = await Club.find(filter)
      .populate('clubAdmin', 'name username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Club.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: clubs.length,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: clubs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching clubs',
      error: error.message
    });
  }
});

// @desc    Create new election
// @route   POST /api/president-admin/elections
// @access  Private (President Admin only)
router.post('/elections', 
  protect, 
  authorize(['president_admin']),
  [
    body('title').notEmpty().withMessage('Election title is required'),
    body('description').notEmpty().withMessage('Election description is required'),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').isISO8601().withMessage('Valid end date is required'),
    body('candidates').isArray({ min: 1 }).withMessage('At least one candidate is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      // Check user permissions
      if (!req.user.permissions || !req.user.permissions.canCreateElections) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to create elections'
        });
      }

      const { title, description, startDate, endDate, candidates, electionType, rules, isPublic, votingEligibility } = req.body;

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      const now = new Date();

      if (start < now) {
        return res.status(400).json({
          success: false,
          message: 'Start date cannot be in the past'
        });
      }

      if (end <= start) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }

      // Set default voting eligibility if not provided
      const defaultEligibility = votingEligibility || {
        roles: ['student', 'club_admin', 'academic_affairs'],
        departments: [],
        years: []
      };

      const eligibleVoters = await User.countDocuments({
        role: { $in: defaultEligibility.roles },
        isActive: true
      });

      const electionData = {
        title,
        description,
        startDate: start,
        endDate: end,
        candidates: candidates || [],
        electionType: electionType || 'general',
        rules: rules || [],
        isPublic: isPublic !== false,
        votingEligibility: defaultEligibility,
        eligibleVoters,
        createdBy: req.user.id
      };

      const election = await Election.create(electionData);
      
      const populatedElection = await Election.findById(election._id)
        .populate('createdBy', 'name role');

      res.status(201).json({
        success: true,
        message: 'Election created successfully',
        data: populatedElection
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error creating election',
        error: error.message
      });
    }
  }
);

// @desc    Get all elections created by this president admin
// @route   GET /api/president-admin/elections
// @access  Private (President Admin only)
router.get('/elections', protect, authorize(['president_admin']), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let filter = { createdBy: req.user.id };
    if (status) filter.status = status;

    const elections = await Election.find(filter)
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Add timer information to each election
    const electionsWithTimer = elections.map(election => {
      const timeRemaining = election.calculateTimeRemaining();
      return {
        ...election.toObject(),
        timeRemaining
      };
    });

    const total = await Election.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: elections.length,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: electionsWithTimer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching elections',
      error: error.message
    });
  }
});

// @desc    Update election
// @route   PUT /api/president-admin/elections/:id
// @access  Private (President Admin only)
router.put('/elections/:id', protect, authorize(['president_admin']), async (req, res) => {
  try {
    const election = await Election.findOne({ 
      _id: req.params.id, 
      createdBy: req.user.id 
    });

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found or you do not have permission to update it'
      });
    }

    // Don't allow updates if election is active or completed
    if (election.status === 'active' || election.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update active or completed elections'
      });
    }

    const { title, description, startDate, endDate, candidates, rules, isPublic, votingEligibility } = req.body;

    // Validate dates if provided
    if (startDate || endDate) {
      const start = new Date(startDate || election.startDate);
      const end = new Date(endDate || election.endDate);
      const now = new Date();

      if (start < now) {
        return res.status(400).json({
          success: false,
          message: 'Start date cannot be in the past'
        });
      }

      if (end <= start) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }

      election.startDate = start;
      election.endDate = end;
    }

    // Update other fields
    if (title) election.title = title;
    if (description) election.description = description;
    if (candidates) election.candidates = candidates;
    if (rules) election.rules = rules;
    if (typeof isPublic === 'boolean') election.isPublic = isPublic;
    if (votingEligibility) election.votingEligibility = votingEligibility;

    await election.save();

    const updatedElection = await Election.findById(election._id)
      .populate('createdBy', 'name role');

    res.status(200).json({
      success: true,
      message: 'Election updated successfully',
      data: updatedElection
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error updating election',
      error: error.message
    });
  }
});

// @desc    Delete election
// @route   DELETE /api/president-admin/elections/:id
// @access  Private (President Admin only)
router.delete('/elections/:id', protect, authorize(['president_admin']), async (req, res) => {
  try {
    const election = await Election.findOne({ 
      _id: req.params.id, 
      createdBy: req.user.id 
    });

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found or you do not have permission to delete it'
      });
    }

    // Don't allow deletion of active elections
    if (election.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete active elections'
      });
    }

    await Election.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Election deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error deleting election',
      error: error.message
    });
  }
});

// @desc    Publish election results
// @route   POST /api/president-admin/elections/:id/publish-results
// @access  Private (President Admin only)
router.post('/elections/:id/publish-results', protect, authorize(['president_admin']), async (req, res) => {
  try {
    const election = await Election.findOne({ 
      _id: req.params.id, 
      createdBy: req.user.id 
    });

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found or you do not have permission to publish results'
      });
    }

    // Only allow publishing results for completed elections
    if (election.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only publish results for completed elections'
      });
    }

    election.resultsPublished = true;
    election.publishedAt = new Date();
    await election.save();

    res.status(200).json({
      success: true,
      message: 'Election results published successfully',
      data: {
        electionId: election._id,
        title: election.title,
        resultsPublished: true,
        publishedAt: election.publishedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error publishing results',
      error: error.message
    });
  }
});

module.exports = router;