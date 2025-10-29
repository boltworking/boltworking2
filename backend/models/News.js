const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a news title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Please provide news content'],
    trim: true,
    maxlength: [2000, 'Content cannot be more than 2000 characters']
  },
  summary: {
    type: String,
    trim: true,
    maxlength: [300, 'Summary cannot be more than 300 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['general', 'election', 'club_announcement', 'academic', 'event', 'urgent'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    filename: String,
    originalname: String,
    mimetype: String,
    size: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  images: [{
    url: String,
    caption: String,
    alt: String
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Comment cannot be more than 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  visibility: {
    type: String,
    enum: ['public', 'students_only', 'club_admins_only', 'admin_only'],
    default: 'public'
  },
  targetAudience: [{
    type: String,
    enum: ['all', 'students', 'club_admins', 'academic_affairs', 'president_admin']
  }]
}, {
  timestamps: true
});

// Indexes for better performance
newsSchema.index({ status: 1 });
newsSchema.index({ publishedAt: -1 });
newsSchema.index({ category: 1 });
newsSchema.index({ author: 1 });
newsSchema.index({ isPinned: -1 });
newsSchema.index({ priority: -1 });

// Virtual for like count
newsSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
newsSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Virtual for read count
newsSchema.virtual('readCount').get(function() {
  return this.readBy.length;
});

// Method to check if user has liked the news
newsSchema.methods.hasUserLiked = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Method to check if user has read the news
newsSchema.methods.hasUserRead = function(userId) {
  return this.readBy.some(read => read.user.toString() === userId.toString());
};

// Pre-save middleware to set published date
newsSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Static method to get published news
newsSchema.statics.getPublishedNews = function(filter = {}) {
  return this.find({ 
    status: 'published', 
    ...filter,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  }).sort({ isPinned: -1, publishedAt: -1 });
};

// Static method to get news by category
newsSchema.statics.getNewsByCategory = function(category) {
  return this.getPublishedNews({ category });
};

// Static method to get pinned news
newsSchema.statics.getPinnedNews = function() {
  return this.getPublishedNews({ isPinned: true });
};

module.exports = mongoose.model('News', newsSchema);