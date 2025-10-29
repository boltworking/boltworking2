# DBU Student Council Election Website - Complete System Documentation

## Overview
This is a comprehensive web application for Debre Berhan University Student Council elections and club management. The system provides functionality for student elections, club management, contact messaging, and administrative control with multiple user roles.

## Features Implemented

### 🔐 Authentication & Authorization
- **Student Registration/Login**: Students can register and login with dbu followed by 8 digits username format
- **Admin Login**: Main administrators can login and manage the entire system
- **Club Admin System**: Club-specific administrators with restricted access to their assigned club
- **Forgot Password**: Email-based password recovery for all user types
- **Account Security**: Login attempt limits, account locking, password hashing

### 👨‍💼 Admin Management
- **Club Admin Creation**: Main admin can create club administrators with username/password
- **Club Admin Assignment**: Assign club admins to specific clubs
- **Email Notifications**: Automatic welcome emails sent to new club admins
- **User Management**: View, update, and delete users
- **System Monitoring**: Dashboard with system statistics

### 🏛️ Club Management System
- **Club Creation**: Create and manage university clubs
- **Club Admin Dashboard**: Dedicated dashboard for club administrators
- **Member Management**: 
  - View all club members
  - Approve/reject membership applications
  - Assign member roles (president, vice president, secretary, treasurer, officer, member)
  - Remove members from club
- **Event Management**:
  - Create club events
  - Update event details
  - Track event attendance
  - Manage event status
- **Club Information**: Update club details, contact information, social media links

### 🗳️ Election System with Real-Time Timer
- **Election Creation**: Create elections with start/end dates
- **Real-Time Countdown**: Live timer showing time until election starts/ends
- **Automatic Status Updates**: Elections automatically transition between upcoming/active/completed
- **Candidate Management**: Add candidates with profiles and platforms
- **Voting System**: Secure voting with duplicate prevention
- **Results**: Real-time vote counting and winner determination
- **Election Types**: Support for different position elections

### 📧 Enhanced Contact System
- **Student Contact Forms**: Students can send messages to administration
- **Email Notifications**: Automatic email alerts sent to getabalewamtataw11@gmail.com
- **Message Management**: Admins can view, reply to, and manage contact messages
- **Status Tracking**: Track message status (new, read, replied, resolved)
- **Priority Levels**: Set message priority levels

### 🔒 Security Features
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt password encryption
- **Rate Limiting**: API request rate limiting
- **Input Validation**: Comprehensive input validation and sanitization
- **Role-Based Access**: Different access levels for different user types
- **CORS Protection**: Cross-origin request security

## System Architecture

### Backend Structure
```
backend/
├── models/
│   ├── User.js          # User model with roles (student, admin, club_admin)
│   ├── Club.js          # Club model with members and events
│   ├── Election.js      # Election model with timing and candidates
│   └── Contact.js       # Contact message model
├── routes/
│   ├── auth.js          # Authentication routes + forgot password
│   ├── clubAdmin.js     # Club admin management routes
│   ├── clubManagement.js # Club admin dashboard routes
│   ├── elections.js     # Election routes with timer functionality
│   ├── contact.js       # Enhanced contact routes with email
│   ├── clubs.js         # Club routes
│   ├── users.js         # User management routes
│   └── posts.js         # Post routes
├── utils/
│   ├── electionTimer.js # Election timing utilities
│   └── createAdmin.js   # Default admin creation
├── middleware/
│   ├── auth.js          # Authentication middleware
│   ├── validation.js    # Input validation
│   └── errorHandler.js  # Error handling
└── server.js            # Main server file
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Student registration
- `POST /api/auth/login` - Student login
- `POST /api/auth/admin-login` - Admin login
- `POST /api/auth/forgot-password` - Send password reset email
- `PUT /api/auth/reset-password/:token` - Reset password with token
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Club Admin Management
- `POST /api/club-admin/create` - Create new club admin (Admin only)
- `GET /api/club-admin` - Get all club admins (Admin only)
- `PUT /api/club-admin/:id` - Update club admin (Admin only)
- `DELETE /api/club-admin/:id` - Delete club admin (Admin only)
- `POST /api/club-admin/login` - Club admin login
- `POST /api/club-admin/reset-password` - Club admin password reset
- `PUT /api/club-admin/reset-password/:token` - Confirm password reset

### Club Management (Club Admin Dashboard)
- `GET /api/club-management/dashboard` - Get club admin dashboard data
- `GET /api/club-management/club/:clubId/members` - Get club members
- `PATCH /api/club-management/club/:clubId/members/:memberId/status` - Approve/reject members
- `PATCH /api/club-management/club/:clubId/members/:memberId/role` - Update member role
- `DELETE /api/club-management/club/:clubId/members/:memberId` - Remove member
- `PUT /api/club-management/club/:clubId` - Update club information
- `POST /api/club-management/club/:clubId/events` - Create event
- `GET /api/club-management/club/:clubId/events` - Get club events
- `PUT /api/club-management/club/:clubId/events/:eventId` - Update event
- `DELETE /api/club-management/club/:clubId/events/:eventId` - Delete event

### Elections with Timer
- `GET /api/elections` - Get all elections with timer info
- `GET /api/elections/:id` - Get single election with timer
- `GET /api/elections/:id/timer` - Get election timer only
- `POST /api/elections` - Create election (Admin only)
- `PUT /api/elections/:id` - Update election (Admin only)
- `POST /api/elections/update-statuses` - Manual status update (Admin only)

### Contact System
- `POST /api/contact` - Send contact message (sends email to admin)
- `GET /api/contact` - Get all contact messages (Admin only)
- `GET /api/contact/:id` - Get single contact message (Admin only)
- `PATCH /api/contact/:id/status` - Update message status (Admin only)
- `POST /api/contact/:id/reply` - Reply to message (Admin only)

## Configuration

### Environment Variables (.env)
```env
# MongoDB Connection String
MONGODB_URI=mongodb+srv://amtatawgetabalew32:GET2121@cluster1.xcqcguh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1

