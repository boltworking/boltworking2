const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function setupAcademicAffairs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if academic affairs user already exists
    const existingUser = await User.findOne({ username: 'dbu10101010' });

    if (existingUser) {
      console.log('Academic Affairs user already exists');
      console.log('Username:', existingUser.username);
      console.log('Role:', existingUser.role);

      // Update if needed
      if (existingUser.role !== 'academic_affairs') {
        existingUser.role = 'academic_affairs';
        existingUser.isAcademicAffairs = true;
        existingUser.academicResponsibilities = [
          'academic_policy_advocacy',
          'student_academic_support',
          'curriculum_feedback_coordination',
          'academic_complaint_resolution'
        ];
        await existingUser.save();
        console.log('Updated existing user to academic_affairs role');
      }
    } else {
      // Create new academic affairs user
      const academicAffairsUser = await User.create({
        name: 'Academic Affairs Officer',
        username: 'dbu10101010',
        password: 'Admin123#',
        email: 'academic.affairs@dbu.edu.et',
        department: 'Academic Affairs',
        year: '1st Year',
        role: 'academic_affairs',
        isActive: true,
        isAcademicAffairs: true,
        academicResponsibilities: [
          'academic_policy_advocacy',
          'student_academic_support',
          'curriculum_feedback_coordination',
          'academic_complaint_resolution'
        ],
        phoneNumber: '+251-xxx-xxx-xxx'
      });

      console.log('Academic Affairs user created successfully!');
      console.log('-----------------------------------');
      console.log('Username: dbu10101010');
      console.log('Password: Admin123#');
      console.log('Role: academic_affairs');
      console.log('Email:', academicAffairsUser.email);
      console.log('-----------------------------------');
      console.log('Permissions:');
      console.log('- Can join clubs');
      console.log('- Can vote in elections');
      console.log('- Can post academic-related content');
      console.log('- Can upload documents');
      console.log('- Can resolve academic complaints');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error setting up Academic Affairs user:', error);
    process.exit(1);
  }
}

setupAcademicAffairs();
