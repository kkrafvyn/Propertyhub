/*
# Verification System - Required Backend API Endpoints

This document specifies all required backend API endpoints for the PropertyHub Verification System.

## Base URL

```
https://api.propertyhub.com/api/verification
```

## API Endpoints Overview

| # | Method | Endpoint | Purpose | Status |
|---|--------|----------|---------|--------|
| 1 | POST | `/initiate` | Start verification process | Pending |
| 2 | GET | `/requests/:id` | Get verification request details | Pending |
| 3 | PUT | `/requests/:id` | Update verification request | Pending |
| 4 | GET | `/users/:userId/requests` | List user verification requests | Pending |
| 5 | POST | `/documents/upload` | Upload verification document | Pending |
| 6 | GET | `/documents/:id` | Get document details | Pending |
| 7 | POST | `/documents/:id/verify` | Verify/approve document | Pending |
| 8 | POST | `/documents/:id/reject` | Reject document | Pending |
| 9 | GET | `/status/:userId` | Get user verification status | Pending |
| 10 | POST | `/fraud/analyze` | Analyze fraud patterns | Pending |
| 11 | GET | `/fraud/alerts/:userId` | Get user fraud alerts | Pending |
| 12 | GET | `/badges/:userId` | Get user verification badges | Pending |
| 13 | POST | `/complete` | Complete verification process | Pending |

---

## Detailed Endpoint Specifications

### 1. Initiate Verification

**Endpoint:** `POST /initiate`

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "verificationType": "national_id"
}
```

**Request Parameters:**
- `userId` (string, required): UUID of the user
- `verificationType` (string, required): One of `national_id`, `passport`, `driver_license`

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "verification_type": "national_id",
  "status": "pending",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "completed_at": null,
  "rejection_reason": null
}
```

**Error Response (409 Conflict):**
```json
{
  "error": "DUPLICATE_VERIFICATION",
  "message": "User already has active verification request"
}
```

**Business Logic:**
- Check if user has active verification (status != 'completed')
- Create new verification request
- Initialize verification status (if first time)
- Trigger notification to user

---

### 2. Get Verification Request

**Endpoint:** `GET /requests/:id`

**Authentication:** Required

**Path Parameters:**
- `id` (string): Verification request ID

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "verification_type": "national_id",
  "status": "in_review",
  "documents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "document_type": "national_id",
      "status": "under_review",
      "file_url": "https://...",
      "uploaded_at": "2024-01-15T10:35:00Z"
    }
  ],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:35:00Z"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "REQUEST_NOT_FOUND",
  "message": "Verification request not found"
}
```

---

### 3. Update Verification Request

**Endpoint:** `PUT /requests/:id`

**Authentication:** Required (Admin/Reviewer only)

**Path Parameters:**
- `id` (string): Verification request ID

**Request Body:**
```json
{
  "status": "in_review",
  "notes": "Initial review started"
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "in_review",
  "updated_at": "2024-01-15T10:40:00Z"
}
```

---

### 4. List User Verification Requests

**Endpoint:** `GET /users/:userId/requests`

**Authentication:** Required

**Path Parameters:**
- `userId` (string): User ID

**Query Parameters:**
- `limit` (integer, default: 10)
- `offset` (integer, default: 0)
- `status` (string, optional): Filter by status

**Response (200 OK):**
```json
{
  "requests": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "verification_type": "national_id",
      "status": "approved",
      "created_at": "2024-01-15T10:30:00Z",
      "completed_at": "2024-01-15T11:30:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440005",
      "verification_type": "passport",
      "status": "pending",
      "created_at": "2024-01-16T09:00:00Z"
    }
  ],
  "total": 2,
  "limit": 10,
  "offset": 0
}
```

---

### 5. Upload Document

**Endpoint:** `POST /documents/upload`

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Request Body:**
```
- request_id: "550e8400-e29b-41d4-a716-446655440001" (string, required)
- document_type: "national_id" (string, required)
- file: [binary file data] (file, required, max 10MB)
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "request_id": "550e8400-e29b-41d4-a716-446655440001",
  "document_type": "national_id",
  "file_name": "passport-photo.jpg",
  "file_type": "image/jpeg",
  "file_size": 2048576,
  "file_url": "https://cdn.propertyhub.com/documents/550e8400-e29b-41d4-a716-446655440002.jpg",
  "status": "pending",
  "extracted_data": {
    "number": "GH-123456789-0",
    "name": "John Doe",
    "dateOfBirth": "1990-05-15",
    "gender": "Male",
    "issueDate": "2020-01-10",
    "expiryDate": "2025-01-10"
  },
  "uploaded_at": "2024-01-15T10:35:00Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "INVALID_FILE",
  "message": "File size exceeds maximum limit of 10MB"
}
```

**Business Logic:**
- Validate file type (only images and PDF)
- Validate file size (max 10MB)
- Scan for malware
- Store in secure storage
- Extract data using OCR
- Save extracted data to database
- Update request status to 'in_review'

---

### 6. Get Document Details

**Endpoint:** `GET /documents/:id`

**Authentication:** Required

**Path Parameters:**
- `id` (string): Document ID

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "request_id": "550e8400-e29b-41d4-a716-446655440001",
  "document_type": "national_id",
  "file_name": "id_document.jpg",
  "file_type": "image/jpeg",
  "file_size": 2048576,
  "file_url": "https://...",
  "status": "approved",
  "extracted_data": {
    "number": "GH-123456789-0",
    "name": "John Doe",
    "dateOfBirth": "1990-05-15",
    "expiryDate": "2025-01-10"
  },
  "uploaded_at": "2024-01-15T10:35:00Z",
  "verified_at": "2024-01-15T10:45:00Z",
  "rejection_reason": null
}
```

---

### 7. Verify Document

**Endpoint:** `POST /documents/:id/verify`

**Authentication:** Required (Admin/Reviewer only)

**Path Parameters:**
- `id` (string): Document ID

**Request Body:**
```json
{
  "approved": true,
  "notes": "Document manually verified and approved",
  "extractedDataConfirm": {
    "number": "GH-123456789-0",
    "name": "John Doe",
    "dateOfBirth": "1990-05-15",
    "expiryDate": "2025-01-10"
  }
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "status": "approved",
  "verified_at": "2024-01-15T10:45:00Z"
}
```

**Business Logic:**
- Update document status to 'approved'
- Check if all documents in request are approved
- If all approved, trigger completion workflow
- Notify user of approval

---

### 8. Reject Document

**Endpoint:** `POST /documents/:id/reject`

**Authentication:** Required (Admin/Reviewer only)

**Path Parameters:**
- `id` (string): Document ID

**Request Body:**
```json
{
  "reason": "Document expired or illegible",
  "requiresResubmission": true
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "status": "rejected",
  "rejection_reason": "Document expired or illegible",
  "updated_at": "2024-01-15T10:50:00Z"
}
```

**Business Logic:**
- Update document status to 'rejected'
- Store rejection reason
- Mark verification as 'rejected' if needed
- Notify user with reason
- Allow user to resubmit if requiresResubmission=true

---

### 9. Get User Verification Status

**Endpoint:** `GET /status/:userId`

**Authentication:** Required

**Path Parameters:**
- `userId` (string): User ID

**Response (200 OK):**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "verification_status": "verified",
  "last_verified_at": "2024-01-15T11:30:00Z",
  "verification_badge": true,
  "fraud_risk_level": "low",
  "verification_expiry": "2025-01-15T23:59:59Z",
  "badges": [
    {
      "type": "id_verified",
      "awarded_at": "2024-01-15T11:30:00Z"
    }
  ]
}
```

---

### 10. Analyze Fraud Patterns

**Endpoint:** `POST /fraud/analyze`

**Authentication:** Required

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "documentData": {
    "number": "GH-123456789-0",
    "name": "John Doe",
    "dateOfBirth": "1990-05-15"
  }
}
```

**Response (200 OK):**
```json
{
  "fraudRiskScore": 15,
  "riskLevel": "low",
  "suspiciousPatterns": [],
  "blacklistMatch": false,
  "duplicateSubmissions": [],
  "analysis": {
    "documentAuthenticity": "high_confidence",
    "addressVerification": "verified",
    "phoneVerification": "verified"
  },
  "timestamp": "2024-01-15T10:50:00Z"
}
```

**Business Logic:**
- Check document against known fraud databases
- Analyze for forged/fake documents
- Check for duplicate submissions
- Verify extracted information consistency
- Calculate fraud risk score
- Flag if suspicious patterns detected

---

### 11. Get User Fraud Alerts

**Endpoint:** `GET /fraud/alerts/:userId`

**Authentication:** Required (User can see own, Admin can see all)

**Path Parameters:**
- `userId` (string): User ID

**Query Parameters:**
- `limit` (integer, default: 10)
- `resolved` (boolean, optional): Filter by resolution status

**Response (200 OK):**
```json
{
  "alerts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "alert_type": "duplicate_submission",
      "description": "Multiple submissions detected for national ID",
      "severity": "high",
      "created_at": "2024-01-15T10:50:00Z",
      "resolved": false
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440011",
      "alert_type": "blacklist_match",
      "description": "Document number matches fraud blacklist",
      "severity": "critical",
      "created_at": "2024-01-15T10:52:00Z",
      "resolved": false
    }
  ],
  "total": 2
}
```

---

### 12. Get User Verification Badges

**Endpoint:** `GET /badges/:userId`

**Authentication:** Required

**Path Parameters:**
- `userId` (string): User ID

**Response (200 OK):**
```json
{
  "badges": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440015",
      "type": "id_verified",
      "label": "ID Verified",
      "description": "User's identity has been verified with national ID",
      "awardedAt": "2024-01-15T11:30:00Z",
      "expiresAt": "2025-01-15T23:59:59Z",
      "iconUrl": "https://..."
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440016",
      "type": "trusted_landlord",
      "label": "Trusted Landlord",
      "awardedAt": "2024-01-15T12:00:00Z"
    }
  ],
  "totalBadges": 2
}
```

---

### 13. Complete Verification

**Endpoint:** `POST /complete`

**Authentication:** Required

**Request Body:**
```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Response (200 OK):**
```json
{
  "approved": true,
  "message": "Verification approved successfully",
  "badgeAwarded": true,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "verificationStatus": "verified",
  "verificationExpiry": "2025-01-15T23:59:59Z",
  "completedAt": "2024-01-15T11:30:00Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "INCOMPLETE_DOCUMENTS",
  "message": "Not all required documents have been verified"
}
```

**Business Logic:**
- Verify all documents are approved
- Check fraud analysis results
- Award verification badge
- Update user verification status
- Set verification expiry (1 year)
- LOG verification completion
- Send notification email
- Update user profile with verified status

---

## Implementation Notes

### Authentication

All endpoints require Bearer token in `Authorization` header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Error Handling

Standard error response format:
```json
{
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {
    "field": "Additional error details"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Rate Limiting

- Document upload: 5 requests per hour per user
- Verification requests: 3 per day per user
- API calls: 100 requests per minute per user

### File Upload

- Max file size: 10MB
- Allowed formats: JPG, PNG, PDF
- Store in encrypted S3 bucket
- Generate signed URLs for access (24-hour expiry)

### Data Validation

- All text fields must be non-empty and properly formatted
- Document numbers must match expected format
- Dates must be valid and not expired
- Phone numbers must be verifiable

### Audit Logging

Log all verification actions:
- Document uploads
- Status changes
- Fraud alerts
- Manual reviews
- Badge awards

### Database Transactions

Use database transactions for:
- Verification completion (status + badge + expiry update)
- Document rejection with cascade
- Fraud alert creation

---

## Testing Endpoints

### cURL Examples

**1. Initiate Verification**
```bash
curl -X POST https://api.propertyhub.com/api/verification/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "verificationType": "national_id"
  }'
```

**2. Upload Document**
```bash
curl -X POST https://api.propertyhub.com/api/verification/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "request_id=550e8400-e29b-41d4-a716-446655440001" \
  -F "document_type=national_id" \
  -F "file=@/path/to/document.jpg"
```

**3. Complete Verification**
```bash
curl -X POST https://api.propertyhub.com/api/verification/complete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "550e8400-e29b-41d4-a716-446655440001"
  }'
```

---

## Timeline for Implementation

1. **Week 1:** Create database tables and migrations
2. **Week 1-2:** Implement endpoints 1-4 (verification requests)
3. **Week 2-3:** Implement endpoints 5-8 (document management)
4. **Week 3:** Implement endpoints 9-10 (status & fraud analysis)
5. **Week 4:** Implement endpoints 11-13 (badges & completion)
6. **Week 4:** Integration testing and debugging
7. **Week 5:** Deploy to staging, production hardening

---

**Status:** Ready for Backend Implementation  
**Created:** 2024-01-15  
**Last Updated:** 2024-01-15
*/
