# 🔑 Super Admin API Documentation

## Overview
The super admin (dbu10101010) has exclusive access to club creation and club admin management functionality.

## Authentication
All super admin endpoints require:
- Bearer token from login
- User role must be "super_admin"

## API Endpoints

### 1. Create Club Admin
**POST** `/api/super-admin/create-club-admin`

Creates a new club admin user with username format `dbuxxxxxxxx` and default password `Admin123#`.

**Request Body:**
```json
{
  "name": "John Doe",
  "username": "dbu12345678",
  "email": "john.doe@dbu.edu.et",
  "phoneNumber": "+251987654321",
  "assignedClubId": "optional_club_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Club admin created successfully",
  "clubAdmin": {
    "id": "admin_id",
    "name": "John Doe",
    "username": "dbu12345678",
    "email": "john.doe@dbu.edu.et",
    "role": "club_admin"
  },
  "loginCredentials": {
    "username": "dbu12345678",
    "password": "Admin123#",
    "message": "Please share these credentials securely with the club admin"
  }
}
```

### 2. Create Club with Admin
**POST** `/api/super-admin/create-club-with-admin`

Creates a club and assigns a club admin in one operation.

**Request Body:**
```json
{
  "clubName": "Photography Club",
  "clubDescription": "A club for photography enthusiasts",
  "clubCategory": "Arts & Culture",
  "clubContactEmail": "photo@club.dbu.edu.et",
  "clubMeetingSchedule": "Every Friday 3:00 PM",
  "adminName": "Jane Smith",
  "adminUsername": "dbu87654321",
  "adminEmail": "jane.smith@dbu.edu.et",
  "adminPhone": "+251912345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Club and club admin created successfully",
  "club": {
    "id": "club_id",
    "name": "Photography Club",
    "description": "A club for photography enthusiasts",
    "category": "Arts & Culture",
    "status": "active"
  },
  "clubAdmin": {
    "id": "admin_id",
    "name": "Jane Smith",
    "username": "dbu87654321",
    "email": "jane.smith@dbu.edu.et",
    "role": "club_admin"
  },
  "loginCredentials": {
    "username": "dbu87654321",
    "password": "Admin123#"
  }
}
```

### 3. Assign Admin to Existing Club
**PUT** `/api/super-admin/assign-admin-to-club/:clubId`

Assigns an existing club admin to a club.

**Request Body:**
```json
{
  "adminUsername": "dbu12345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin assigned to club successfully",
  "assignment": {
    "club": {
      "id": "club_id",
      "name": "Photography Club"
    },
    "admin": {
      "id": "admin_id",
      "name": "John Doe",
      "username": "dbu12345678"
    }
  }
}
```

### 4. Get All Club Admins
**GET** `/api/super-admin/club-admins`

Lists all club admins in the system.

**Response:**
```json
{
  "success": true,
  "count": 5,
  "clubAdmins": [
    {
      "id": "admin_id",
      "name": "John Doe",
      "username": "dbu12345678",
      "email": "john.doe@dbu.edu.et",
      "role": "club_admin",
      "assignedClub": {
        "id": "club_id",
        "name": "Photography Club",
        "category": "Arts & Culture"
      }
    }
  ]
}
```

### 5. Get Clubs Without Admin
**GET** `/api/super-admin/clubs-without-admin`

Lists clubs that don't have an assigned admin.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "clubs": [
    {
      "id": "club_id",
      "name": "Music Club",
      "description": "Club for music lovers",
      "category": "Arts & Culture",
      "status": "active"
    }
  ]
}
```

## Usage Flow

1. **Login as Super Admin**: Use username `dbu10101010` with your credentials
2. **Create Club with Admin**: Use the `/create-club-with-admin` endpoint to create both club and admin
3. **Or Create Separately**: 
   - First create a club admin with `/create-club-admin`
   - Then assign them to a club with `/assign-admin-to-club`
4. **Monitor**: Use `/club-admins` to see all club admins and their assignments

## Important Notes

- ✅ Only super admin (dbu10101010) can access these endpoints
- ✅ Club admin usernames must follow format: `dbuxxxxxxxx`
- ✅ Default password for all club admins: `Admin123#`
- ✅ Club admins can manage their assigned clubs but cannot create new clubs
- ⚠️ Regular admins can no longer create clubs - only super admin can

## Error Responses

All endpoints return error responses in this format:
```json
{
  "success": false,
  "message": "Error description"
}
```

Common status codes:
- `400`: Bad request (validation errors)
- `401`: Unauthorized (no token or invalid token)
- `403`: Forbidden (not super admin)
- `404`: Not found (club/user not found)
- `409`: Conflict (username/email already exists)
- `500`: Server error