const mongoose = require('mongoose');
const User = require('./models/User');

// Test script to verify super admin user setup
async function testSuperAdmin() {
    try {
        // Connect to MongoDB (using environment variables)
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dbu-student-council');
        
        console.log('Connected to MongoDB');
        
        // Find the dbu10101010 user
        const user = await User.findOne({ username: 'dbu10101010' });
        
        if (user) {
            console.log('\n✅ User found:', {
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role,
                isAdmin: user.isAdmin,
                department: user.department,
                isActive: user.isActive
            });
            
            // Check if role is super_admin
            if (user.role === 'super_admin') {
                console.log('\n✅ SUCCESS: User dbu10101010 is now a Super Admin!');
            } else {
                console.log('\n❌ WARNING: User role is', user.role, 'not super_admin');
            }
        } else {
            console.log('\n❌ User dbu10101010 not found in database');
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

// Run the test
testSuperAdmin();