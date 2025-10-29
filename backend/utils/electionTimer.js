const Election = require('../models/Election');

// Calculate time remaining until election starts or ends
const calculateTimeRemaining = (targetDate) => {
  const now = new Date();
  const target = new Date(targetDate);
  const timeDiff = target - now;

  if (timeDiff <= 0) {
    return {
      expired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0
    };
  }

  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

  return {
    expired: false,
    days,
    hours,
    minutes,
    seconds,
    totalMs: timeDiff
  };
};

// Get election status with timing information
const getElectionWithTimer = async (electionId) => {
  const election = await Election.findById(electionId)
    .populate('candidates.voters', 'name username')
    .populate('createdBy', 'name username');

  if (!election) {
    return null;
  }

  const now = new Date();
  const startDate = new Date(election.startDate);
  const endDate = new Date(election.endDate);

  let timer = {};
  let status = election.status;

  // Calculate timer based on current status
  if (now < startDate) {
    // Election hasn't started yet
    timer = {
      type: 'starts_in',
      ...calculateTimeRemaining(startDate)
    };
    status = 'upcoming';
  } else if (now >= startDate && now < endDate) {
    // Election is active
    timer = {
      type: 'ends_in',
      ...calculateTimeRemaining(endDate)
    };
    status = 'active';
  } else {
    // Election has ended
    timer = {
      type: 'ended',
      expired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0
    };
    status = 'completed';
  }

  // Update election status if it has changed
  if (election.status !== status) {
    election.status = status;
    await election.save();
  }

  return {
    ...election.toObject(),
    timer,
    currentStatus: status
  };
};

// Get all elections with timing information
const getAllElectionsWithTimer = async (query = {}) => {
  const elections = await Election.find(query)
    .populate('candidates.voters', 'name username')
    .populate('createdBy', 'name username')
    .sort({ startDate: -1 });

  return Promise.all(
    elections.map(async (election) => {
      const electionWithTimer = await getElectionWithTimer(election._id);
      return electionWithTimer;
    })
  );
};

// Update all election statuses based on current time
const updateElectionStatuses = async () => {
  try {
    const now = new Date();

    // Update upcoming elections that should be active
    await Election.updateMany(
      {
        startDate: { $lte: now },
        endDate: { $gt: now },
        status: 'upcoming'
      },
      { status: 'active' }
    );

    // Update active elections that should be completed
    await Election.updateMany(
      {
        endDate: { $lte: now },
        status: 'active'
      },
      { status: 'completed' }
    );

    console.log('Election statuses updated successfully');
  } catch (error) {
    console.error('Error updating election statuses:', error);
  }
};

// Format time for display
const formatTimeRemaining = (timer) => {
  if (timer.expired) {
    return timer.type === 'ended' ? 'Election has ended' : 'Election is starting';
  }

  const parts = [];
  if (timer.days > 0) parts.push(`${timer.days} day${timer.days !== 1 ? 's' : ''}`);
  if (timer.hours > 0) parts.push(`${timer.hours} hour${timer.hours !== 1 ? 's' : ''}`);
  if (timer.minutes > 0) parts.push(`${timer.minutes} minute${timer.minutes !== 1 ? 's' : ''}`);
  if (timer.seconds > 0 && timer.days === 0 && timer.hours === 0) {
    parts.push(`${timer.seconds} second${timer.seconds !== 1 ? 's' : ''}`);
  }

  if (parts.length === 0) {
    return 'Less than a minute';
  }

  return parts.join(', ');
};

// Validate election dates
const validateElectionDates = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  const errors = [];

  // Check if dates are valid
  if (isNaN(start.getTime())) {
    errors.push('Invalid start date');
  }
  if (isNaN(end.getTime())) {
    errors.push('Invalid end date');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Check if end date is after start date
  if (end <= start) {
    errors.push('End date must be after start date');
  }

  // Check if start date is in the future (for new elections)
  if (start <= now) {
    errors.push('Start date must be in the future');
  }

  // Check minimum election duration (at least 1 hour)
  const minDuration = 60 * 60 * 1000; // 1 hour in milliseconds
  if (end - start < minDuration) {
    errors.push('Election must run for at least 1 hour');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Get elections that are about to start (within next 24 hours)
const getUpcomingElections = async () => {
  const now = new Date();
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return await Election.find({
    startDate: { $gt: now, $lte: next24Hours },
    status: 'upcoming'
  }).populate('createdBy', 'name email');
};

// Get elections that are about to end (within next 2 hours)
const getElectionsAboutToEnd = async () => {
  const now = new Date();
  const next2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  return await Election.find({
    endDate: { $gt: now, $lte: next2Hours },
    status: 'active'
  }).populate('createdBy', 'name email');
};

module.exports = {
  calculateTimeRemaining,
  getElectionWithTimer,
  getAllElectionsWithTimer,
  updateElectionStatuses,
  formatTimeRemaining,
  validateElectionDates,
  getUpcomingElections,
  getElectionsAboutToEnd
};