const express = require('express');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { protect, adminOnly, authorize } = require('../middleware/auth');
const { validateComplaint } = require('../middleware/validation');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = 'uploads/complaints';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration for complaint documents
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for complaint documents
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
    }
  }
});

// @desc    Get all complaints
// @route   GET /api/complaints
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { status, category, priority, search } = req.query;

    // Build query
    let query = {};
    
    // Role-based filtering for complaints
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      if (req.user.role === 'academic_affairs') {
        // Academic affairs can only see academic complaints
        query.complaintType = 'academic';
      } else if (req.user.role === 'president_admin') {
        // President admin can only see general complaints
        query.complaintType = 'general';
      } else {
        // Regular users (students, club_admin) can only see their own complaints
        query.submittedBy = req.user.id;
      }
    }

    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { caseId: { $regex: search, $options: 'i' } }
      ];
    }

    const complaints = await Complaint.find(query)
      .populate('submittedBy', 'name email studentId')
      .populate('assignedTo', 'name email role')
      .populate('responses.authorId', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Complaint.countDocuments(query);

    res.json({
      success: true,
      count: complaints.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      complaints,
      data: complaints // Add data field for compatibility
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching complaints'
    });
  }
});

// @desc    Get single complaint
// @route   GET /api/complaints/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('submittedBy', 'name email studentId')
      .populate('assignedTo', 'name email role')
      .populate('responses.authorId', 'name role');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Check if user can access this complaint based on role
    const canView = complaint.submittedBy && complaint.submittedBy._id.toString() === req.user.id ||
                   ['admin', 'super_admin'].includes(req.user.role) ||
                   (req.user.role === 'president_admin' && complaint.complaintType === 'general') ||
                   (req.user.role === 'academic_affairs' && complaint.complaintType === 'academic');

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this complaint'
      });
    }

    res.json({
      success: true,
      complaint
    });
  } catch (error) {
    console.error('Get complaint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching complaint'
    });
  }
});

// @desc    Create new complaint
// @route   POST /api/complaints
// @access  Private
router.post('/', protect, upload.array('documents', 5), validateComplaint, async (req, res) => {
  try {
    // Check if user can write complaints
    if (!req.user.permissions || !req.user.permissions.canWriteComplaints) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to write complaints'
      });
    }

    const { title, description, category, priority, branch, complaintType } = req.body;

    // Handle uploaded documents
    let documents = [];
    if (req.files && req.files.length > 0) {
      documents = req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: `/uploads/complaints/${file.filename}`,
        uploadedAt: new Date()
      }));
    }

    const complaint = await Complaint.create({
      title,
      description,
      category,
      priority: priority || 'medium',
      branch: branch || category,
      complaintType: complaintType || 'general',
      submittedBy: req.user._id || req.user.id,
      documents: documents
    });

    await complaint.populate('submittedBy', 'name email studentId');

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      complaint
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating complaint'
    });
  }
});

// @desc    Update complaint status
// @route   PATCH /api/complaints/:id/status
// @access  Private/Admin
router.patch('/:id/status', protect, authorize(['admin', 'super_admin', 'president_admin', 'academic_affairs']), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['submitted', 'under_review', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID'
      });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Check if user can manage this complaint type
    const canManage = ['admin', 'super_admin'].includes(req.user.role) ||
                     (req.user.role === 'president_admin' && complaint.complaintType === 'general') ||
                     (req.user.role === 'academic_affairs' && complaint.complaintType === 'academic');

    if (!canManage) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this complaint'
      });
    }

    complaint.status = status;
    if (status === 'under_review' && !complaint.assignedTo) {
      complaint.assignedTo = req.user.id;
    }

    await complaint.save();
    await complaint.populate('submittedBy', 'name email');
    await complaint.populate('assignedTo', 'name email role');

    res.json({
      success: true,
      message: 'Complaint status updated successfully',
      complaint
    });
  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating complaint status'
    });
  }
});

