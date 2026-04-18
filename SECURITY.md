# Security Implementation Guide

## Overview
This document outlines the security measures implemented in the SafeSpace Mobile Server to protect against common vulnerabilities and attacks.

## Implemented Security Features

### ✅ Critical Security (Implemented)

#### 1. Rate Limiting
**Purpose**: Prevent brute force attacks, credential stuffing, and DoS attacks

**Implementation**:
- Global rate limit: 300 requests per minute per IP
- Auth endpoints: 5 attempts per 15 minutes (per IP + email combination)
- Token refresh: 20 attempts per 15 minutes
- Email verification: 5 emails per hour
- Password reset: 3 attempts per hour

**Configuration**: `src/middleware/rateLimit.middleware.ts`

#### 2. Account Lockout
**Purpose**: Protect against automated brute force attacks on user accounts

**Implementation**:
- Triggers after 5 failed login attempts within 15 minutes
- Account locked for 15 minutes
- Automatic unlock after expiration
- All attempts logged with IP address and user agent

**Database**: `LoginAttempt` table tracks all login attempts

#### 3. Email Verification
**Purpose**: Ensure valid email addresses and prevent fake accounts

**Implementation**:
- Verification token generated on registration (64-character hex)
- 24-hour token expiration
- Resend verification email capability
- Email verification status tracked in user model

**Endpoints**:
- `POST /auth/verify-email` - Verify email with token
- `POST /auth/resend-verification` - Request new verification email

#### 4. Security Headers (Helmet.js)
**Purpose**: Protect against XSS, clickjacking, and other web vulnerabilities

**Enabled Headers**:
- Content-Security-Policy
- X-DNS-Prefetch-Control
- X-Frame-Options (prevents clickjacking)
- X-Content-Type-Options (prevents MIME sniffing)
- X-Download-Options
- X-Permitted-Cross-Domain-Policies

**Configuration**: Enabled globally in `src/app.ts`

---

### 🔐 Authentication & Authorization

#### JWT Token Strategy
- **Access Tokens**: 15-minute expiry, stateless
- **Refresh Tokens**: 30-day expiry, stored hashed in database
- **Token Rotation**: New refresh token issued on each refresh
- **Token Reuse Detection**: Revokes all user sessions if reuse detected

#### Password Security
- **Hashing**: bcrypt with 12 salt rounds
- **Minimum Length**: 8 characters (configurable)
- **Storage**: Only hashed passwords stored, never plaintext

#### Session Management
- Multi-device support with device ID tracking
- FCM token storage for push notifications
- Session revocation on logout
- Automatic cleanup of expired sessions

---

### 🛡️ Additional Security Measures

#### CORS Configuration
- Configurable origins via `CORS_ORIGIN` environment variable
- Credentials support enabled
- Comma-separated list for multiple allowed origins

#### Central Unit Inbound Proxy Hardening
- Proxy mode requires a verified header (`CENTRAL_UNIT_PROXY_VERIFIED_HEADER`)
- Optional shared secret validation for proxy mode:
  - `CENTRAL_UNIT_PROXY_SHARED_SECRET`
  - `CENTRAL_UNIT_PROXY_SHARED_SECRET_HEADER`
- Recommended: use `CENTRAL_UNIT_INBOUND_AUTH_MODE=mtls` whenever direct TLS client cert validation is feasible

#### HTTP Parameter Pollution (HPP) Protection
- Prevents attacks via duplicate URL parameters
- Enabled globally via `hpp` middleware

#### Request Size Limits
- JSON body size limited to 1MB
- Prevents memory exhaustion attacks

#### Account Enumeration Protection
- Generic "Invalid credentials" message for login failures
- Failed attempts logged even for non-existent users
- Registration returns generic "User already exists" message

#### IP and User Agent Tracking
- All login attempts logged with IP address
- User agent stored for session forensics
- Enables detection of suspicious access patterns

---

## Database Schema

### Security-Related Tables