# Server Port
PORT=5000

# JWT Secret
JWT_SECRET=dbu_student_union_jwt_secret_2024_very_secure_key

# Environment
NODE_ENV=development

# CORS Origins
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173s

# Email Configuration
EMAIL_PASSWORD=your_gmail_app_password_here
```

### Email Setup Instructions
1. Go to your Gmail account settings
2. Enable 2-factor authentication
3. Generate an App Password for nodemailer
4. Replace `your_gmail_app_password_here` with the generated app password
5. The system will send emails from/to: getabalewamtataw11@gmail.com

## Database Models

### User Model
- Supports three roles: `student`, `admin`, `club_admin`
- Includes password reset tokens and expiration
- Club admin specific fields: `assignedClub`, `isClubAdmin`
- Security features: login attempts, account locking

### Club Model
- Includes `clubAdmin` field linking to User
- Member management with roles and approval status
- Event management within clubs
- Leadership positions tracking

### Election Model
- Built-in timing system with automatic status updates
- Support for multiple election types
- Real-time vote counting
- Candidate management with voter tracking

## Installation & Setup

### Backend Setup
```bash
# Navigate to backend directory
cd "C:\Users\m\Desktop\dbu student councel\project\project\project\backend"

# Install dependencies
npm install

# Setup environment variables
# Edit .env file with your MongoDB URI and email password

# Start development server
npm run dev

# Or start production server
npm start
```

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account
- Gmail account with App Password for email functionality

## Usage Guide

### For Main Administrators
1. **Login**: Use admin credentials to access the system
2. **Create Club Admins**: 
   - Navigate to club admin management
   - Create new club admin with username/password
   - Assign to specific club
   - Club admin receives welcome email automatically
3. **Manage Elections**:
   - Create elections with start/end dates
   - System automatically handles timing and status updates
   - Monitor voting in real-time
4. **Handle Contact Messages**:
   - Receive email notifications for new messages
   - Reply to student inquiries
   - Track message status

### For Club Administrators
1. **Login**: Use assigned username/password from welcome email
2. **Dashboard**: View club statistics and recent activity
3. **Member Management**:
   - Review membership applications
   - Approve or reject new members
   - Assign roles to existing members
   - Remove inactive members
4. **Event Management**:
   - Create upcoming events
   - Update event details
   - Track attendance
5. **Club Information**: Update club contact details and information

### For Students
1. **Registration**: Register with dbu+8digits username format
2. **Apply to Clubs**: Submit membership applications
3. **Participate in Elections**: Vote in active elections
4. **Contact Administration**: Send messages through contact form
5. **Password Recovery**: Use forgot password if needed

## Timer System

### Election Timer Features
- **Real-time Countdown**: Shows exact time until election starts or ends
- **Automatic Status Updates**: Elections transition automatically
- **Multiple Display Formats**: Days, hours, minutes, seconds
- **API Endpoints**: Separate timer endpoint for real-time updates
- **Scheduled Updates**: Background job updates statuses every minute

### Timer API Usage
```javascript
// Get election with timer info
GET /api/elections/:id/timer

// Response format
{
  "success": true,
  "timer": {
    "type": "ends_in", // or "starts_in", "ended"
    "days": 2,
    "hours": 5,
    "minutes": 30,
    "seconds": 45,
    "expired": false
  },
  "status": "active",
  "canVote": true
}
```

## Security Considerations

### Implemented Security Measures
- Password hashing with bcrypt (salt rounds: 12)
- JWT token authentication with expiration
- Rate limiting (1000 requests per 15 minutes)
- Input validation and sanitization
- Role-based access control
- Account lockout after failed login attempts
- Secure password reset with time-limited tokens
- CORS protection
- Helmet.js security headers

### Email Security
- App passwords instead of main Gmail password
- Secure SMTP connection
- Email content sanitization
- No sensitive information in emails

## Testing

### Manual Testing Checklist
- [ ] Student registration and login
- [ ] Admin login functionality
- [ ] Club admin creation and assignment
- [ ] Club admin login and dashboard access
- [ ] Member approval/rejection by club admin
- [ ] Event creation and management
- [ ] Election creation with timer
- [ ] Real-time election status updates
- [ ] Contact form submission and email notification
- [ ] Password reset for all user types
- [ ] Role-based access restrictions

### Database Connection
The system is configured to connect to MongoDB Atlas with:
- Connection retry logic
- Connection pooling
- Timeout configurations
- Health check endpoint at `/health`

## Troubleshooting

### Common Issues
1. **Email not sending**: Check EMAIL_PASSWORD in .env file
2. **Database connection**: Verify MONGODB_URI
3. **Timer not updating**: Check if background job is running
4. **Permission errors**: Verify user roles are correctly assigned

### Logs
- Server logs all authentication attempts
- Email sending status is logged
- Database connection status is monitored
- Error handling provides detailed error messages

## Support

For technical support or questions about the system:
- Check the logs for error details
- Verify environment variables are set correctly
- Ensure all dependencies are installed
- Contact system administrator at getabalewamtataw11@gmail.com

---

**System Status**: ✅ Fully Functional
**Last Updated**: October 2024
**Version**: 1.0.0