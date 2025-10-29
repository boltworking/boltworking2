# Role-Based System Updates Documentation

## Overview
This document describes the updates made to the student union management system to implement comprehensive role-based access control with specific focus on President Admin, Club Admin, and Academic Affairs roles.

## Role Definitions and Permissions

### 1. President Admin (president_admin)
**Username:** As assigned by system
**Primary Responsibilities:**
- Create new clubs with optional club manager assignment
- Update club details (name, description, category, contact info, etc.)
- Delete clubs from the system
- Create and manage elections
- Post news and announcements
- Resolve general complaints
- Upload documents

**Restrictions:**
- Cannot join clubs as a member
- Cannot manage club memberships directly (delegates to Club Admins)
- Cannot vote in elections

**Key Features in Club Management:**
- View all clubs
- Click "Update Club" button to edit club details
- Click "Remove Club" (trash icon) to delete clubs
- Access club details modal with edit functionality
- No "Join Club" button visible (replaced with Update/Remove buttons)

### 2. Club Admin (club_admin)
**Username:** dbu10101015 (example)
**Password:** Admin1234# (example)
**Primary Responsibilities:**
- Manage assigned club only
- Create, edit, and update club details (name, description, logo, objectives)
- Manage club profile, mission, and activities
- Approve or reject student membership requests
- Assign roles to club members (member, officer, president, vice_president, secretary, treasurer)
- Remove inactive or rule-violating members
- Manage event registrations and attendance
- Upload media (photos, posters, documents) related to club activities
- Ensure club members follow university and student union regulations

**Restrictions:**
- Can only manage their assigned club (set via assignedClub field)
- Cannot create new clubs
- Cannot access other clubs' management features
- Cannot delete clubs

**Key Features:**
- View "Manage My Club" button only for assigned club
- Access member management interface
- Review and approve/reject join requests
- View all club members with their usernames
- Remove members from club
- Update club information

### 3. Academic Affairs (academic_affairs)
**Username:** dbu10101010
**Password:** Admin123#
**Primary Responsibilities:**
- Join clubs as a regular member
- Vote in student elections
- Post academic-related content only
- Upload academic documents
- Resolve complaints with category "academic" only
- Academic policy advocacy
- Student academic support
- Curriculum feedback coordination

**Restrictions:**
- Cannot create or manage clubs
- Cannot create elections
- Cannot post non-academic content
- Can only resolve academic complaints (not general complaints)

**Key Features:**
- Full club joining functionality (same as students)
- Join request submission with department and year
- Academic complaint resolution interface
- Document upload capabilities
- Academic content posting

## Updated Components and Files

### Frontend Changes

#### 1. `/src/components/Pages/Clubs.jsx`
**Major Updates:**
- Added role-based button rendering for President Admin
  - Shows "Update Club" and "Remove Club" buttons instead of "Join Club"
- Enhanced `handleJoinClub` function to support:
  - President Admin accessing update modal
  - Club Admin managing their assigned club
  - Academic Affairs joining clubs
  - Students joining clubs
- Added `handleUpdateClub` function for club information updates
- Added club edit modal with form fields:
  - Club Name
  - Category
  - Description
  - Contact Email
  - Contact Phone
  - Office Location
  - Website URL
  - Meeting Schedule
  - Membership Requirements
- Added `isEditingClub` state for edit mode toggle
- Added `clubEditData` state for form data management

#### 2. `/src/components/Admin/PresidentDashboard.jsx`
**Features:**
- Already supports club creation with club manager assignment
- Dashboard overview with statistics
- Club management interface
- Election management
- News posting
- Complaint resolution (general complaints)

#### 3. `/src/components/Admin/AdminDashboard.jsx`
**Features:**
- Comprehensive admin dashboard for super_admin role
- Full system overview and statistics
- Access to all management features

### Backend Changes

#### 1. `/backend/routes/clubs.js`
**Updates:**
- Modified PUT `/api/clubs/:id` endpoint to allow:
  - Club Admin (for their assigned club)
  - President Admin (for any club)
  - Super Admin (for any club)
- Modified DELETE `/api/clubs/:id` to allow President Admin and Super Admin
- Added authorization checks inline for flexibility

#### 2. `/backend/routes/complaints.js`
**Already Implemented:**
- Role-based complaint filtering
- Academic Affairs can only see and resolve academic complaints
- President Admin can see and resolve general complaints
- Proper authorization in resolve endpoint

#### 3. `/backend/models/User.js`
**Permissions System:**
```javascript
academic_affairs: {
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
}
```

#### 4. `/backend/setup_admin_users.js`
**Added:**
- Academic Affairs user creation with username: dbu10101010
- Password: Admin123#
- Automatic role permissions setup
- Academic responsibilities assignment

## User Credentials

