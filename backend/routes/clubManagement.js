const express = require('express');
const Club = require('../models/Club');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is club admin
const clubAdminOnly = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No user found.'
      });
    }

    if (req.user.role !== 'club_admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Club admin or admin privileges required.'
      });
    }

    next();
  } catch (error) {
    console.error('Club admin middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authorization'
    });
  }
};

// Middleware to verify club ownership
const verifyClubOwnership = async (req, res, next) => {
  try {
    // Skip ownership check for main admins
    if (req.user.role === 'admin') {
      return next();
    }

    const clubId = req.params.clubId || req.body.clubId;
    if (!clubId) {
      return res.status(400).json({
        success: false,
        message: 'Club ID is required'
      });
    }

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    // Check if the current user is the club admin
    if (!club.clubAdmin || club.clubAdmin.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not the admin of this club.'
      });
    }

    req.club = club;
    next();
  } catch (error) {
    console.error('Club ownership verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error verifying club ownership'
    });
  }
};

// @desc    Get club admin dashboard data
// @route   GET /api/club-management/dashboard
// @access  Private/ClubAdmin
router.get('/dashboard', protect, clubAdminOnly, async (req, res) => {
  try {
    // Get club admin's assigned club
    const user = await User.findById(req.user.id).populate('assignedClub');
    
    if (!user.assignedClub) {
      return res.status(404).json({
        success: false,
        message: 'No club assigned to this admin'
      });
    }

    const club = await Club.findById(user.assignedClub._id)
      .populate('members.user', 'name username email department year profileImage')
      .populate('clubAdmin', 'name username email');

    // Calculate statistics
    const totalMembers = club.members.length;
    const approvedMembers = club.members.filter(member => member.status === 'approved').length;
    const pendingMembers = club.members.filter(member => member.status === 'pending').length;
    const upcomingEvents = club.events.filter(event => 
      event.date > new Date() && event.status === 'planned'
    ).length;

    res.json({
      success: true,
      dashboard: {
        club: {
          id: club._id,
          name: club.name,
          description: club.description,
          category: club.category,
          image: club.image,
          status: club.status,
          founded: club.founded,
          contactEmail: club.contactEmail,
          contactPhone: club.contactPhone,
          officeLocation: club.officeLocation
        },
        statistics: {
          totalMembers,
          approvedMembers,
          pendingMembers,
          upcomingEvents,
          totalEvents: club.events.length
        },
        recentMembers: club.members
          .filter(member => member.status === 'approved')
          .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))
          .slice(0, 5),
        upcomingEvents: club.events
          .filter(event => event.date > new Date() && event.status === 'planned')
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard data'
    });
  }
});

// @desc    Get all club members
// @route   GET /api/club-management/club/:clubId/members
// @access  Private/ClubAdmin
router.get('/club/:clubId/members', protect, clubAdminOnly, verifyClubOwnership, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    
    const club = await Club.findById(req.params.clubId);
    let members = [...club.members];

    // Filter by status
    if (status && status !== 'all') {
      members = members.filter(member => member.status === status);
    }

    // Search filter
    if (search) {
      members = members.filter(member => 
        member.fullName.toLowerCase().includes(search.toLowerCase()) ||
        member.department.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedMembers = members.slice(startIndex, endIndex);

    // Populate user details
    await Club.populate(paginatedMembers, {
      path: 'user',
      select: 'name username email profileImage lastLogin'
    });

    res.json({
      success: true,
      count: paginatedMembers.length,
      total: members.length,
      page: parseInt(page),
      pages: Math.ceil(members.length / limit),
      members: paginatedMembers
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching members'
    });
  }
});

// @desc    Approve/Reject member application
// @route   PATCH /api/club-management/club/:clubId/members/:memberId/status
// @access  Private/ClubAdmin
router.patch('/club/:clubId/members/:memberId/status', protect, clubAdminOnly, verifyClubOwnership, async (req, res) => {
  try {
    const { status } = req.body;
    const { memberId } = req.params;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved or rejected.'
      });
    }

    const club = await Club.findById(req.params.clubId);
    const member = club.members.id(memberId);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    member.status = status;
    await club.save();

    // Update user's joinedClubs array if approved
    if (status === 'approved') {
      await User.findByIdAndUpdate(
        member.user,
        { $addToSet: { joinedClubs: club._id } }
      );
    } else if (status === 'rejected') {
      await User.findByIdAndUpdate(
        member.user,
        { $pull: { joinedClubs: club._id } }
      );
    }

    await club.populate('members.user', 'name username email');
    const updatedMember = club.members.id(memberId);

    res.json({
      success: true,
      message: `Member ${status} successfully`,
      member: updatedMember
    });
  } catch (error) {
    console.error('Update member status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating member status'
    });
  }
});

