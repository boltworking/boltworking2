const express = require('express');
const Election = require('../models/Election');
const User = require('../models/User');
const { protect, adminOnly, superAdminOnly, presidentOrSuperAdmin, optionalAuth, authorize } = require('../middleware/auth');
const { validateElection } = require('../middleware/validation');
const { getElectionWithTimer, getAllElectionsWithTimer, validateElectionDates, updateElectionStatuses } = require('../utils/electionTimer');

const router = express.Router();

/* ===========================
   @desc    Get all elections
   @route   GET /api/elections
   @access  Public
=========================== */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, type, search } = req.query;

    let query = {};

    // Show only public elections for non-admins
    if (!req.user || !req.user.isAdmin) query.isPublic = true;

    if (status) query.status = status;
    if (type) query.electionType = type;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Get elections with timer information
    const allElections = await getAllElectionsWithTimer(query);
    
    // Apply pagination
    const elections = allElections.slice(skip, skip + limit);
    const total = allElections.length;
    
    // Add canVote field for frontend
    elections.forEach(election => {
      election.canVote = election.currentStatus === 'active';
    });

    res.json({
      success: true,
      count: elections.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      elections,
      data: elections
    });
  } catch (error) {
    console.error('Get elections error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching elections' });
  }
});

/* ===========================
   @desc    Get single election
   @route   GET /api/elections/:id
   @access  Public
=========================== */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    // Get election with timer information
    const election = await getElectionWithTimer(req.params.id);

    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }

    if ((!req.user || !req.user.isAdmin) && !election.isPublic) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }

    // Hide voters for non-admins
    if (!req.user || !req.user.isAdmin) {
      election.voters = election.voters.map(v => ({ votedAt: v.votedAt }));
    }

    election.canVote = election.currentStatus === 'active'

    res.json({ success: true, election });
  } catch (error) {
    console.error('Get election error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching election' });
  }
});

/* ===========================
   @desc    Create new election
   @route   POST /api/elections
   @access  Private/President Admin or Super Admin Only
=========================== */
router.post('/', protect, authorize(['president_admin', 'admin', 'super_admin']), validateElection, async (req, res) => {
  try {
    const { title, description, startDate, endDate, candidates, electionType, rules, isPublic } = req.body;

    // Check user permissions
    if (!req.user.permissions || !req.user.permissions.canCreateElections) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create elections'
      });
    }

    // Validate election dates
    const dateValidation = validateElectionDates(startDate, endDate);
    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election dates',
        errors: dateValidation.errors
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const eligibleVoters = await User.countDocuments({ role: 'student', isActive: true });

    const electionData = {
      title,
      description,
      startDate: start,
      endDate: end,
      candidates: candidates || [],
      electionType: electionType || 'general',
      rules: rules || [],
      isPublic: isPublic !== false,
      eligibleVoters,
      createdBy: req.user._id || req.user.id
    };

    const election = await Election.create(electionData);
    await election.populate('createdBy', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Election created successfully',
      election
    });
  } catch (error) {
    console.error('Create election error:', error);
    res.status(500).json({ success: false, message: 'Server error creating election' });
  }
});

/* ===========================
   @desc    Update election
   @route   PUT /api/elections/:id
   @access  Private/President Admin or Super Admin Only
=========================== */
router.put('/:id', protect, presidentOrSuperAdmin, async (req, res) => {
  try {
    const { title, description, startDate, endDate, candidates, rules, isPublic } = req.body;

    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ success: false, message: 'Election not found' });

    if (['active', 'completed'].includes(election.status)) {
      return res.status(400).json({ success: false, message: 'Cannot update active or completed elections' });
    }

    if (startDate || endDate) {
      const start = new Date(startDate || election.startDate);
      const end = new Date(endDate || election.endDate);
      const now = new Date();

      if (start < now)
        return res.status(400).json({ success: false, message: 'Start date cannot be in the past' });
      if (end <= start)
        return res.status(400).json({ success: false, message: 'End date must be after start date' });

      election.startDate = start;
      election.endDate = end;
    }

    if (title) election.title = title;
    if (description) election.description = description;
    if (candidates) election.candidates = candidates;
    if (rules) election.rules = rules;
    if (typeof isPublic === 'boolean') election.isPublic = isPublic;

    await election.save();

    res.json({ success: true, message: 'Election updated successfully', election });
  } catch (error) {
    console.error('Update election error:', error);
    res.status(500).json({ success: false, message: 'Server error updating election' });
  }
});

/* ===========================
   @desc    Delete election
   @route   DELETE /api/elections/:id
   @access  Private/President Admin or Super Admin Only
=========================== */
router.delete('/:id', protect, presidentOrSuperAdmin, async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ success: false, message: 'Election not found' });

    if (election.status === 'active')
      return res.status(400).json({ success: false, message: 'Cannot delete active elections' });

    await Election.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Election deleted successfully' });
  } catch (error) {
    console.error('Delete election error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting election' });
  }
});

