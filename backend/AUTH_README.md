# 🔐 Edwardian Academy ERP - Authentication System

## 🏛️ Bank-Grade Security Architecture

This authentication system implements **JWT-based authentication with HTTP-only cookies** for maximum security. Tokens are never exposed to client-side JavaScript, preventing XSS attacks.

---

## 👥 User Roles

### 1. **OWNER** (Sir Waqar Baig)
- Full system access
- Can create/manage STAFF accounts
- Views all financial data (except partners' private balances)
- Manages expense distribution

### 2. **PARTNER** (Dr. Zahid & Sir Shah Saud)
- Views only their revenue stream
- Can perform "Daily Closing"
- Sees their expense debt
- Cannot see other partners' data

### 3. **STAFF** (Reception)
- Operational access only
- No financial visibility
- Can be created/deactivated by OWNER

---

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Add these to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-minimum-32-characters
JWT_EXPIRES_IN=7d

# Client URL (for CORS)
CLIENT_URL=http://localhost:5173
```

### 3. Seed Core Partners
```bash
npm run seed
```

This creates 3 protected accounts:
- **Username:** `waqar` | **Password:** `admin123` | **Role:** OWNER
- **Username:** `zahid` | **Password:** `admin123` | **Role:** PARTNER
- **Username:** `saud` | **Password:** `admin123` | **Role:** PARTNER

⚠️ **Change these passwords immediately in production!**

---

## 📡 API Endpoints

### Authentication Routes (`/api/auth`)

#### 🔓 Public Routes

##### **POST `/api/auth/login`**
Authenticate user and set HTTP-only cookie.

**Request:**
```json
{
  "username": "waqar",
  "password": "admin123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "✅ Welcome back, Sir Waqar Baig!",
  "user": {
    "userId": "OWNER-001",
    "username": "waqar",
    "fullName": "Sir Waqar Baig",
    "role": "OWNER",
    "walletBalance": 0,
    "floatingCash": 0,
    "pendingDebt": 0,
    "phone": "0300-1234567",
    "email": "waqar@edwardianacademy.com",
    "isActive": true,
    "lastLogin": "2026-01-17T08:47:00.000Z"
  }
}
```

**Sets Cookie:**
```
authToken=<JWT_TOKEN>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

---

#### 🔒 Protected Routes (Requires Authentication)

##### **POST `/api/auth/logout`**
Clears authentication cookie.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "✅ Logged out successfully."
}
```

---

##### **GET `/api/auth/me`**
Get current user profile.

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "userId": "OWNER-001",
    "username": "waqar",
    "fullName": "Sir Waqar Baig",
    "role": "OWNER",
    "walletBalance": 0,
    "floatingCash": 0,
    "pendingDebt": 0,
    "isActive": true
  }
}
```

---

#### 👑 OWNER-Only Routes

##### **POST `/api/auth/create-staff`**
Create a new STAFF account (reception).

**Request:**
```json
{
  "username": "ali_reception",
  "password": "securePass123",
  "fullName": "Ali Ahmed",
  "phone": "0300-9999999",
  "email": "ali@edwardianacademy.com"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "✅ Staff account created successfully for Ali Ahmed.",
  "user": {
    "userId": "STAFF-001",
    "username": "ali_reception",
    "fullName": "Ali Ahmed",
    "role": "STAFF",
    "isActive": true
  }
}
```

---

##### **GET `/api/auth/staff`**
Get all staff members.

**Response (200 OK):**
```json
{
  "success": true,
  "count": 2,
  "staff": [
    {
      "userId": "STAFF-001",
      "username": "ali_reception",
      "fullName": "Ali Ahmed",
      "role": "STAFF",
      "isActive": true
    },
    {
      "userId": "STAFF-002",
      "username": "sara_reception",
      "fullName": "Sara Khan",
      "role": "STAFF",
      "isActive": false
    }
  ]
}
```

---

##### **PATCH `/api/auth/staff/:id/toggle`**
Activate/Deactivate staff account.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "✅ Staff deactivated successfully.",
  "user": {
    "userId": "STAFF-002",
    "fullName": "Sara Khan",
    "isActive": false
  }
}
```

---

## 🛡️ Security Features

### 1. **HTTP-Only Cookies**
- Tokens stored in secure cookies, not localStorage
- Prevents XSS attacks
- Automatic CSRF protection with `SameSite=Strict`

### 2. **Token Rejection in Body**
```javascript
// ❌ This will be rejected with 403 Forbidden
fetch('/api/auth/me', {
  method: 'GET',
  body: JSON.stringify({ token: 'some-token' })
})
```

### 3. **Password Hashing**
- Uses `bcryptjs` with salt rounds
- Passwords never stored in plaintext

### 4. **Role-Based Access Control (RBAC)**
```javascript
// Example: Protect route for OWNER only
router.post('/expense/distribute', 
  protect, 
  restrictTo('OWNER'), 
  distributeExpense
);
```

### 5. **Protected Core Accounts**
- Waqar, Zahid, and Saud cannot be deleted (`canBeDeleted: false`)

---

## 🔧 Middleware Usage

### Basic Protection
```javascript
const { protect } = require('../middleware/authMiddleware');

// Any authenticated user can access
router.get('/dashboard', protect, getDashboard);
```

### Role-Specific Protection
```javascript
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Only OWNER can access
router.post('/create-partner', protect, restrictTo('OWNER'), createPartner);

// OWNER or PARTNER can access
router.get('/finances', protect, restrictTo('OWNER', 'PARTNER'), getFinances);
```

### Access `req.user` in Controllers
```javascript
exports.getDashboard = async (req, res) => {
  const currentUser = req.user; // Injected by protect middleware
  
  console.log(currentUser.role); // 'OWNER', 'PARTNER', or 'STAFF'
  console.log(currentUser.userId);
  console.log(currentUser.fullName);
};
```

---

## 🧪 Testing with Thunder Client / Postman

### 1. Login
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "username": "waqar",
  "password": "admin123"
}
```

### 2. Access Protected Route
After logging in, the cookie is automatically sent with subsequent requests.

```
GET http://localhost:5000/api/auth/me
```

**Note:** Make sure "Send cookies" is enabled in your HTTP client.

---

## 🚨 Error Responses

### 401 Unauthorized (No Token)
```json
{
  "success": false,
  "message": "🔒 Authentication required. Please log in."
}
```

### 401 Unauthorized (Invalid Token)
```json
{
  "success": false,
  "message": "🔐 Invalid token. Please log in again."
}
```

### 403 Forbidden (Insufficient Permissions)
```json
{
  "success": false,
  "message": "🚫 Access denied. This action requires OWNER privileges."
}
```

### 403 Forbidden (Token in Body)
```json
{
  "success": false,
  "message": "⛔ Security Violation: Tokens must be sent via secure cookies, not request body."
}
```

---

## 📝 Next Steps

1. ✅ Authentication System Complete
2. 🔄 **Next Phase:** Partner Dashboard with Financial Streams
3. 🔄 **Next Phase:** Daily Closing Mechanism
4. 🔄 **Next Phase:** Expense Reimbursement Logic

---

## 🔒 Production Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Generate a strong `JWT_SECRET` (minimum 32 characters)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS
- [ ] Set `secure: true` in cookie options
- [ ] Configure proper CORS origins
- [ ] Run `npm audit fix`
- [ ] Implement rate limiting for login endpoint
- [ ] Add logging for failed login attempts

---

**Built with 🏦 Bank-Grade Security for Edwardian Academy**
