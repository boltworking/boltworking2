# DBU Student Council Election Website

## Quick Start Guide

### 🚀 Running the Backend Server

1. **Navigate to backend directory:**
```bash
cd "C:\Users\m\Desktop\dbu student councel\project\project\project\backend"
```

2. **Install dependencies (if not already installed):**
```bash
npm install
```

3. **Configure email (Important!):**
   - Open `.env` file
   - Replace `your_gmail_app_password_here` with your Gmail App Password
   - Get Gmail App Password:
     1. Go to Gmail → Manage Account → Security
     2. Enable 2-Factor Authentication
     3. Go to App Passwords
     4. Generate password for "Mail"
     5. Copy the 16-character password

4. **Start the server:**
```bash
# Development mode (with auto-restart)
npm run dev

# Or production mode
npm start
```

5. **Verify server is running:**
   - Check console for "✅ Server running on port 5000"
   - Visit http://localhost:5000/health to check status
   - Should see MongoDB connection success

### 🌐 Frontend Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Start development server:**
```bash
npm run dev
```

3. **Open browser:**
   - Visit http://localhost:5173 (or the port shown in console)

## 🔧 Key Features Implemented

### ✅ For Admin Users:
- **Club Admin Management**: Create club admins with username/password
- **Email Notifications**: Welcome emails sent automatically
- **Election Timer**: Real-time countdown for elections
- **Contact Management**: Receive email notifications from students

### ✅ For Club Admins:
- **Dedicated Login**: Separate login system for club admins
- **Member Management**: Approve/reject members, assign roles
- **Event Management**: Create and manage club events
- **Dashboard**: Overview of club statistics

### ✅ For Students:
- **Registration/Login**: Username format: dbu12345678
- **Club Applications**: Apply to join clubs
- **Elections**: Vote in active elections with live timer
- **Contact Forms**: Send messages to admin (triggers email)
- **Password Recovery**: Forgot password functionality

## 📧 Email Configuration

**IMPORTANT**: The system sends emails to: **getabalewamtataw11@gmail.com**

Update `.env` file:
```env
EMAIL_PASSWORD=your_16_character_app_password_here
```

## 🔐 Default Admin Credentials

The system creates a default admin user automatically:
- **Username**: admin
- **Password**: admin123
- **Email**: admin@dbu.edu.et

**⚠️ Change these credentials after first login!**

## 📱 API Endpoints

Server runs on: **http://localhost:5000**

Key endpoints:
- `POST /api/auth/login` - Student login
- `POST /api/auth/admin-login` - Admin login  
- `POST /api/club-admin/login` - Club admin login
- `POST /api/club-admin/create` - Create club admin (admin only)
- `GET /api/club-management/dashboard` - Club admin dashboard
- `GET /api/elections/:id/timer` - Election timer
- `POST /api/contact` - Send contact message

## 🔍 Health Check

Visit: http://localhost:5000/health

## 📚 Full Documentation

See `SYSTEM_DOCUMENTATION.md` for complete API documentation.

---

**Status**: ✅ Ready to use  
**Contact**: getabalewamtataw11@gmail.com
