# President Admin API Guide

## 🎯 Overview
This guide covers all API endpoints available for President Admin users. President Admin is responsible for creating the infrastructure of the student council system - clubs and elections.

## 🔐 Authentication
All President Admin endpoints require:
- **Authorization**: `Bearer <JWT_TOKEN>`
- **Role**: `president_admin`
- **Permissions**: Automatically assigned based on role

## 🏠 Dashboard

### Get President Admin Dashboard
**Endpoint**: `GET /api/president-admin/dashboard`
**Access**: President Admin only

**Response**:
```json
{
  "success": true,
  "data": {
    "statistics": {
      "totalClubs": 15,
      "activeClubs": 12,
      "pendingClubs": 3,
      "totalElections": 8,
      "activeElections": 1,
      "upcomingElections": 2
    },
    "recentClubs": [
      {
        "_id": "club_id",
        "name": "Tech Innovation Club",
        "category": "Technology",
        "status": "active",
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ],
    "recentElections": [
      {
        "_id": "election_id",
        "title": "Student Council President 2025",
        "status": "upcoming",
        "startDate": "2025-02-01T09:00:00Z",
        "endDate": "2025-02-03T17:00:00Z",
        "createdAt": "2025-01-15T14:00:00Z"
      }
    ]
  }
}
```

---

## 🏛️ Club Management

### Create New Club
**Endpoint**: `POST /api/president-admin/clubs`
**Access**: President Admin only

**Request Body**:
```json
{
  "name": "Tech Innovation Club",
  "description": "A club focused on technology innovation and entrepreneurship",
  "category": "Technology",
  "founded": "2025",
  "image": "https://example.com/club-image.jpg",
  "contactEmail": "tech@club.dbu.edu.et",
  "meetingSchedule": "Every Tuesday at 3:00 PM",
  "requirements": "Interest in technology and innovation",
  
  // Optional: Create club manager simultaneously
  "clubManagerName": "John Manager",
  "clubManagerUsername": "john_manager",
  "clubManagerPassword": "secure123",
  "clubManagerEmail": "john@club.dbu.edu.et",
  "clubManagerPhone": "+251911234567"
}
```

**Required Fields**: `name`, `description`, `category`

**Valid Categories**: 
- Academic
- Sports
- Cultural
- Technology
- Service
- Arts
- Religious
- Professional

**Response**:
```json
{
  "success": true,
  "message": "Club and club manager created successfully",
  "data": {
    "club": {
      "id": "club_id",
      "name": "Tech Innovation Club",
      "description": "A club focused on technology innovation and entrepreneurship",
      "category": "Technology",
      "status": "active",
      "createdAt": "2025-01-15T10:00:00Z"
    },
    "clubManager": {
      "id": "manager_id",
      "name": "John Manager",
      "username": "john_manager",
      "email": "john@club.dbu.edu.et",
      "role": "club_admin"
    }
  },
  "loginInstructions": "Club manager can login using username: john_manager and the provided password."
}
```

### Get All Clubs
**Endpoint**: `GET /api/president-admin/clubs`
**Access**: President Admin only

**Query Parameters**:
- `status` (optional): Filter by status (active, pending_approval, inactive, suspended)
- `category` (optional): Filter by category
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Example**: `/api/president-admin/clubs?status=active&category=Technology&page=1&limit=20`