/* ===========================
   @desc    Vote in election
   @route   POST /api/elections/:id/vote
   @access  Private
=========================== */
router.post('/:id/vote', protect, async (req, res) => {
  try {
    const { candidateId } = req.body;
    if (!candidateId) return res.status(400).json({ success: false, message: 'Candidate ID is required' });

    // Check if user has permission to vote
    if (!req.user.permissions || !req.user.permissions.canVoteElections) {
      return res.status(403).json({ success: false, message: 'You do not have permission to vote in elections' });
    }

    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ success: false, message: 'Election not found' });

    if (election.status !== 'active')
      return res.status(400).json({ success: false, message: 'Election is not active' });

    if (election.hasUserVoted(req.user._id || req.user.id))
      return res.status(400).json({ success: false, message: 'You have already voted' });

    const candidate = election.candidates.id(candidateId);
    if (!candidate) return res.status(400).json({ success: false, message: 'Invalid candidate' });

    election.voters.push({
      user: req.user._id || req.user.id,
      candidate: candidateId,
      ipAddress: req.ip
    });

    candidate.votes += 1;
    candidate.voters.push(req.user.id);
    election.totalVotes += 1;

    await election.save();

    await User.findByIdAndUpdate(req.user._id || req.user.id, {
      $addToSet: { votedElections: election._id }
    });

    res.json({
      success: true,
      message: 'Vote cast successfully',
      election: { id: election._id, totalVotes: election.totalVotes, hasVoted: true }
    });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ success: false, message: 'Server error casting vote' });
  }
});

/* ===========================
   @desc    Announce results
   @route   POST /api/elections/:id/announce
   @access  Private/President Admin or Super Admin Only
=========================== */
router.post('/:id/announce', protect, presidentOrSuperAdmin, async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ success: false, message: 'Election not found' });

    if (election.status !== 'completed')
      return res.status(400).json({ success: false, message: 'Can only announce completed elections' });

    election.resultsPublished = true;
    election.publishedAt = new Date();
    await election.save();

    res.json({
      success: true,
      message: 'Results announced successfully',
      winner: election.getWinner()
    });
  } catch (error) {
    console.error('Announce results error:', error);
    res.status(500).json({ success: false, message: 'Server error announcing results' });
  }
});

/* ===========================
   @desc    Election statistics
   @route   GET /api/elections/stats/overview
   @access  Private/Super Admin Only
=========================== */
router.get('/stats/overview', protect, superAdminOnly, async (req, res) => {
  try {
    const totalElections = await Election.countDocuments();
    const activeElections = await Election.countDocuments({ status: 'active' });
    const upcomingElections = await Election.countDocuments({ status: 'upcoming' });
    const completedElections = await Election.countDocuments({ status: 'completed' });

    const electionsByType = await Election.aggregate([
      { $group: { _id: '$electionType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const voteStats = await Election.aggregate([
      { $group: { _id: null, totalVotes: { $sum: '$totalVotes' }, avgTurnout: { $avg: '$turnoutPercentage' } } }
    ]);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const recentElections = await Election.countDocuments({ createdAt: { $gte: ninetyDaysAgo } });

    res.json({
      success: true,
      stats: {
        totalElections,
        activeElections,
        upcomingElections,
        completedElections,
        recentElections,
        totalVotes: voteStats[0]?.totalVotes || 0,
        avgTurnout: Math.round(voteStats[0]?.avgTurnout || 0),
        electionsByType
      }
    });
  } catch (error) {
    console.error('Get election stats error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching election statistics' });
  }
});

// @desc    Get election timer
// @route   GET /api/elections/:id/timer
// @access  Public
router.get('/:id/timer', optionalAuth, async (req, res) => {
  try {
    const election = await getElectionWithTimer(req.params.id);

    if (!election) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }

    if ((!req.user || !req.user.isAdmin) && !election.isPublic) {
      return res.status(404).json({ success: false, message: 'Election not found' });
    }

    res.json({
      success: true,
      timer: election.timer,
      status: election.currentStatus,
      canVote: election.currentStatus === 'active',
      election: {
        id: election._id,
        title: election.title,
        startDate: election.startDate,
        endDate: election.endDate
      }
    });
  } catch (error) {
    console.error('Get election timer error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching election timer' });
  }
});

// @desc    Update all election statuses
// @route   POST /api/elections/update-statuses
// @access  Private/Super Admin Only
router.post('/update-statuses', protect, superAdminOnly, async (req, res) => {
  try {
    await updateElectionStatuses();
    res.json({
      success: true,
      message: 'Election statuses updated successfully'
    });
  } catch (error) {
    console.error('Update election statuses error:', error);
    res.status(500).json({ success: false, message: 'Server error updating election statuses' });
  }
});

module.exports = router;
