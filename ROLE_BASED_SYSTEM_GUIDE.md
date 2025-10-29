# DBU Student Union Role-Based System - Complete Guide

## Overview

A comprehensive role-based management system for the DBU Student Union with automated club management, proposal tracking, election voting, and real-time countdown timers.

## System Architecture

### Database: Supabase (PostgreSQL)
The system uses Supabase as the database (NOT MongoDB Atlas). All data is stored in PostgreSQL with Row Level Security enabled.

### Roles and Access Levels

#### 1. President
- **Username**: `president`
- **Default Password**: `admin123` (stored as bcrypt hash)
- **Access**: Full system overview dashboard
- **Capabilities**:
  - View all clubs from all branches
  - View all proposals and their status
  - View all elections and results
  - Monitor system performance and statistics
  - Read-only access (cannot modify club records)

#### 2. Academic Branch Admin
- **Username**: `academic`
- **Default Password**: `admin123`
- **Access**: Academic branch management
- **Capabilities**:
  - Manage academic-related clubs
  - Read-only access to all other clubs
  - Review academic club proposals
  - View system-wide data

#### 3. Clubs Branch Admin
- **Username**: `clubs`
- **Default Password**: `admin123`
- **Access**: Full club management dashboard
- **Capabilities**:
  - Create new clubs
  - Approve/reject club applications
  - Auto-generate club representative accounts
  - Manage proposal deadlines and timers
  - Review all club proposals
  - Full CRUD operations on clubs

#### 4. Club Representative
- **Username**: Auto-generated (format: `dbu1500XXXX`)
- **Password**: Auto-generated (format: `DBU@XXXX`)
- **Access**: Limited club-specific dashboard
- **Capabilities**:
  - View countdown timer for proposal deadline
  - Upload proposals before deadline
  - View proposal submission status
  - Receive notifications about deadlines

#### 5. Student
- **Registration**: Self-registration available
- **Access**: Public features
- **Capabilities**:
  - Vote in elections (one vote per university ID)
  - View clubs and events
  - Submit complaints
  - Access services

## Club Management System

### Pre-loaded Clubs (Pending Approval)
1. **Truth Culture Club** - Promoting truth, integrity and ethical values
2. **Techtonic Club** - Technology innovation and coding community
3. **Hohie Tesfa Club** - Hope and community service initiative
4. **Idea Hub Club** - Entrepreneurship and innovation hub
5. **Bego Adragot Club** - Cultural heritage preservation society

### Club Approval Workflow

1. **Creation**: Club is created with status = "pending"
2. **Approval by Clubs Branch**:
   - Auto-generates username: `dbu1500XXXX` (counter starts at 9623)
   - Auto-generates password: `DBU@` + 4 random digits
   - Creates club representative user account
   - Sets proposal deadline (default 30 days from approval)
   - Activates countdown timer
   - Sends notification to representative with credentials

### Username Generation Examples
- Truth Culture Club → `dbu15009623`
- Techtonic Club → `dbu15009624`
- Hohie Tesfa Club → `dbu15009625`
- Idea Hub Club → `dbu15009626`
- Bego Adragot Club → `dbu15009627`

## Timer System

### Proposal Upload Timer
**Features**:
- Starts immediately upon club approval
- Displays: Days, Hours, Minutes remaining
- Real-time countdown updates every minute
- Visual urgency indicator (turns orange when < 3 days)
- Automatic expiration handling

**On Expiration**:
- Timer status changes to "overdue"
- Upload functionality is disabled
- Alert notification sent to club representative
- Alert notification sent to Clubs Branch admin
- Proposal status marked as "late" if submitted after deadline

### Election Timer
**Features**:
- Shows countdown for all active elections
- Visible to all users (students and admins)
- Displays: Days, Hours, Minutes until voting ends
- Real-time updates

**On Expiration**:
- Election automatically closed
- Voting functionality disabled
- Results locked and visible to President
- No further votes accepted

## Automated Systems

### Edge Function: check-timers
**Endpoint**: `https://YOUR_SUPABASE_URL/functions/v1/check-timers`

**Purpose**: Automatically checks and updates expired timers

**What it does**:
- Runs periodically (can be triggered by cron job)
- Checks for expired proposal deadlines
- Checks for expired elections
- Updates database statuses
- Creates notifications for affected users

**Setup**: Already deployed to your Supabase project

### Notification System
**Features**:
- Real-time notification panel in header
- Unread count badge
- Auto-refresh on new notifications
- Types: success, warning, alert, info
- Related entity linking

**Triggers**:
- Club approval
- Proposal deadline approaching
- Proposal deadline expired
- Proposal review completed
- Election starting/ending

## Dashboard Routes

