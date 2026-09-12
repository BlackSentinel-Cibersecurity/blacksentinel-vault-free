# Authentication API

## Overview

BlackSentinel Vault uses JWT-based authentication with support for multiple authentication methods including MFA, SSO, and API keys.

## Authentication Flow

### 1. Username/Password Authentication

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mfaRequired": true,
    "mfaToken": "mfa_abc123",
    "expiresIn": 300
  }
}
```

### 2. MFA Verification

```http
POST /api/v1/auth/mfa/verify
Content-Type: application/json

{
  "mfaToken": "mfa_abc123",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJl...",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "roles": ["developer"],
      "mfaEnabled": true
    }
  }
}
```

### 3. Token Refresh

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJl..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "bmV3IHJlZnJlc2ggdG9r...",
    "expiresIn": 3600
  }
}
```

### 4. Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

## SSO Authentication

### OAuth 2.0 / OIDC

```http
GET /api/v1/auth/sso/authorize?provider=microsoft&state=xyz
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://login.microsoftonline.com/..."
  }
}
```

### Callback

```http
GET /api/v1/auth/sso/callback?code=auth_code&state=xyz
```

## API Key Authentication

```http
GET /api/v1/secrets
X-API-Key: bs_abc123def456...
```

## Token Structure

### Access Token Payload

```json
{
  "sub": "usr_abc123",
  "email": "user@example.com",
  "roles": ["developer"],
  "permissions": ["secrets:read", "secrets:write"],
  "sessionId": "sess_xyz789",
  "mfaVerified": true,
  "riskScore": 25,
  "iat": 1700000000,
  "exp": 1700003600,
  "iss": "blacksentinel-vault"
}
```

## Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

### 403 Forbidden

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

### 429 Rate Limited

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later"
  }
}
```

## Security Best Practices

1. **Token Storage**: Store tokens securely (httpOnly cookies or secure storage)
2. **Token Rotation**: Refresh tokens before expiry
3. **Secure Transmission**: Always use HTTPS
4. **Token Revocation**: Logout properly to revoke tokens
5. **MFA**: Enable MFA for all users
6. **Session Management**: Implement session timeouts
