const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Club = require('../models/Club');
const { protect, adminOnly, superAdminOnly } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Email configuration
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'getabalewamtataw11@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'your_app_password_here'
    }
  });
};

// @desc    Create club admin and assign to club
// @route   POST /api/club-admin/create
// @access  Private/Super Admin Only
router.post('/create', protect, superAdminOnly, async (req, res) => {
  try {
    const { 
      name, 
      username, 
      password, 
      email, 
      phoneNumber, 
      clubId,
      department,
      year
    } = req.body;

    // Validate required fields
    if (!name || !username || !password || !email || !clubId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, username, password, email, clubId'
      });
    }

    // Check if club exists
    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    // Check if club already has an admin
    if (club.clubAdmin) {
      return res.status(400).json({
        success: false,
        message: 'This club already has an assigned admin'
      });
    }

    // Check if user with username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this username or email already exists'
      });
    }

    // Create club admin user
    const clubAdmin = await User.create({
      name,
      username,
      password,
      email,
      phoneNumber,
      department: department || 'Administration',
      year: year || '1st Year',
      role: 'club_admin',
      isClubAdmin: true,
      assignedClub: clubId
    });

    // Update club with admin assignment
    club.clubAdmin = clubAdmin._id;
    await club.save();

    // Send welcome email to club admin
    try {
      const transporter = createTransporter();
      const mailOptions = {
        from: 'getabalewamtataw11@gmail.com',
        to: email,
        subject: `Welcome to DBU Student Council - Club Admin Access`,
        html: `
          <h2>Welcome to DBU Student Council</h2>
          <p>Hi ${name},</p>
          <p>You have been assigned as the admin for <strong>${club.name}</strong>.</p>
          <p>Your login credentials are:</p>
          <ul>
            <li><strong>Username:</strong> ${username}</li>
            <li><strong>Password:</strong> ${password}</li>
          </ul>
          <p>Please login to the system to manage your club.</p>
          <p><em>Note: Please change your password after first login for security.</em></p>
          <br>
          <p>Best regards,<br>DBU Student Council</p>
        `
      };
      
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.warn('Failed to send welcome email:', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Club admin created and assigned successfully',
      clubAdmin: {
        id: clubAdmin._id,
        name: clubAdmin.name,
        username: clubAdmin.username,
        email: clubAdmin.email,
        role: clubAdmin.role,
        assignedClub: {
          id: club._id,
          name: club.name
        }
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

// @desc    Get all club admins
// @route   GET /api/club-admin
// @access  Private/Super Admin Only
router.get('/', protect, superAdminOnly, async (req, res) => {
  try {
    const clubAdmins = await User.find({ role: 'club_admin' })
      .populate('assignedClub', 'name category status')
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

// @desc    Update club admin
// @route   PUT /api/club-admin/:id
// @access  Private/Super Admin Only
router.put('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const { name, email, phoneNumber, clubId } = req.body;

    const clubAdmin = await User.findById(req.params.id);
    if (!clubAdmin || clubAdmin.role !== 'club_admin') {
      return res.status(404).json({
        success: false,
        message: 'Club admin not found'
      });
    }

    // If changing club assignment
    if (clubId && clubId !== clubAdmin.assignedClub?.toString()) {
      // Check if new club exists
      const newClub = await Club.findById(clubId);
      if (!newClub) {
        return res.status(404).json({
          success: false,
          message: 'Club not found'
        });
      }

      // Check if new club already has admin
      if (newClub.clubAdmin && newClub.clubAdmin.toString() !== clubAdmin._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'This club already has an assigned admin'
        });
      }

      // Remove admin from old club
      if (clubAdmin.assignedClub) {
        await Club.findByIdAndUpdate(clubAdmin.assignedClub, {
          $unset: { clubAdmin: 1 }
        });
      }

      // Assign to new club
      newClub.clubAdmin = clubAdmin._id;
      await newClub.save();
      clubAdmin.assignedClub = clubId;
    }

    // Update other fields
    if (name) clubAdmin.name = name;
    if (email) clubAdmin.email = email;
    if (phoneNumber) clubAdmin.phoneNumber = phoneNumber;

    await clubAdmin.save();

    const updatedClubAdmin = await User.findById(clubAdmin._id)
      .populate('assignedClub', 'name category status')
      .select('-password');

    res.json({
      success: true,
      message: 'Club admin updated successfully',
      clubAdmin: updatedClubAdmin
    });

  } catch (error) {
    console.error('Update club admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating club admin'
    });
  }
});

// @desc    Delete club admin
// @route   DELETE /api/club-admin/:id
// @access  Private/Super Admin Only
router.delete('/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const clubAdmin = await User.findById(req.params.id);
    if (!clubAdmin || clubAdmin.role !== 'club_admin') {
      return res.status(404).json({
        success: false,
        message: 'Club admin not found'
      });
    }

    // Remove admin from assigned club
    if (clubAdmin.assignedClub) {
      await Club.findByIdAndUpdate(clubAdmin.assignedClub, {
        $unset: { clubAdmin: 1 }
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Club admin deleted successfully'
    });

  } catch (error) {
    console.error('Delete club admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting club admin'
    });
  }
});