### Academic Affairs Account
```
Username: dbu10101010
Password: Admin123#
Role: academic_affairs
Email: academic.affairs.specialist@dbu.edu.et
Department: Academic Affairs
Login Endpoint: POST /api/auth/login or POST /api/academic-affairs/login
```

### How to Create Users
To create or update admin users including the Academic Affairs account:
```bash
cd backend
npm install
node setup_admin_users.js
```

This will create/update:
- Club Admin account
- Academic Affairs accounts (including dbu10101010)
- All necessary role permissions

## API Endpoints Summary

### Club Management
- `GET /api/clubs` - Get all clubs (public/optional auth)
- `GET /api/clubs/:id` - Get single club details
- `POST /api/clubs` - Create club (President Admin, Super Admin)
- `PUT /api/clubs/:id` - Update club (Club Admin assigned, President Admin, Super Admin)
- `DELETE /api/clubs/:id` - Delete club (President Admin, Super Admin)
- `POST /api/clubs/:id/join` - Join club (Students, Academic Affairs)
- `GET /api/clubs/:id/join-requests` - Get join requests (Club Admin assigned)
- `PATCH /api/clubs/:id/members/:memberId/approve` - Approve member (Club Admin assigned)
- `PATCH /api/clubs/:id/members/:memberId/reject` - Reject member (Club Admin assigned)

### Complaints
- `GET /api/complaints` - Get complaints (filtered by role)
- `POST /api/complaints` - Create complaint
- `PUT /api/complaints/:id/resolve` - Resolve complaint (role-based)
  - Academic Affairs: academic complaints only
  - President Admin: general complaints only
  - Super Admin: all complaints

### Academic Affairs
- `POST /api/academic-affairs/login` - Login
- `GET /api/academic-affairs/dashboard` - Dashboard data
- `GET /api/academic-affairs/students` - View students
- `GET /api/academic-affairs/policy-proposals` - View proposals
- `GET /api/academic-affairs/curriculum-feedback` - View feedback

## Testing the Implementation

### 1. Test President Admin Features
1. Login as President Admin
2. Navigate to Clubs page
3. Verify "Update Club" and trash icon buttons appear on club cards
4. Click "Update Club" to edit club details
5. Click trash icon to delete a club
6. Create a new club with club manager

### 2. Test Club Admin Features
1. Login as Club Admin (dbu10101015)
2. Navigate to Clubs page
3. Verify only assigned club shows "Manage My Club" button
4. Click to view member list with usernames
5. Approve/reject pending join requests
6. Remove members from club
7. Update club information

### 3. Test Academic Affairs Features
1. Login with username: dbu10101010, password: Admin123#
2. Navigate to Clubs page
3. Click "Join Club" on any club
4. Fill out join request form
5. Navigate to Complaints
6. Create an academic complaint
7. Verify you can only see academic complaints
8. Resolve an academic complaint
9. Verify you cannot resolve general complaints
10. Vote in elections
11. Post academic content

## Security Considerations

1. **Role-Based Access Control:**
   - All endpoints validate user role before allowing actions
   - Club Admins can only access their assigned club
   - Academic Affairs limited to academic complaints

2. **Data Validation:**
   - All inputs validated on backend
   - File uploads restricted by type and size
   - User authentication required for sensitive operations

3. **Permission Checks:**
   - Frontend hides UI elements based on role
   - Backend enforces permissions on every request
   - No trust in frontend validation alone

## Troubleshooting

### Issue: Academic Affairs user not found
**Solution:** Run `node backend/setup_admin_users.js` to create the user

### Issue: Cannot update clubs as President Admin
**Solution:** Verify user has role='president_admin' and proper authentication token

### Issue: Club Admin cannot see manage button
**Solution:** Ensure Club Admin has `assignedClub` field set to the club's ObjectId

### Issue: Academic Affairs can see non-academic complaints
**Solution:** Check complaint `complaintType` field is set correctly

## Future Enhancements

1. **Club Admin Dashboard:**
   - Dedicated dashboard for club admins
   - Analytics for club activities
   - Event management interface

2. **Academic Affairs Dashboard:**
   - Enhanced academic content posting
   - Document library management
   - Academic calendar integration

3. **Enhanced Permissions:**
   - Granular permission system
   - Custom role creation
   - Permission inheritance

## Summary

The system now fully supports:
- ✅ President Admin creating, updating, and deleting clubs
- ✅ Club Admin managing assigned clubs with full member control
- ✅ Academic Affairs joining clubs and resolving academic complaints
- ✅ Role-based UI rendering
- ✅ Secure backend authorization
- ✅ Academic Affairs account (dbu10101010 / Admin123#)
- ✅ Complete member management with username visibility
- ✅ Join request approval system
- ✅ Club information editing

All features have been implemented and tested. The build completes successfully with no errors.
