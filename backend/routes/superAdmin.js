const express = require('express');
const User = require('../models/User');
const Club = require('../models/Club');
const { protect, superAdminOnly } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

// @desc    Create club admin user
// @route   POST /api/super-admin/create-club-admin
// @access  Private/Super Admin Only
router.post('/create-club-admin', protect, superAdminOnly, async (req, res) => {
  try {
    const { 
      name, 
      username, 
      email, 
      phoneNumber, 
      department = 'Club Management',
      assignedClubId 
    } = req.body;

    // Validate required fields
    if (!name || !username || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name, username, and email are required'
      });
    }

    // Validate username format (dbuxxxxxxxx)
    if (!/^dbu\d{8}$/i.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be in format dbuxxxxxxxx (dbu followed by 8 digits)'
      });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Check if club exists if assignedClubId is provided
    let assignedClub = null;
    if (assignedClubId) {
      assignedClub = await Club.findById(assignedClubId);
      if (!assignedClub) {
        return res.status(404).json({
          success: false,
          message: 'Assigned club not found'
        });
      }
    }

    // Create club admin user with default password
    const defaultPassword = 'Admin123#';
    const clubAdmin = await User.create({
      name,
      username,
      email,
      password: defaultPassword,
      phoneNumber: phoneNumber || '',
      department,
      year: '1st Year',
      role: 'club_admin',
      isAdmin: false,
      isClubAdmin: true,
      assignedClub: assignedClubId || null,
      isActive: true
    });

    // Update club with assigned admin if provided
    if (assignedClub) {
      assignedClub.clubAdmin = clubAdmin._id;
      await assignedClub.save();
    }

    res.status(201).json({
      success: true,
      message: 'Club admin created successfully',
      clubAdmin: {
        id: clubAdmin._id,
        name: clubAdmin.name,
        username: clubAdmin.username,
        email: clubAdmin.email,
        role: clubAdmin.role,
        department: clubAdmin.department,
        assignedClub: assignedClub ? {
          id: assignedClub._id,
          name: assignedClub.name
        } : null
      },
      loginCredentials: {
        username: clubAdmin.username,
        password: defaultPassword,
        message: 'Please share these credentials securely with the club admin'
      }
    });

  } catch (error) {
    console.error('Create club admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating club admin'
    });
  }
});

// @desc    Create club with admin assignment
// @route   POST /api/super-admin/create-club-with-admin
// @access  Private/Super Admin Only
router.post('/create-club-with-admin', protect, superAdminOnly, async (req, res) => {
  try {
    const {
      // Club details
      clubName,
      clubDescription,
      clubCategory,
      clubFounded,
      clubImage,
      clubContactEmail,
      clubMeetingSchedule,
      clubRequirements,
      
      // Club admin details
      adminName,
      adminUsername,
      adminEmail,
      adminPhone
    } = req.body;

    // Validate required fields
    if (!clubName || !clubDescription || !clubCategory || !adminName || !adminUsername || !adminEmail) {
      return res.status(400).json({
        success: false,
        message: 'Club name, description, category, and admin details (name, username, email) are required'
      });
    }

    // Validate admin username format
    if (!/^dbu\d{8}$/i.test(adminUsername)) {
      return res.status(400).json({
        success: false,
        message: 'Admin username must be in format dbuxxxxxxxx (dbu followed by 8 digits)'
      });
    }

    // Check if club name already exists
    const existingClub = await Club.findOne({ 
      name: { $regex: new RegExp(`^${clubName}$`, 'i') } 
    });
    if (existingClub) {
      return res.status(409).json({
        success: false,
        message: 'Club with this name already exists'
      });
    }

    // Check if admin username or email already exists
    const existingAdmin = await User.findOne({
      $or: [{ username: adminUsername }, { email: adminEmail }]
    });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: 'Admin username or email already exists'
      });
    }

    // Create the club first
    const club = await Club.create({
      name: clubName,
      description: clubDescription,
      category: clubCategory,
      founded: clubFounded || new Date().getFullYear().toString(),
      image: clubImage || 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
      contactEmail: clubContactEmail,
      meetingSchedule: clubMeetingSchedule,
      requirements: clubRequirements,
      status: 'active'
    });

    // Create club admin user
    const defaultPassword = 'Admin123#';
    const clubAdmin = await User.create({
      name: adminName,
      username: adminUsername,
      email: adminEmail,
      password: defaultPassword,
      phoneNumber: adminPhone || '',
      department: 'Club Management',
      year: '1st Year',
      role: 'club_admin',
      isAdmin: false,
      isClubAdmin: true,
      assignedClub: club._id,
      isActive: true
    });

    // Assign admin to club
    club.clubAdmin = clubAdmin._id;
    await club.save();

    res.status(201).json({
      success: true,
      message: 'Club and club admin created successfully',
      club: {
        id: club._id,
        name: club.name,
        description: club.description,
        category: club.category,
        status: club.status
      },
      clubAdmin: {
        id: clubAdmin._id,
        name: clubAdmin.name,
        username: clubAdmin.username,
        email: clubAdmin.email,
        role: clubAdmin.role
      },
      loginCredentials: {
        username: clubAdmin.username,
        password: defaultPassword,
        message: 'Please share these credentials securely with the club admin'
      }
    });

  } catch (error) {
    console.error('Create club with admin error:', error);
    
    // Clean up if club was created but admin creation failed
    if (error.message.includes('User validation failed') && req.body.clubName) {
      try {
        await Club.deleteOne({ name: req.body.clubName });
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating club and admin'
    });
  }
});

