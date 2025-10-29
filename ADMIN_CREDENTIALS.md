# Admin Credentials Setup

## Overview
Two new admin users have been configured with direct dashboard access:

---

## 1. Club Administrator

### Login Credentials
- **Username:** `dbu10101015`
- **Password:** `Admin1234#`
- **Role:** `club_admin`
- **Email:** `clubadmin@dbu.edu.et`

### Login Endpoint
```
POST /api/club-admin/login
```

### Request Body
```json
{
  "username": "dbu10101015",
  "password": "Admin1234#"
}
```

### Dashboard Access
```
GET /api/club-management/dashboard
Authorization: Bearer <token>
```

### Permissions
- ✅ Manage assigned club(s)
- ✅ Approve/reject club membership requests
- ✅ Update club information
- ✅ Manage club events
- ✅ View club analytics
- ❌ Cannot create clubs (only super admin)
- ❌ Cannot join clubs as member

---

## 2. Academic Affairs Officer

### Login Credentials
- **Username:** `dbu10101016`
- **Password:** `Admin12345#`
- **Role:** `academic_affairs`
- **Email:** `academic.affairs@dbu.edu.et`

### Login Endpoint
```
POST /api/academic-affairs/login
```

### Request Body
```json
{
  "username": "dbu10101016",
  "password": "Admin12345#"
}
```

### Dashboard Access
```
GET /api/academic-affairs/dashboard
Authorization: Bearer <token>
```

### Permissions
- ✅ Resolve academic complaints
- ✅ Upload academic documents
- ✅ View student academic data
- ✅ Handle curriculum feedback
- ✅ Manage academic policy advocacy
- ✅ Provide academic support
- ✅ Vote in elections
- ✅ Join clubs

### Academic Responsibilities
1. Academic policy advocacy
2. Student academic support
3. Curriculum feedback coordination
4. Academic complaint resolution

---

## Setup Instructions

The users are automatically created/updated when the server starts. The system uses the `createDefaultAdmin` utility in `backend/utils/createAdmin.js`.

### To Initialize Users

1. Ensure MongoDB is running
2. Start the backend server:
   ```bash
   cd backend
   npm start
   ```
3. The users will be created automatically on server startup
4. Check server logs for confirmation messages

### Password Reset

Both users can reset their passwords using the forgot password feature:

**Club Admin:**
```
POST /api/club-admin/reset-password
```

**Academic Affairs:**
```
POST /api/academic-affairs/reset-password
```

---

## Role Hierarchy

```
Super Admin (dbu10101010)
├── President Admin (dbu10101020)
├── Club Admin (dbu10101015) ✓ NEW
├── Academic Affairs (dbu10101016) ✓ NEW
└── Students
```

---

## Testing Login

### Test Club Admin Login
```bash
curl -X POST http://localhost:5000/api/club-admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dbu10101015",
    "password": "Admin1234#"
  }'
```

### Test Academic Affairs Login
```bash
curl -X POST http://localhost:5000/api/academic-affairs/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dbu10101016",
    "password": "Admin12345#"
  }'
```

---

## Security Notes

- ✅ Passwords are hashed using bcrypt with 12 salt rounds
- ✅ JWT tokens expire after 7 days
- ✅ Account lockout after 5 failed login attempts
- ✅ Role-based access control enforced
- ✅ Protected routes require valid authentication tokens

---

## Frontend Integration

When integrating these logins into your frontend, use the appropriate login endpoints:

```javascript
// Club Admin Login
const loginClubAdmin = async (username, password) => {
  const response = await fetch('/api/club-admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json();
  localStorage.setItem('token', data.token);
  localStorage.setItem('userRole', data.user.role);
};

// Academic Affairs Login
const loginAcademicAffairs = async (username, password) => {
  const response = await fetch('/api/academic-affairs/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json();
  localStorage.setItem('token', data.token);
  localStorage.setItem('userRole', data.user.role);
};
```

---

## Status

- ✅ Club Admin user configured with credentials
- ✅ Academic Affairs user configured with credentials
- ✅ Login endpoints active
- ✅ Dashboard access enabled
- ✅ Role-based permissions set
- ✅ Automatic user creation on server startup

Both users can now login directly to their respective dashboards using the provided credentials!
