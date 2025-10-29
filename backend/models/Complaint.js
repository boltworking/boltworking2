/** @format */

const mongoose = require("mongoose");
function generateCaseId() {
	const date = new Date();
	const formattedDate = date.toISOString().split("T")[0].replace(/-/g, ""); // Format YYYYMMDD
	const randomNum = Math.floor(Math.random() * 10000); // Random number between 0-9999
	return `CASE-${formattedDate}-${randomNum}`;
}
const responseSchema = new mongoose.Schema({
	author: {
		type: String,
		required: true,
	},
	authorId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	message: {
		type: String,
		required: true,
		trim: true,
	},
	timestamp: {
		type: Date,
		default: Date.now,
	},
	isOfficial: {
		type: Boolean,
		default: false,
	},
});

const complaintSchema = new mongoose.Schema(
	{
		title: {
			type: String,
			required: [true, "Please provide a complaint title"],
			trim: true,
			maxlength: [200, "Title cannot be more than 200 characters"],
		},
		description: {
			type: String,
			required: [true, "Please provide a complaint description"],
			trim: true,
			maxlength: [2000, "Description cannot be more than 2000 characters"],
		},
		category: {
			type: String,
			required: [true, "Please select a category"],
			enum: [
				"academic",
				"dining",
				"housing",
				"facilities",
				"disciplinary",
				"general",
				"club_related",
				"election_related"
			],
		},
		complaintType: {
			type: String,
			enum: ["general", "academic"],
			default: "general",
			required: true
		},
		priority: {
			type: String,
			enum: ["low", "medium", "high"],
			default: "medium",
		},
		status: {
			type: String,
			enum: ["submitted", "under_review", "resolved", "closed"],
			default: "submitted",
		},
		submittedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		assignedTo: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
		resolvedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		resolutionType: {
			type: String,
			enum: ["president_admin_resolved", "academic_affairs_resolved", "admin_resolved"],
		},
		branch: {
			type: String,
			enum: [
				"academic",
				"dining",
				"housing",
				"facilities",
				"disciplinary",
				"general",
			],
		},
		caseId: {
			type: String,
			unique: true,
			required: true,
			default: generateCaseId, // Use the function to generate caseId
		},
		responses: [responseSchema],
		evidence: [
			{
				filename: String,
				originalName: String,
				mimetype: String,
				size: Number,
				uploadDate: {
					type: Date,
					default: Date.now,
				},
			},
		],
		tags: [String],
		isUrgent: {
			type: Boolean,
			default: false,
		},
		resolvedAt: Date,
		closedAt: Date,
		satisfactionRating: {
			type: Number,
			min: 1,
			max: 5,
		},
		satisfactionFeedback: String,
		documents: [{
			filename: String,
			originalname: String,
			mimetype: String,
			size: Number,
			url: String,
			uploadedBy: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "User"
			},
			uploadedAt: {
				type: Date,
				default: Date.now
			},
			documentType: {
				type: String,
				enum: ["evidence", "resolution_document", "additional_info"],
				default: "additional_info"
			}
		}],
		resolutionNotes: {
			type: String,
			trim: true,
			maxlength: [1000, "Resolution notes cannot be more than 1000 characters"]
		},
		canBeResolvedBy: [{
			type: String,
			enum: ["president_admin", "academic_affairs", "admin", "super_admin"]
		}],
	},
	{
		timestamps: true,
	}
);

// Index for better query performance
complaintSchema.index({ submittedBy: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ caseId: 1 });
complaintSchema.index({ createdAt: -1 });

// Generate case ID before saving and set resolution permissions
complaintSchema.pre("save", function (next) {
	if (!this.caseId) {
		this.caseId = generateCaseId();
	}

	// Set who can resolve based on complaint type
	if (this.isNew || this.isModified('complaintType')) {
		if (this.complaintType === 'academic') {
			this.canBeResolvedBy = ['academic_affairs', 'admin', 'super_admin'];
		} else {
			this.canBeResolvedBy = ['president_admin', 'admin', 'super_admin'];
		}
	}

	next();
});

// Update resolved/closed timestamps
complaintSchema.pre("save", function (next) {
	if (this.isModified("status")) {
		if (this.status === "resolved" && !this.resolvedAt) {
			this.resolvedAt = new Date();
		}
		if (this.status === "closed" && !this.closedAt) {
			this.closedAt = new Date();
		}
	}
	next();
});

// Method to check if user can resolve this complaint
complaintSchema.methods.canUserResolve = function(userRole) {
	return this.canBeResolvedBy.includes(userRole);
};

// Method to add document to complaint
complaintSchema.methods.addDocument = function(document, uploadedBy) {
	this.documents.push({
		...document,
		uploadedBy: uploadedBy,
		uploadedAt: new Date()
	});
	return this.save();
};

// Static method to get complaints by type
complaintSchema.statics.getComplaintsByType = function(type) {
	return this.find({ complaintType: type });
};

// Static method to get complaints that can be resolved by specific role
complaintSchema.statics.getComplaintsForRole = function(role) {
	return this.find({ canBeResolvedBy: role, status: { $nin: ['resolved', 'closed'] } });
};

module.exports = mongoose.model("Complaint", complaintSchema);
