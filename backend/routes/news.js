const express = require('express');
const News = require('../models/News');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/news/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and documents are allowed.'));
    }
  }
});

// @desc    Get all published news
// @route   GET /api/news
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (category) {
      filter.category = category;
    }

    const news = await News.getPublishedNews(filter)
      .populate('author', 'name role')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await News.countDocuments({ 
      status: 'published', 
      ...filter,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    res.status(200).json({
      success: true,
      count: news.length,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: news
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get pinned news
// @route   GET /api/news/pinned
// @access  Public
router.get('/pinned', async (req, res) => {
  try {
    const pinnedNews = await News.getPinnedNews()
      .populate('author', 'name role')
      .limit(5);

    res.status(200).json({
      success: true,
      count: pinnedNews.length,
      data: pinnedNews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get single news post
// @route   GET /api/news/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const news = await News.findById(req.params.id)
      .populate('author', 'name role')
      .populate('comments.user', 'name');

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News post not found'
      });
    }

    // Mark as read if user is authenticated
    if (req.user && !news.hasUserRead(req.user.id)) {
      news.readBy.push({ user: req.user.id });
      await news.save();
    }

    res.status(200).json({
      success: true,
      data: news
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Create news post
// @route   POST /api/news
// @access  President Admin, Admin, Super Admin
router.post('/', 
  protect, 
  authorize(['president_admin', 'admin', 'super_admin']),
  upload.array('attachments', 5),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('content').notEmpty().withMessage('Content is required'),
    body('category').optional().isIn(['general', 'election', 'club_announcement', 'academic', 'event', 'urgent'])
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
      if (!req.user.permissions.canPostNews) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to post news'
        });
      }

      const newsData = {
        ...req.body,
        author: req.user.id
      };

      // Handle file attachments
      if (req.files && req.files.length > 0) {
        newsData.attachments = req.files.map(file => ({
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          url: `/uploads/news/${file.filename}`
        }));
      }

      const news = await News.create(newsData);
      
      const populatedNews = await News.findById(news._id)
        .populate('author', 'name role');

      res.status(201).json({
        success: true,
        message: 'News post created successfully',
        data: populatedNews
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

// @desc    Update news post
// @route   PUT /api/news/:id
// @access  Author, Admin, Super Admin
router.put('/:id', 
  protect,
  upload.array('attachments', 5),
  async (req, res) => {
    try {
      let news = await News.findById(req.params.id);

      if (!news) {
        return res.status(404).json({
          success: false,
          message: 'News post not found'
        });
      }

      // Check if user is the author or has admin privileges
      if (news.author.toString() !== req.user.id && 
          !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this news post'
        });
      }

      // Handle file attachments
      if (req.files && req.files.length > 0) {
        const newAttachments = req.files.map(file => ({
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          url: `/uploads/news/${file.filename}`
        }));
        req.body.attachments = [...(news.attachments || []), ...newAttachments];
      }

      news = await News.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('author', 'name role');

      res.status(200).json({
        success: true,
        message: 'News post updated successfully',
        data: news
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

// @desc    Delete news post
// @route   DELETE /api/news/:id
// @access  Author, Admin, Super Admin
router.delete('/:id', protect, async (req, res) => {
  try {
    const news = await News.findById(req.params.id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News post not found'
      });
    }

    // Check if user is the author or has admin privileges
    if (news.author.toString() !== req.user.id && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this news post'
      });
    }

    await News.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'News post deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Like/Unlike news post
// @route   POST /api/news/:id/like
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const news = await News.findById(req.params.id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News post not found'
      });
    }

    const hasLiked = news.hasUserLiked(req.user.id);

    if (hasLiked) {
      // Unlike
      news.likes = news.likes.filter(like => 
        like.user.toString() !== req.user.id
      );
    } else {
      // Like
      news.likes.push({ user: req.user.id });
    }

    await news.save();

    res.status(200).json({
      success: true,
      message: hasLiked ? 'News post unliked' : 'News post liked',
      likeCount: news.likes.length,
      hasLiked: !hasLiked
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Add comment to news post
// @route   POST /api/news/:id/comment
// @access  Private
router.post('/:id/comment', 
  protect,
  [
    body('content').notEmpty().withMessage('Comment content is required')
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

      const news = await News.findById(req.params.id);

      if (!news) {
        return res.status(404).json({
          success: false,
          message: 'News post not found'
        });
      }

      news.comments.push({
        user: req.user.id,
        content: req.body.content
      });

      await news.save();

      const populatedNews = await News.findById(news._id)
        .populate('comments.user', 'name');

      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: populatedNews.comments[populatedNews.comments.length - 1]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }
);

// @desc    Get news by category
// @route   GET /api/news/category/:category
// @access  Public
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const news = await News.getNewsByCategory(category)
      .populate('author', 'name role')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await News.countDocuments({ 
      category, 
      status: 'published',
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    res.status(200).json({
      success: true,
      count: news.length,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: news
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;