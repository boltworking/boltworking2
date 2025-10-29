const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Define the User schema
const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, "Please provide your name"],
			trim: true,
			maxlength: [50, "Name cannot be more than 50 characters"],
		},
		username: {
			type: String,
			required: [true, "Please provide a username"],
			unique: true,
			trim: true,
			match: [
				/^dbu\d{8}$/i,
				"Username must start with dbu followed by 8 digits",
			],
		},
		email: {
			type: String,
			unique: true,
			sparse: true,
			trim: true,
			lowercase: true,
			match: [
				/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
				"Please provide a valid email",
			],
		},
		password: {
			type: String,
			required: [true, "Please provide a password"],
			minlength: [8, "Password must be at least 8 characters"],
			select: false,
		},
		isActive: {
			type: Boolean,
			default: true,
		},
		department: {
			type: String,
			required: [true, "Please provide your department"],
			trim: true,
		},
		year: {
			type: String,
			required: [true, "Please provide your academic year"],
			enum: ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"],
		},
		isAdmin: {
			type: Boolean,
			default: false, // Default value set to false, can be set to true for admin users
		},
	role: {
		type: String,
		enum: ["student", "admin", "club_admin", "academic_affairs", "super_admin", "president_admin"],
		default: "student",
	},
	// Role-specific permissions
	permissions: {
		canCreateClubs: { type: Boolean, default: false },
		canManageClubs: { type: Boolean, default: false },
		canCreateElections: { type: Boolean, default: false },
		canVoteElections: { type: Boolean, default: true },
		canPostNews: { type: Boolean, default: false },
		canViewNews: { type: Boolean, default: true },
		canWriteComplaints: { type: Boolean, default: true },
		canResolveComplaints: { type: Boolean, default: false },
		canResolveAcademicComplaints: { type: Boolean, default: false },
		canUploadDocuments: { type: Boolean, default: false },
		canJoinClubs: { type: Boolean, default: true }
	},
		isLocked: {
			type: Boolean,
			default: false,
		},
		loginAttempts: {
			type: Number,
			default: 0,
		},
		lockUntil: Date,
		lastLogin: Date,
		joinedClubs: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Club'
		}],
		votedElections: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Election'
		}],
		profileImage: {
			type: String,
			default: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=400'
		},
		studentId: {
			type: String,
			sparse: true
		},
		phoneNumber: {
			type: String,
			trim: true
		},
	address: {
		type: String,
		trim: true
	},
	assignedClub: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Club',
		sparse: true // Only for club_admin role
	},
	isClubAdmin: {
		type: Boolean,
		default: false
	},
	isAcademicAffairs: {
		type: Boolean,
		default: false
	},
	academicResponsibilities: [{
		type: String,
		enum: [
			'academic_policy_advocacy',
			'student_academic_support', 
			'curriculum_feedback_coordination',
			'academic_complaint_resolution'
		]
	}],
	passwordResetToken: {
		type: String
	},
	passwordResetExpires: {
		type: Date
	}
	},
	{
		timestamps: true,
	}
);

// Pre-save middleware to hash password and set role-based permissions
userSchema.pre("save", async function (next) {
	// Hash password if modified
	if (this.isModified("password")) {
		try {
			const salt = await bcrypt.genSalt(12);
			this.password = await bcrypt.hash(this.password, salt);
		} catch (error) {
			return next(error);
		}
	}

	// Set permissions based on role
	if (this.isModified("role") || this.isNew) {
		this.setRolePermissions();
	}

	next();
});

// Method to set permissions based on role
userSchema.methods.setRolePermissions = function() {
	switch(this.role) {
		case 'president_admin':
			this.permissions = {
				canCreateClubs: true,
				canManageClubs: false, // Can create but not manage
				canCreateElections: true,
				canVoteElections: false, // President admin cannot vote
				canPostNews: true,
				canViewNews: true,
				canWriteComplaints: false,
				canResolveComplaints: true,
				canResolveAcademicComplaints: false,
				canUploadDocuments: true,
				canJoinClubs: false // President admin cannot join clubs
			};
			break;
		case 'club_admin':
			this.permissions = {
				canCreateClubs: false,
				canManageClubs: true, // Can manage clubs created by president
				canCreateElections: false,
				canVoteElections: true, // Club admin can vote
				canPostNews: false,
				canViewNews: true,
				canWriteComplaints: true,
				canResolveComplaints: false,
				canResolveAcademicComplaints: false,
				canUploadDocuments: false,
				canJoinClubs: false // Club admin manages clubs, doesn't join
			};
			break;
		case 'academic_affairs':
			this.permissions = {
				canCreateClubs: false,
				canManageClubs: false,
				canCreateElections: false,
				canVoteElections: true,
				canPostNews: false,
				canViewNews: true,
				canWriteComplaints: true,
				canResolveComplaints: false,
				canResolveAcademicComplaints: true, // Can resolve academic complaints only
				canUploadDocuments: true, // Can add documents to complaints
				canJoinClubs: true
			};
			break;
		case 'student':
		default:
			this.permissions = {
				canCreateClubs: false,
				canManageClubs: false,
				canCreateElections: false,
				canVoteElections: true,
				canPostNews: false,
				canViewNews: true,
				canWriteComplaints: true,
				canResolveComplaints: false,
				canResolveAcademicComplaints: false,
				canUploadDocuments: false,
				canJoinClubs: true
			};
			break;
		case 'admin':
		case 'super_admin':
			// Full permissions for main admin roles
			this.permissions = {
				canCreateClubs: true,
				canManageClubs: true,
				canCreateElections: true,
				canVoteElections: false,
				canPostNews: true,
				canViewNews: true,
				canWriteComplaints: false,
				canResolveComplaints: true,
				canResolveAcademicComplaints: true,
				canUploadDocuments: true,
				canJoinClubs: false
			};
			break;
	}
};

// Method to match password
userSchema.methods.matchPassword = async function (enteredPassword) {
	return await bcrypt.compare(enteredPassword, this.password);
};

// Create the User model
const User = mongoose.model("User", userSchema);

module.exports = User;