**Response**:
```json
{
  "success": true,
  "count": 5,
  "total": 15,
  "currentPage": 1,
  "totalPages": 2,
  "data": [
    {
      "_id": "club_id",
      "name": "Tech Innovation Club",
      "description": "A club focused on technology innovation and entrepreneurship",
      "category": "Technology",
      "status": "active",
      "clubAdmin": {
        "_id": "manager_id",
        "name": "John Manager",
        "username": "john_manager",
        "email": "john@club.dbu.edu.et"
      },
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

## 🗳️ Election Management

### Create New Election
**Endpoint**: `POST /api/president-admin/elections`
**Access**: President Admin only

**Request Body**:
```json
{
  "title": "Student Council President 2025",
  "description": "Annual election for Student Council President position",
  "startDate": "2025-02-01T09:00:00Z",
  "endDate": "2025-02-03T17:00:00Z",
  "electionType": "president",
  "isPublic": true,
  "candidates": [
    {
      "name": "Alice Johnson",
      "username": "alice_j",
      "department": "Computer Science",
      "year": "3rd Year",
      "academicYear": "3rd Year",
      "position": "President",
      "platform": ["Improve campus facilities", "Enhance student services"],
      "biography": "Experienced student leader with strong vision for change"
    },
    {
      "name": "Bob Smith",
      "username": "bob_s",
      "department": "Engineering",
      "year": "4th Year",
      "academicYear": "4th Year",
      "position": "President",
      "platform": ["Better communication", "More student events"],
      "biography": "Dedicated to serving fellow students"
    }
  ],
  "rules": [
    "Only registered students can vote",
    "Each voter can vote only once",
    "Voting is anonymous and secure"
  ],
  "votingEligibility": {
    "roles": ["student", "club_admin", "academic_affairs"],
    "departments": [],
    "years": []
  }
}
```

**Required Fields**: `title`, `description`, `startDate`, `endDate`, `candidates`

**Election Types**:
- general
- president
- vice_president
- secretary
- treasurer
- branch_leader

**Response**:
```json
{
  "success": true,
  "message": "Election created successfully",
  "data": {
    "_id": "election_id",
    "title": "Student Council President 2025",
    "description": "Annual election for Student Council President position",
    "startDate": "2025-02-01T09:00:00Z",
    "endDate": "2025-02-03T17:00:00Z",
    "status": "upcoming",
    "candidates": [...],
    "eligibleVoters": 1250,
    "createdBy": {
      "_id": "user_id",
      "name": "President Admin",
      "role": "president_admin"
    },
    "createdAt": "2025-01-15T14:00:00Z"
  }
}
```

### Get All Elections Created
**Endpoint**: `GET /api/president-admin/elections`
**Access**: President Admin only

**Query Parameters**:
- `status` (optional): Filter by status (upcoming, active, completed, cancelled)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response**:
```json
{
  "success": true,
  "count": 3,
  "total": 8,
  "currentPage": 1,
  "totalPages": 1,
  "data": [
    {
      "_id": "election_id",
      "title": "Student Council President 2025",
      "status": "active",
      "startDate": "2025-02-01T09:00:00Z",
      "endDate": "2025-02-03T17:00:00Z",
      "totalVotes": 245,
      "eligibleVoters": 1250,
      "timeRemaining": {
        "days": 1,
        "hours": 5,
        "minutes": 30,
        "seconds": 15,
        "isExpired": false
      },
      "createdAt": "2025-01-15T14:00:00Z"
    }
  ]
}
```

### Update Election
**Endpoint**: `PUT /api/president-admin/elections/:id`
**Access**: President Admin only (creator of election)

**Note**: Can only update elections that are not active or completed.

**Request Body** (all fields optional):
```json
{
  "title": "Updated Election Title",
  "description": "Updated description",
  "startDate": "2025-02-02T09:00:00Z",
  "endDate": "2025-02-04T17:00:00Z",
  "candidates": [...],
  "rules": [...],
  "isPublic": false,
  "votingEligibility": {...}
}
```

**Response**:
```json
{
  "success": true,
  "message": "Election updated successfully",
  "data": {
    // Updated election object
  }
}
```

### Delete Election
**Endpoint**: `DELETE /api/president-admin/elections/:id`
**Access**: President Admin only (creator of election)

**Note**: Cannot delete active elections.

**Response**:
```json
{
  "success": true,
  "message": "Election deleted successfully"
}
```

### Publish Election Results
**Endpoint**: `POST /api/president-admin/elections/:id/publish-results`
**Access**: President Admin only (creator of election)

**Note**: Can only publish results for completed elections.

**Response**:
```json
{
  "success": true,
  "message": "Election results published successfully",
  "data": {
    "electionId": "election_id",
    "title": "Student Council President 2025",
    "resultsPublished": true,
    "publishedAt": "2025-02-04T09:00:00Z"
  }
}
```

---

## 🔧 Important Features

### Automatic Permissions
President Admin users have these permissions automatically:
- ✅ `canCreateClubs` - Create new clubs
- ❌ `canManageClubs` - Cannot manage day-to-day club operations
- ✅ `canCreateElections` - Create elections with timer
- ❌ `canVoteElections` - Admin roles don't vote
- ✅ `canPostNews` - Post news for all users
- ✅ `canViewNews` - View all news
- ❌ `canWriteComplaints` - Admin roles don't file complaints
- ✅ `canResolveComplaints` - Resolve general complaints only
- ❌ `canResolveAcademicComplaints` - Academic complaints handled by Academic Affairs
- ✅ `canUploadDocuments` - Upload documents
- ❌ `canJoinClubs` - Admin roles don't join clubs

### Club Creation with Manager
When creating a club, you can optionally create a club manager simultaneously:
1. Provide club manager details in the club creation request
2. System creates both club and club admin user
3. Club admin is automatically assigned to manage the club
4. Club admin gets `club_admin` role with management permissions

### Election Timer System
Elections created by President Admin include:
- **Real-time countdown** showing time remaining
- **Automatic status updates** (upcoming → active → completed)
- **Voting eligibility** based on roles, departments, and years
- **Results publication** control

### Role Separation
President Admin creates infrastructure but doesn't manage:
- **Creates clubs** → **Club Admin manages** daily operations
- **Creates elections** → **Students, Club Admins, Academic Affairs vote**
- **Posts news** → **All users can view and interact**

---

## 📝 Usage Examples

### Complete Club Creation Flow
```bash
# 1. Create club with manager
curl -X POST http://localhost:5000/api/president-admin/clubs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Innovation Hub",
    "description": "A space for innovative thinking and collaboration",
    "category": "Technology",
    "clubManagerName": "Sarah Manager",
    "clubManagerUsername": "sarah_mgr",
    "clubManagerPassword": "secure123",
    "clubManagerEmail": "sarah@innovation.dbu.edu.et"
  }'

