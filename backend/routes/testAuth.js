const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');

const router = express.Router();

// Test forgot password without email (for testing purposes)
router.post('/test-forgot-password', async (req, res) => {
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
      isActive: true 
    });

    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with this email exists, a password reset token has been generated',
        note: 'In production, this would send an email'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // Instead of sending email, return the token for testing
    res.json({
      success: true,
      message: 'Password reset token generated successfully',
      testToken: resetToken, // Only for testing - remove in production
      resetUrl: `http://localhost:5173/reset-password?token=${resetToken}`,
      note: 'In production, this token would be sent via email'
    });

  } catch (error) {
    console.error('Test password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing password reset'
    });
  }
});

// Test reset password confirmation
router.put('/test-reset-password/:token', async (req, res) => {
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
      passwordResetExpires: { $gt: Date.now() }
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
      message: 'Password reset successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username
      }
    });

  } catch (error) {
    console.error('Test password reset confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting password'
    });
  }
});

module.exports = router;