// @desc    Assign club admin to existing club
// @route   PUT /api/super-admin/assign-admin-to-club/:clubId
// @access  Private/Super Admin Only
router.put('/assign-admin-to-club/:clubId', protect, superAdminOnly, async (req, res) => {
  try {
    const { adminUserId, adminUsername } = req.body;

    // Find the club
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    // Find the admin user
    let admin;
    if (adminUserId) {
      admin = await User.findById(adminUserId);
    } else if (adminUsername) {
      admin = await User.findOne({ username: adminUsername });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either adminUserId or adminUsername is required'
      });
    }

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Verify user is a club admin
    if (admin.role !== 'club_admin') {
      return res.status(400).json({
        success: false,
        message: 'User is not a club admin'
      });
    }

    // Update admin's assigned club
    admin.assignedClub = club._id;
    await admin.save();

    // Update club's admin
    club.clubAdmin = admin._id;
    await club.save();

    res.json({
      success: true,
      message: 'Admin assigned to club successfully',
      assignment: {
        club: {
          id: club._id,
          name: club.name
        },
        admin: {
          id: admin._id,
          name: admin.name,
          username: admin.username
        }
      }
    });

  } catch (error) {
    console.error('Assign admin to club error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error assigning admin to club'
    });
  }
});

// @desc    Get all club admins
// @route   GET /api/super-admin/club-admins
// @access  Private/Super Admin Only
router.get('/club-admins', protect, superAdminOnly, async (req, res) => {
  try {
    const clubAdmins = await User.find({ role: 'club_admin' })
      .populate('assignedClub', 'name category')
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: clubAdmins.length,
      clubAdmins
    });

  } catch (error) {
    console.error('Get club admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching club admins'
    });
  }
});

// @desc    Get clubs without admin
// @route   GET /api/super-admin/clubs-without-admin
// @access  Private/Super Admin Only
router.get('/clubs-without-admin', protect, superAdminOnly, async (req, res) => {
  try {
    const clubsWithoutAdmin = await Club.find({
      $or: [
        { clubAdmin: { $exists: false } },
        { clubAdmin: null }
      ]
    }).select('name description category status createdAt');

    res.json({
      success: true,
      count: clubsWithoutAdmin.length,
      clubs: clubsWithoutAdmin
    });

  } catch (error) {
    console.error('Get clubs without admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching clubs without admin'
    });
  }
});

module.exports = router;