### Role-Based Routing
- `/dashboard` - Auto-redirects based on user role
- `/dashboard/president` - President full overview
- `/dashboard/academic` - Academic branch management
- `/dashboard/clubs` - Clubs branch management
- `/dashboard/club-rep` - Club representative portal

### Public Routes
- `/` - Home page
- `/about` - About page
- `/contact` - Contact page
- `/login` - Login/Registration

### Protected Routes
- `/elections` - Election voting page
- `/clubs` - Browse clubs
- `/services` - Student services
- `/latest` - Latest news/posts
- `/complaints` - Submit complaints

## Database Schema

### Tables Created
1. **users** - User accounts with roles
2. **clubs** - Student clubs with status tracking
3. **proposals** - Club proposal submissions
4. **elections** - Election management
5. **candidates** - Election candidates
6. **votes** - Vote records (one per student per election)
7. **notifications** - System notifications
8. **system_settings** - Configuration (counter, settings)

### Security
- Row Level Security (RLS) enabled on all tables
- Role-based policies enforce access control
- Users can only access their permitted data
- Bcrypt password hashing

## Getting Started

### 1. Login as Admin
Use one of the pre-created admin accounts:
- President: `president` / `admin123`
- Academic Branch: `academic` / `admin123`
- Clubs Branch: `clubs` / `admin123`

### 2. Approve Clubs (as Clubs Branch Admin)
1. Login with `clubs` / `admin123`
2. Go to Dashboard
3. Navigate to "Pending Clubs" tab
4. Click checkmark icon to approve each club
5. System automatically generates representative credentials
6. Credentials displayed in success message and sent as notification

### 3. Login as Club Representative
1. Use auto-generated credentials from approval
2. View countdown timer on dashboard
3. Upload proposal before deadline expires

### 4. Create Election (as President)
1. Login as president
2. Create new election with dates
3. Add candidates
4. Students can vote until end time

### 5. Vote in Election (as Student)
1. Register or login as student
2. Go to Elections page
3. Select candidate
4. Submit vote (one time only)

## Important Notes

### Database Configuration
- **NOT using MongoDB Atlas**
- Using Supabase (PostgreSQL)
- Connection configured in `.env` file:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### Password Requirements
- Minimum 4 characters (relaxed for demo)
- Default admin password: `admin123`
- Club rep passwords: `DBU@` + 4 digits

### Username Format
- Students: flexible format
- Club reps: `dbu1500XXXX` (auto-generated)
- Admins: role names (president, academic, clubs)

### Timer Management
- Manual timer checks: Call edge function `/check-timers`
- Automatic checks: Set up cron job or use Supabase cron extension
- Frontend checks: Every 60 seconds in dashboards

## API Services

### Core Services
- `authService` - Authentication and session management
- `clubService` - Club CRUD and approval workflow
- `proposalService` - Proposal submission and review
- `electionService` - Election and voting management
- `notificationService` - Notification system

### Key Functions

#### Club Service
```javascript
clubService.approveClub(clubId, deadlineDays)
// Auto-generates credentials, creates user, sets timer

clubService.getTimeRemaining(deadline)
// Returns {days, hours, minutes, expired}

clubService.checkAndUpdateExpiredTimers()
// Checks and updates all expired timers
```

#### Election Service
```javascript
electionService.vote(electionId, candidateId, voterId, universityId)
// One vote per university ID per election

electionService.checkAndCloseExpiredElections()
// Auto-closes expired elections
```

## Troubleshooting

### Timer Not Updating
- Check browser console for errors
- Verify club has `proposal_deadline` set
- Ensure `timer_status` is 'active'

### Cannot Login
- Verify username and password
- Check `is_active` flag in database
- Clear browser localStorage

### Notifications Not Appearing
- Check user ID matches
- Verify RLS policies allow read access
- Check notification panel in header

### Auto-Generation Failed
- Verify `system_settings` table has `club_rep_counter`
- Check Supabase service role permissions
- Review edge function logs

## Production Deployment

1. **Environment Variables**: Update `.env` with production Supabase credentials
2. **Build**: Run `npm run build`
3. **Deploy**: Deploy `dist` folder to hosting service
4. **Cron Job**: Set up periodic calls to `/check-timers` function
5. **Security**: Review and tighten RLS policies if needed

## Support

For issues or questions:
1. Check Supabase dashboard for data
2. Review browser console for errors
3. Check edge function logs in Supabase
4. Verify RLS policies allow required access

---

## System Summary

✅ Complete role-based access control system
✅ Automated club representative account generation
✅ Real-time countdown timers (days, hours, minutes)
✅ Automated notifications and alerts
✅ One-vote-per-student election system
✅ Proposal deadline enforcement
✅ Full admin dashboards for each role
✅ Supabase database with RLS security
✅ Edge function for automated timer checks
✅ 5 pre-loaded clubs ready for approval

The system is fully functional and ready to use!
