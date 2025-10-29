const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: String,
    required: true
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required for candidates'],
    enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year']
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  profileImage: {
    type: String,
    default: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  platform: [String],
  biography: {
    type: String,
    trim: true,
    maxlength: [1000, 'Biography cannot be more than 1000 characters']
  },
  votes: {
    type: Number,
    default: 0
  },
  voters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

const electionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide an election title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide an election description'],
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  startDate: {
    type: Date,
    required: [true, 'Please provide a start date']
  },
  endDate: {
    type: Date,
    required: [true, 'Please provide an end date']
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  candidates: [candidateSchema],
  totalVotes: {
    type: Number,
    default: 0
  },
  eligibleVoters: {
    type: Number,
    default: 0
  },
  voters: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    votedAt: {
      type: Date,
      default: Date.now
    },
    ipAddress: String
  }],
  electionType: {
    type: String,
    enum: ['president', 'vice_president', 'secretary', 'treasurer', 'branch_leader', 'general'],
    default: 'general'
  },
  rules: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  resultsPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  votingEligibility: {
    roles: [{
      type: String,
      enum: ['student', 'club_admin', 'academic_affairs'],
      default: ['student', 'club_admin', 'academic_affairs']
    }],
    departments: [String],
    years: [{
      type: String,
      enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year']
    }]
  },
  timeRemaining: {
    days: { type: Number, default: 0 },
    hours: { type: Number, default: 0 },
    minutes: { type: Number, default: 0 },
    seconds: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Index for better query performance
electionSchema.index({ status: 1 });
electionSchema.index({ startDate: 1 });
electionSchema.index({ endDate: 1 });
electionSchema.index({ 'voters.user': 1 });

// Update status based on dates
electionSchema.pre('save', function(next) {
  const now = new Date();
  
  if (this.startDate > now) {
    this.status = 'upcoming';
  } else if (this.startDate <= now && this.endDate > now) {
    this.status = 'active';
  } else if (this.endDate <= now) {
    this.status = 'completed';
  }
  
  next();
});

// Virtual for turnout percentage
electionSchema.virtual('turnoutPercentage').get(function() {
  if (this.eligibleVoters === 0) return 0;
  return ((this.totalVotes / this.eligibleVoters) * 100).toFixed(2);
});

// Method to check if user has voted
electionSchema.methods.hasUserVoted = function(userId) {
  return this.voters.some(voter => voter.user.toString() === userId.toString());
};

// Method to get winner
electionSchema.methods.getWinner = function() {
  if (this.candidates.length === 0) return null;
  
  return this.candidates.reduce((winner, candidate) => {
    return candidate.votes > winner.votes ? candidate : winner;
  });
};

// Method to calculate remaining time
electionSchema.methods.calculateTimeRemaining = function() {
  const now = new Date();
  let targetTime;
  
  if (this.status === 'upcoming') {
    targetTime = this.startDate;
  } else if (this.status === 'active') {
    targetTime = this.endDate;
  } else {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }
  
  const timeDiff = targetTime.getTime() - now.getTime();
  
  if (timeDiff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }
  
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
  
  this.timeRemaining = { days, hours, minutes, seconds };
  
  return { days, hours, minutes, seconds, isExpired: false };
};

// Method to check if user is eligible to vote
electionSchema.methods.isUserEligibleToVote = function(user) {
  // Check if user has already voted
  if (this.hasUserVoted(user._id)) {
    return { eligible: false, reason: 'Already voted' };
  }
  
  // Check election status
  if (this.status !== 'active') {
    return { eligible: false, reason: 'Election not active' };
  }
  
  // Check role eligibility
  if (this.votingEligibility.roles.length > 0 && 
      !this.votingEligibility.roles.includes(user.role)) {
    return { eligible: false, reason: 'Role not eligible' };
  }
  
  // Check department eligibility
  if (this.votingEligibility.departments.length > 0 && 
      !this.votingEligibility.departments.includes(user.department)) {
    return { eligible: false, reason: 'Department not eligible' };
  }
  
  // Check year eligibility
  if (this.votingEligibility.years.length > 0 && 
      !this.votingEligibility.years.includes(user.year)) {
    return { eligible: false, reason: 'Academic year not eligible' };
  }
  
  return { eligible: true, reason: 'Eligible to vote' };
};

// Static method to get active elections with time remaining
electionSchema.statics.getActiveElectionsWithTimer = function() {
  return this.find({ status: 'active' }).then(elections => {
    return elections.map(election => {
      const timeRemaining = election.calculateTimeRemaining();
      return {
        ...election.toObject(),
        timeRemaining
      };
    });
  });
};

module.exports = mongoose.model('Election', electionSchema);
