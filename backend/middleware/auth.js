/** @format */

const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect routes - require authentication
const protect = async (req, res, next) => {
	let token;

	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith("Bearer")
	) {
		try {
			// Get token from header
			token = req.headers.authorization.split(" ")[1];

			// Check if it's a mock token (for development)
			if (token.startsWith("eyJ")) {
				// JWT tokens start with eyJ
				try {
					// Try to parse as mock token first
					const parts = token.split(".");
					if (parts.length === 3) {
						const payload = JSON.parse(atob(parts[1]));

						// Check if it's a mock token
						if (
							payload.id &&
							(payload.id.toString().includes("admin_") ||
								payload.id.toString().includes("student_") ||
								payload.id.toString().includes("google_"))
						) {
							// Handle mock token
							const mockUser = {
								_id: payload.id,
								id: payload.id,
								email: payload.email,
								role: payload.role,
								isAdmin: payload.isAdmin || false,
								isActive: true,
								name: payload.name || "Mock User",
								setRolePermissions: function() {
									// Mock permission assignment based on role
									switch(this.role) {
										case 'president_admin':
											this.permissions = {
												canCreateClubs: true,
												canManageClubs: false,
												canCreateElections: true,
												canVoteElections: false,
												canPostNews: true,
												canViewNews: true,
												canWriteComplaints: false,
												canResolveComplaints: true,
												canResolveAcademicComplaints: false,
												canUploadDocuments: true,
												canJoinClubs: false
											};
											break;
										case 'club_admin':
											this.permissions = {
												canCreateClubs: false,
												canManageClubs: true,
												canCreateElections: false,
												canVoteElections: true,
												canPostNews: false,
												canViewNews: true,
												canWriteComplaints: true,
												canResolveComplaints: false,
												canResolveAcademicComplaints: false,
												canUploadDocuments: false,
												canJoinClubs: false
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
												canResolveAcademicComplaints: true,
												canUploadDocuments: true,
												canJoinClubs: true
											};
											break;
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
									}
								}
							};

							// Set permissions for mock user
							mockUser.setRolePermissions();

							req.user = mockUser;
							return next();
						}
					}
				} catch (mockError) {
					// If mock token parsing fails, continue with real JWT verification
				}
			}

			// Verify real JWT token
			const decoded = jwt.verify(token, process.env.JWT_SECRET);

			// Get user from token
			req.user = await User.findById(decoded.id).select("-password");

			if (!req.user) {
				return res.status(401).json({
					success: false,
					message: "Not authorized, user not found",
				});
			}

			if (!req.user.isActive) {
				return res.status(401).json({
					success: false,
					message: "Account has been deactivated",
				});
			}

			// Ensure permissions are set based on role
			if (!req.user.permissions || Object.keys(req.user.permissions).length === 0) {
				req.user.setRolePermissions();
				await req.user.save();
			}

			next();
		} catch (error) {
			console.error("Token verification error:", error);
			return res.status(401).json({
				success: false,
				message: "Not authorized, token failed",
			});
		}
	}

	if (!token) {
		return res.status(401).json({
			success: false,
			message: "Not authorized, no token",
		});
	}
};

// Admin access required
const adminOnly = (req, res, next) => {
	if (req.user && (req.user.isAdmin || req.user.role === "admin" || req.user.role === "super_admin")) {
		next();
	} else {
		res.status(403).json({
			success: false,
			message: "Access denied. Admin privileges required.",
		});
	}
};

// Super admin access required
const superAdminOnly = (req, res, next) => {
	if (req.user && req.user.role === "super_admin") {
		next();
	} else {
		res.status(403).json({
			success: false,
			message: "Access denied. Super Admin privileges required.",
		});
	}
};

// President admin access required
const presidentAdminOnly = (req, res, next) => {
	if (req.user && req.user.role === "president_admin") {
		next();
	} else {
		res.status(403).json({
			success: false,
			message: "Access denied. President Admin privileges required.",
		});
	}
};

// President admin OR super admin access
const presidentOrSuperAdmin = (req, res, next) => {
	if (req.user && (req.user.role === "president_admin" || req.user.role === "super_admin")) {
		next();
	} else {
		res.status(403).json({
			success: false,
			message: "Access denied. President Admin or Super Admin privileges required.",
		});
	}
};

// Club admin can only manage their assigned club
const clubAdminOwnership = async (req, res, next) => {
	try {
		// Only apply to club admins
		if (req.user && req.user.role === 'club_admin') {
			const clubId = req.params.id || req.params.clubId;
			
			if (!clubId) {
				return res.status(400).json({
					success: false,
					message: 'Club ID is required'
				});
			}
			
			// Check if this club admin is assigned to this club
			if (!req.user.assignedClub || req.user.assignedClub.toString() !== clubId) {
				return res.status(403).json({
					success: false,
					message: 'Access denied. You can only manage your assigned club.'
				});
			}
		}
		
		// Super admin can access all clubs
		if (req.user && req.user.role === 'super_admin') {
			return next();
		}
		
		next();
	} catch (error) {
		console.error('Club admin ownership check error:', error);
		res.status(500).json({
			success: false,
			message: 'Server error checking club access'
		});
	}
};

// Specific role access
const authorize = (...roles) => {
	return (req, res, next) => {
		if (!req.user) {
			return res.status(401).json({
				success: false,
				message: "Not authorized",
			});
		}

		if (!roles.includes(req.user.role)) {
			return res.status(403).json({
				success: false,
				message: `User role ${req.user.role} is not authorized to access this route`,
			});
		}

		next();
	};
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
	let token;

	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith("Bearer")
	) {
		try {
			token = req.headers.authorization.split(" ")[1];

			// Handle mock tokens
			if (token.startsWith("eyJ")) {
				try {
					const parts = token.split(".");
					if (parts.length === 3) {
						const payload = JSON.parse(atob(parts[1]));

						if (
							payload.id &&
							(payload.id.toString().includes("admin_") ||
								payload.id.toString().includes("student_") ||
								payload.id.toString().includes("google_"))
						) {
							const mockUser = {
								_id: payload.id,
								id: payload.id,
								email: payload.email,
								role: payload.role,
								isAdmin: payload.isAdmin || false,
								isActive: true,
								name: payload.name || "Mock User",
							};

							req.user = mockUser;
							return next();
						}
					}
				} catch (mockError) {
					// Continue with real JWT verification
				}
			}

			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			req.user = await User.findById(decoded.id).select("-password");
		} catch (error) {
			// Token is invalid, continue without user for optional auth
			console.log('Optional auth token verification failed:', error.message);
		}
	}

	req.user = req.user || null;
	next();
};

// Club admin only access (no regular admin or super admin for club management)
const clubAdminOnly = (req, res, next) => {
	if (req.user && req.user.role === 'club_admin') {
		next();
	} else {
		res.status(403).json({
			success: false,
			message: 'Access denied. Only assigned club admin can manage this club.'
		});
	}
};

module.exports = {
	protect,
	adminOnly,
	superAdminOnly,
	presidentAdminOnly,
	presidentOrSuperAdmin,
	clubAdminOwnership,
	clubAdminOnly,
	authorize,
	optionalAuth,
};