// @desc    Update member role
// @route   PATCH /api/club-management/club/:clubId/members/:memberId/role
// @access  Private/ClubAdmin
router.patch('/club/:clubId/members/:memberId/role', protect, clubAdminOnly, verifyClubOwnership, async (req, res) => {
  try {
    const { role } = req.body;
    const { memberId } = req.params;

    const validRoles = ['member', 'officer', 'president', 'vice_president', 'secretary', 'treasurer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const club = await Club.findById(req.params.clubId);
    const member = club.members.id(memberId);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    member.role = role;

    // Update leadership positions if needed
    if (role === 'president') {
      club.leadership.president = member.user;
    } else if (role === 'vice_president') {
      club.leadership.vicePresident = member.user;
    } else if (role === 'secretary') {
      club.leadership.secretary = member.user;
    } else if (role === 'treasurer') {
      club.leadership.treasurer = member.user;
    }

    await club.save();
    await club.populate('members.user', 'name username email');
    const updatedMember = club.members.id(memberId);

    res.json({
      success: true,
      message: 'Member role updated successfully',
      member: updatedMember
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating member role'
    });
  }
});

// @desc    Remove member from club
// @route   DELETE /api/club-management/club/:clubId/members/:memberId
// @access  Private/ClubAdmin
router.delete('/club/:clubId/members/:memberId', protect, clubAdminOnly, verifyClubOwnership, async (req, res) => {
  try {
    const { memberId } = req.params;

    const club = await Club.findById(req.params.clubId);
    const member = club.members.id(memberId);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Remove from user's joinedClubs
    await User.findByIdAndUpdate(
      member.user,
      { $pull: { joinedClubs: club._id } }
    );

    // Remove member from club
    club.members.pull(memberId);
    await club.save();

    res.json({
      success: true,
      message: 'Member removed from club successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error removing member'
    });
  }
});

// @desc    Update club information
// @route   PUT /api/club-management/club/:clubId
// @access  Private/ClubAdmin
router.put('/club/:clubId', protect, clubAdminOnly, verifyClubOwnership, async (req, res) => {
  try {
    const allowedUpdates = [
      'description', 'contactEmail', 'contactPhone', 'officeLocation',
      'website', 'meetingSchedule', 'requirements', 'socialMedia'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const club = await Club.findByIdAndUpdate(
      req.params.clubId,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Club information updated successfully',
      club
    });
  } catch (error) {
    console.error('Update club error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating club information'
    });
  }
});

// @desc    Create club event
// @route   POST /api/club-management/club/:clubId/events
// @access  Private/ClubAdmin
router.post('/club/:clubId/events', protect, clubAdminOnly, verifyClubOwnership, async (req, res) => {
  try {
    const { title, description, date, location } = req.body;

    if (!title || !date) {
      return res.status(400).json({
        success: false,
        message: 'Title and date are required'
      });
    }

    const club = await Club.findById(req.params.clubId);
    
    const newEvent = {
      title,
      description,
      date: new Date(date),
      location,
      status: 'planned'
    };

    club.events.push(newEvent);
    await club.save();

    const createdEvent = club.events[club.events.length - 1];

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event: createdEvent
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating event'
    });
  }
});

// @desc    Get club events
// @route   GET /api/club-management/club/:clubId/events
// @access  Private/ClubAdmin
router.get('/club/:clubId/events', protect, clubAdminOnly, verifyClubOwnership, async (req, res) => {
  try {
    const { status, upcoming } = req.query;
    
    const club = await Club.findById(req.params.clubId);
    let events = [...club.events];

    // Filter by status
    if (status && status !== 'all') {
      events = events.filter(event => event.status === status);
    }

    // Filter upcoming events
    if (upcoming === 'true') {
      const now = new Date();
      events = events.filter(event => event.date > now);
    }

    // Sort by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching events'
    });
  }
});

// @desc    Update event
// @route   PUT /api/club-management/club/:clubId/events/:eventId
// @access  Private/ClubAdmin
router.put('/club/:clubId/events/:eventId', protect, clubAdminOnly, verifyClubOwnership, async (req, res) => {
  try {
    const { title, description, date, location, status } = req.body;
    const { eventId } = req.params;

    const club = await Club.findById(req.params.clubId);
    const event = club.events.id(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Update event fields
    if (title) event.title = title;
    if (description) event.description = description;
    if (date) event.date = new Date(date);
    if (location) event.location = location;
    if (status) event.status = status;

    await club.save();

    res.json({
      success: true,
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating event'
    });
  }
});

// @desc    Delete event
// @route   DELETE /api/club-management/club/:clubId/events/:eventId
// @access  Private/ClubAdmin
router.delete('/club/:clubId/events/:eventId', protect, clubAdminOnly, verifyClubOwnership, async (req, res) => {
  try {
    const { eventId } = req.params;

    const club = await Club.findById(req.params.clubId);
    const event = club.events.id(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    club.events.pull(eventId);
    await club.save();

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting event'
    });
  }
});

module.exports = router;