# 2. View created clubs
curl -X GET "http://localhost:5000/api/president-admin/clubs?status=active" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Complete Election Creation Flow
```bash
# 1. Create election
curl -X POST http://localhost:5000/api/president-admin/elections \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Class Representative 2025",
    "description": "Election for class representatives",
    "startDate": "2025-03-01T09:00:00Z",
    "endDate": "2025-03-03T17:00:00Z",
    "candidates": [
      {
        "name": "John Candidate",
        "username": "john_c",
        "department": "Computer Science",
        "year": "2nd Year",
        "academicYear": "2nd Year",
        "position": "Class Representative",
        "platform": ["Better communication", "More resources"]
      }
    ]
  }'

# 2. View election with timer
curl -X GET "http://localhost:5000/api/president-admin/elections" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 3. Publish results after completion
curl -X POST "http://localhost:5000/api/president-admin/elections/ELECTION_ID/publish-results" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## ⚠️ Important Notes

### Permissions & Security
- All endpoints require valid JWT token with `president_admin` role
- Automatic permission validation on each request
- Only creator can update/delete their own elections
- Cannot update active or completed elections
- Cannot delete active elections

### Data Validation
- All required fields are validated
- Date validation ensures start date is not in past
- End date must be after start date
- Club names must be unique
- Username/email uniqueness for club managers

### Error Responses
All endpoints return consistent error format:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information (in development only)"
}
```

### Timer System
Elections include real-time timer calculations:
- Shows exact time remaining (days, hours, minutes, seconds)
- Automatic status updates based on current time
- `isExpired` flag for completed elections

This API provides complete functionality for President Admin to create and manage the foundational infrastructure of the student council system!