// @desc    Add documents to complaint
// @route   POST /api/complaints/:id/documents
// @access  Private (complaint owner or resolver)
router.post('/:id/documents', protect, upload.array('documents', 5), async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Check if user can add documents (complaint owner or authorized resolver)
    const canAddDocuments = 
      (complaint.submittedBy && complaint.submittedBy.toString() === req.user.id) ||
      ['admin', 'super_admin'].includes(req.user.role) ||
      (req.user.role === 'president_admin' && complaint.complaintType === 'general') ||
      (req.user.role === 'academic_affairs' && complaint.complaintType === 'academic');

    if (!canAddDocuments) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add documents to this complaint'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No documents uploaded'
      });
    }

    const newDocuments = req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/complaints/${file.filename}`,
      uploadedAt: new Date(),
      uploadedBy: req.user.id
    }));

    complaint.documents = complaint.documents || [];
    complaint.documents.push(...newDocuments);
    await complaint.save();

    res.status(200).json({
      success: true,
      message: `${newDocuments.length} document(s) added successfully`,
      documents: newDocuments
    });
  } catch (error) {
    console.error('Add documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding documents'
    });
  }
});

// @desc    Add response to complaint
// @route   POST /api/complaints/:id/responses
// @access  Private/Admin
router.post('/:id/responses', protect, authorize(['admin', 'super_admin', 'president_admin', 'academic_affairs']), async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Response message is required'
      });
    }

    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID'
      });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Check if user can respond to this complaint type
    const canRespond = ['admin', 'super_admin'].includes(req.user.role) ||
                      (req.user.role === 'president_admin' && complaint.complaintType === 'general') ||
                      (req.user.role === 'academic_affairs' && complaint.complaintType === 'academic');

    if (!canRespond) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to respond to this complaint'
      });
    }

    const response = {
      author: req.user.name,
      authorId: req.user.id,
      message: typeof message === 'string' ? message.trim() : message.message?.trim() || '',
      isOfficial: true
    };

    complaint.responses.push(response);
    
    // Update status to under_review if it's still submitted
    if (complaint.status === 'submitted') {
      complaint.status = 'under_review';
      complaint.assignedTo = req.user.id;
    }

    await complaint.save();
    await complaint.populate('responses.authorId', 'name role');

    res.json({
      success: true,
      message: 'Response added successfully',
      response: complaint.responses[complaint.responses.length - 1]
    });
  } catch (error) {
    console.error('Add response error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding response'
    });
  }
});

// @desc    Assign complaint to admin
// @route   PATCH /api/complaints/:id/assign
// @access  Private/Admin
router.patch('/:id/assign', protect, adminOnly, async (req, res) => {
  try {
    const { assignedTo } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Verify assigned user exists and is admin
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser || !assignedUser.isAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user assignment'
      });
    }

    complaint.assignedTo = assignedTo;
    if (complaint.status === 'submitted') {
      complaint.status = 'under_review';
    }

    await complaint.save();
    await complaint.populate('assignedTo', 'name email role');

    return res.json({
      success: true,
      message: 'Complaint assigned successfully',
      complaint
    });
  } catch (error) {
    console.error('Assign complaint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error assigning complaint'
    });
  }
});

// @desc    Get complaint statistics
// @route   GET /api/complaints/stats/overview
// @access  Private/Admin
router.get('/stats/overview', protect, adminOnly, async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const pendingComplaints = await Complaint.countDocuments({ status: 'submitted' });
    const underReviewComplaints = await Complaint.countDocuments({ status: 'under_review' });
    const resolvedComplaints = await Complaint.countDocuments({ status: 'resolved' });

    // Complaints by category
    const complaintsByCategory = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Complaints by priority
    const complaintsByPriority = await Complaint.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Recent complaints (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentComplaints = await Complaint.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Average resolution time
    const resolvedComplaintsWithTime = await Complaint.find({
      status: 'resolved',
      resolvedAt: { $exists: true }
    }).select('createdAt resolvedAt');

    let avgResolutionTime = 0;
    if (resolvedComplaintsWithTime.length > 0) {
      const totalTime = resolvedComplaintsWithTime.reduce((sum, complaint) => {
        return sum + (complaint.resolvedAt - complaint.createdAt);
      }, 0);
      avgResolutionTime = Math.round(totalTime / resolvedComplaintsWithTime.length / (1000 * 60 * 60 * 24)); // in days
    }

    return res.json({
      success: true,
      stats: {
        totalComplaints,
        pendingComplaints,
        underReviewComplaints,
        resolvedComplaints,
        recentComplaints,
        avgResolutionTime,
        complaintsByCategory,
        complaintsByPriority
      }
    });
  } catch (error) {
    console.error('Get complaint stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching complaint statistics'
    });
  }
});

// @desc    Delete complaint (Admin only)
// @route   DELETE /api/complaints/:id
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID'
      });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    await Complaint.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: 'Complaint deleted successfully'
    });
  } catch (error) {
    console.error('Delete complaint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting complaint'
    });
  }
});

// @desc    Get complaints by type (for role-based filtering)
// @route   GET /api/complaints/type/:type
// @access  Private (Admin, President Admin, Academic Affairs)
router.get('/type/:type',
  protect,
  authorize(['admin', 'super_admin', 'president_admin', 'academic_affairs']),
  async (req, res) => {
    try {
      const { type } = req.params;
      const { status, page = 1, limit = 10 } = req.query;

      if (!['general', 'academic'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid complaint type'
        });
      }

      // Check authorization for the complaint type
      if (type === 'academic' && req.user.role === 'president_admin') {
        return res.status(403).json({
          success: false,
          message: 'President admin cannot access academic complaints'
        });
      }

      if (type === 'general' && req.user.role === 'academic_affairs') {
        return res.status(403).json({
          success: false,
          message: 'Academic affairs cannot access general complaints'
        });
      }

      const skip = (page - 1) * limit;
      let filter = { complaintType: type };
      if (status) filter.status = status;

      const complaints = await Complaint.find(filter)
        .populate('submittedBy', 'name username department year')
        .populate('assignedTo', 'name role')
        .populate('resolvedBy', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Complaint.countDocuments(filter);

      res.status(200).json({
        success: true,
        count: complaints.length,
        total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        data: complaints
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

// @desc    Resolve complaint with role-based resolution tracking
// @route   PUT /api/complaints/:id/resolve
// @access  Private (Admin, President Admin, Academic Affairs)
router.put('/:id/resolve',
  protect,
  authorize(['admin', 'super_admin', 'president_admin', 'academic_affairs']),
  async (req, res) => {
    try {
      const { resolutionNotes } = req.body;
      
      const complaint = await Complaint.findById(req.params.id);

      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: 'Complaint not found'
        });
      }

      // Check if user can resolve this complaint
      const canResolve = complaint.canUserResolve ? complaint.canUserResolve(req.user.role) : (
        ['admin', 'super_admin'].includes(req.user.role) ||
        (req.user.role === 'president_admin' && complaint.complaintType === 'general') ||
        (req.user.role === 'academic_affairs' && complaint.complaintType === 'academic')
      );

      if (!canResolve) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to resolve this complaint'
        });
      }

      complaint.status = 'resolved';
      complaint.resolvedBy = req.user.id;
      complaint.resolvedAt = new Date();
      complaint.resolutionNotes = resolutionNotes || '';
      
      if (req.user.role === 'academic_affairs') {
        complaint.resolutionType = 'academic_affairs_resolved';
      } else if (req.user.role === 'president_admin') {
        complaint.resolutionType = 'president_admin_resolved';
      } else {
        complaint.resolutionType = 'admin_resolved';
      }

      await complaint.save();

      const updatedComplaint = await Complaint.findById(complaint._id)
        .populate('resolvedBy', 'name role');

      res.status(200).json({
        success: true,
        message: 'Complaint resolved successfully',
        complaint: updatedComplaint
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

module.exports = router;