// @desc    Club admin login
// @route   POST /api/club-admin/login
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

    // Find club admin
    const clubAdmin = await User.findOne({ 
      username, 
      role: 'club_admin',
      isActive: true 
    }).select('+password').populate('assignedClub', 'name category status');

    if (!clubAdmin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or account not found'
      });
    }

    // Check if account is locked
    if (clubAdmin.isLocked && clubAdmin.lockUntil > Date.now()) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to too many failed login attempts'
      });
    }

    // Reset lock if expired
    if (clubAdmin.isLocked && clubAdmin.lockUntil <= Date.now()) {
      clubAdmin.loginAttempts = 0;
      clubAdmin.isLocked = false;
      clubAdmin.lockUntil = undefined;
      await clubAdmin.save();
    }

    // Check password
    const isMatch = await bcrypt.compare(password, clubAdmin.password);

    if (!isMatch) {
      // Increment login attempts
      clubAdmin.loginAttempts = (clubAdmin.loginAttempts || 0) + 1;
      if (clubAdmin.loginAttempts >= 5) {
        clubAdmin.isLocked = true;
        clubAdmin.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
      }
      await clubAdmin.save();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    clubAdmin.loginAttempts = 0;
    clubAdmin.isLocked = false;
    clubAdmin.lockUntil = undefined;
    clubAdmin.lastLogin = new Date();
    await clubAdmin.save();

    // Generate token
    const token = generateToken(clubAdmin._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: clubAdmin._id,
        name: clubAdmin.name,
        username: clubAdmin.username,
        email: clubAdmin.email,
        role: clubAdmin.role,
        isClubAdmin: clubAdmin.isClubAdmin,
        assignedClub: clubAdmin.assignedClub,
        profileImage: clubAdmin.profileImage
      }
    });

  } catch (error) {
    console.error('Club admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @desc    Reset club admin password
// @route   POST /api/club-admin/reset-password
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address'
      });
    }

    const user = await User.findOne({ 
      email, 
      role: 'club_admin',
      isActive: true 
    });

    if (!user) {
      // Don't reveal if email exists for security
      return res.json({
        success: true,
        message: 'If an account with this email exists, a password reset email has been sent'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // Send reset email
    try {
      const transporter = createTransporter();
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: 'getabalewamtataw11@gmail.com',
        to: email,
        subject: 'Password Reset Request - DBU Student Council',
        html: `
          <h2>Password Reset Request</h2>
          <p>Hi ${user.name},</p>
          <p>You requested a password reset for your club admin account.</p>
          <p>Please click the link below to reset your password:</p>
          <a href="${resetUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>This link will expire in 10 minutes.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
          <br>
          <p>Best regards,<br>DBU Student Council</p>
        `
      };
      
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      
      return res.status(500).json({
        success: false,
        message: 'Email could not be sent. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'Password reset email sent successfully'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing password reset'
    });
  }
});

// @desc    Reset password with token
// @route   PUT /api/club-admin/reset-password/:token
// @access  Public
router.put('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Get hashed token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
      role: 'club_admin'
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Set new password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = undefined;

    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Password reset confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting password'
    });
  }
});

module.exports = router;