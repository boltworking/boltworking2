/** @format */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const User = require("./models/User");

// Connect to MongoDB
const connectDB = async () => {
	try {
		await mongoose.connect(process.env.MONGODB_URI);
		console.log("✅ MongoDB connected successfully");
	} catch (error) {
		console.error("❌ MongoDB connection error:", error);
		process.exit(1);
	}
};

// Setup admin users with specific credentials
const setupAdminUsers = async () => {
	try {
		console.log("\n🚀 Setting up admin users...\n");

		// 1. Club Admin User
		const clubAdminUsername = "dbu10101015";
		const clubAdminPassword = "Admin1234#";

		let clubAdmin = await User.findOne({ username: clubAdminUsername });

		if (clubAdmin) {
			console.log(`📝 Updating existing club admin: ${clubAdminUsername}`);

			// Update role and permissions
			clubAdmin.role = "club_admin";
			clubAdmin.isClubAdmin = true;
			clubAdmin.isAdmin = false;
			clubAdmin.isActive = true;
			clubAdmin.password = clubAdminPassword; // Will be hashed by pre-save hook

			// Set role-based permissions
			clubAdmin.setRolePermissions();

			await clubAdmin.save();
			console.log(`✅ Club admin updated: ${clubAdminUsername}`);
		} else {
			console.log(`➕ Creating new club admin: ${clubAdminUsername}`);

			clubAdmin = await User.create({
				name: "Club Administrator",
				username: clubAdminUsername,
				password: clubAdminPassword,
				email: "clubadmin@dbu.edu.et",
				department: "Student Affairs",
				year: "Staff",
				role: "club_admin",
				isClubAdmin: true,
				isActive: true,
				phoneNumber: "+251911000001"
			});

			console.log(`✅ Club admin created: ${clubAdminUsername}`);
		}

		// 2. Academic Affairs User (Original)
		const academicUsername = "dbu10101016";
		const academicPassword = "Admin12345#";

		let academicAffairs = await User.findOne({ username: academicUsername });

		// 3. Academic Affairs User (Requested: dbu10101010)
		const academicUsername2 = "dbu10101010";
		const academicPassword2 = "Admin123#";

		let academicAffairs2 = await User.findOne({ username: academicUsername2 });

		if (academicAffairs) {
			console.log(`📝 Updating existing academic affairs: ${academicUsername}`);

			// Update role and permissions
			academicAffairs.role = "academic_affairs";
			academicAffairs.isAcademicAffairs = true;
			academicAffairs.isAdmin = false;
			academicAffairs.isActive = true;
			academicAffairs.password = academicPassword; // Will be hashed by pre-save hook

			// Set academic responsibilities
			academicAffairs.academicResponsibilities = [
				'academic_policy_advocacy',
				'student_academic_support',
				'curriculum_feedback_coordination',
				'academic_complaint_resolution'
			];

			// Set role-based permissions
			academicAffairs.setRolePermissions();

			await academicAffairs.save();
			console.log(`✅ Academic affairs updated: ${academicUsername}`);
		} else {
			console.log(`➕ Creating new academic affairs: ${academicUsername}`);

			academicAffairs = await User.create({
				name: "Academic Affairs Officer",
				username: academicUsername,
				password: academicPassword,
				email: "academic.affairs@dbu.edu.et",
				department: "Academic Affairs",
				year: "Staff",
				role: "academic_affairs",
				isAcademicAffairs: true,
				isActive: true,
				phoneNumber: "+251911000002",
				academicResponsibilities: [
					'academic_policy_advocacy',
					'student_academic_support',
					'curriculum_feedback_coordination',
					'academic_complaint_resolution'
				]
			});

			console.log(`✅ Academic affairs created: ${academicUsername}`);
		}

		if (academicAffairs2) {
			console.log(`📝 Updating existing academic affairs: ${academicUsername2}`);

			// Update role and permissions
			academicAffairs2.role = "academic_affairs";
			academicAffairs2.isAcademicAffairs = true;
			academicAffairs2.isAdmin = false;
			academicAffairs2.isActive = true;
			academicAffairs2.password = academicPassword2; // Will be hashed by pre-save hook

			// Set academic responsibilities
			academicAffairs2.academicResponsibilities = [
				'academic_policy_advocacy',
				'student_academic_support',
				'curriculum_feedback_coordination',
				'academic_complaint_resolution'
			];

			// Set role-based permissions
			academicAffairs2.setRolePermissions();

			await academicAffairs2.save();
			console.log(`✅ Academic affairs updated: ${academicUsername2}`);
		} else {
			console.log(`➕ Creating new academic affairs: ${academicUsername2}`);

			academicAffairs2 = await User.create({
				name: "Academic Affairs Specialist",
				username: academicUsername2,
				password: academicPassword2,
				email: "academic.affairs.specialist@dbu.edu.et",
				department: "Academic Affairs",
				year: "Staff",
				role: "academic_affairs",
				isAcademicAffairs: true,
				isActive: true,
				phoneNumber: "+251911000003",
				academicResponsibilities: [
					'academic_policy_advocacy',
					'student_academic_support',
					'curriculum_feedback_coordination',
					'academic_complaint_resolution'
				]
			});

			console.log(`✅ Academic affairs created: ${academicUsername2}`);
		}

		console.log("\n" + "=".repeat(60));
		console.log("✅ ADMIN USERS SETUP COMPLETE");
		console.log("=".repeat(60));

		console.log("\n📋 CREDENTIALS SUMMARY:\n");

		console.log("👤 CLUB ADMIN:");
		console.log(`   Username: ${clubAdminUsername}`);
		console.log(`   Password: ${clubAdminPassword}`);
		console.log(`   Role: club_admin`);
		console.log(`   Login Endpoint: POST /api/club-admin/login`);
		console.log(`   Dashboard: GET /api/club-management/dashboard`);

		console.log("\n👤 ACADEMIC AFFAIRS (Original):");
		console.log(`   Username: ${academicUsername}`);
		console.log(`   Password: ${academicPassword}`);
		console.log(`   Role: academic_affairs`);
		console.log(`   Login Endpoint: POST /api/academic-affairs/login`);
		console.log(`   Dashboard: GET /api/academic-affairs/dashboard`);

		console.log("\n👤 ACADEMIC AFFAIRS (Requested - dbu10101010):");
		console.log(`   Username: ${academicUsername2}`);
		console.log(`   Password: ${academicPassword2}`);
		console.log(`   Role: academic_affairs`);
		console.log(`   Login Endpoint: POST /api/academic-affairs/login`);
		console.log(`   Dashboard: GET /api/academic-affairs/dashboard`);
		console.log(`   Permissions: Join clubs, vote in elections, post academic content, upload documents, resolve academic complaints`);

		console.log("\n" + "=".repeat(60));
		console.log("🎯 All users can now login directly to their dashboards!");
		console.log("=".repeat(60) + "\n");

	} catch (error) {
		console.error("❌ Error setting up admin users:", error);
		throw error;
	}
};

// Main execution
const main = async () => {
	try {
		await connectDB();
		await setupAdminUsers();
		console.log("✅ Setup completed successfully!");
		process.exit(0);
	} catch (error) {
		console.error("❌ Setup failed:", error);
		process.exit(1);
	}
};

main();