#### User (Extended)
```prisma
model User {
  // Email verification
  emailVerified            Boolean   @default(false)
  emailVerificationToken   String?   @unique
  emailVerificationExpires DateTime?
  
  // Account security
  accountLockedUntil DateTime?
}
```

#### LoginAttempt
```prisma
model LoginAttempt {
  id         String   @id @default(uuid())
  userId     String?
  email      String
  ipAddress  String
  userAgent  String?
  successful Boolean  @default(false)
  createdAt  DateTime @default(now())
}
```

---

## Environment Variables

### Required for Auth
```bash
JWT_ACCESS_SECRET=<your-secret-key>
JWT_REFRESH_SECRET=<your-secret-key>
```

### Optional Configuration
```bash
JWT_ACCESS_TTL=15m        # Access token expiry (default: 15m)
JWT_REFRESH_TTL=30d       # Refresh token expiry (default: 30d)
CORS_ORIGIN=http://localhost:3000,https://app.example.com
```

---

## Security Best Practices

### For Production Deployment

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong, random JWT secrets (minimum 32 characters)
   - Rotate secrets periodically

2. **HTTPS Only**
   - Always use HTTPS in production
   - Enable HSTS (HTTP Strict Transport Security)
   - Configure secure cookies for sessions

3. **Database Security**
   - Use parameterized queries (Prisma handles this)
   - Enable database encryption at rest
   - Restrict database access to application servers only

4. **Monitoring & Logging**
   - Monitor failed login attempts
   - Alert on unusual patterns (many failures from same IP)
   - Log all security-relevant events

5. **Regular Updates**
   - Keep dependencies up to date
   - Monitor security advisories
   - Run `npm audit` regularly

---

## Planned Security Enhancements

### High Priority
- [ ] Email service integration for verification emails
- [ ] Password reset/recovery flow
- [ ] Password complexity validation (uppercase, lowercase, numbers, special chars)
- [ ] Audit logging for all auth events

### Medium Priority
- [ ] Two-Factor Authentication (2FA/TOTP)
- [ ] IP-based suspicious activity detection
- [ ] Session management UI (view/revoke active sessions)
- [ ] Password history (prevent reuse)

### Low Priority
- [ ] Device fingerprinting
- [ ] Concurrent session limits
- [ ] Force password change mechanism
- [ ] Account deletion/deactivation

---

## Testing Security Features

### Test Account Lockout
```bash
# Make 5 failed login attempts
for i in {1..5}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpassword"}'
done

# 6th attempt should return 403 ACCOUNT_LOCKED
```

### Test Rate Limiting
```bash
# Exceed rate limit (6 requests within 15 minutes)
for i in {1..6}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"different@example.com","password":"wrongpassword"}'
done

# Should return 429 Too Many Requests
```

### Test Email Verification
```bash
# 1. Register new user (returns emailVerificationToken in development)
# 2. Verify email
curl -X POST http://localhost:3000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"<token-from-registration>"}'
```

---

## Security Contact

For security issues or vulnerabilities, please contact:
- Email: security@safespace.example.com (update with your email)
- Create a private security advisory on GitHub

**Do not create public issues for security vulnerabilities.**

---

## Compliance Considerations

### GDPR Compliance
- User data minimization principle applied
- Email verification before using personal data
- TODO: Implement data export and deletion mechanisms

### Data Retention
- Login attempts: Consider periodic cleanup (e.g., after 90 days)
- Revoked sessions: Clean up after refresh token expiry
- Email verification tokens: Automatically expire after 24 hours

---

## Audit Log

| Date | Feature | Status |
|------|---------|--------|
| 2026-02-08 | Rate limiting implemented | ✅ Complete |
| 2026-02-08 | Account lockout implemented | ✅ Complete |
| 2026-02-08 | Email verification implemented | ✅ Complete |
| 2026-02-08 | Security headers (Helmet.js) | ✅ Complete |
| TBD | Email service integration | 🔄 Planned |
| TBD | Password reset flow | 🔄 Planned |

---

Last Updated: April 18, 2026
