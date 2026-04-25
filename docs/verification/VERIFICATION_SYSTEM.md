# Verification System Documentation

## Overview

The PropertyHub Verification System provides comprehensive identity verification, document validation, and fraud detection capabilities. It enables users to build trust through verified badges while protecting the platform from fraudulent activities.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 VERIFICATION SYSTEM LAYER                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ ID Verification │  │   Document   │  │  Fraud         │  │
│  │  Service        │  │ Verification │  │  Detection     │  │
│  │                 │  │  Service     │  │  Service       │  │
│  └────────┬────────┘  └──────┬───────┘  └────────┬───────┘  │
│           │                   │                    │           │
│           └───────────────────┴────────────────────┘           │
│                        │                                       │
│          ┌─────────────▼──────────────┐                       │
│          │ Verification Workflow      │                       │
│          │ Service                    │                       │
│          └──────┬──────────────┬──────┘                       │
│                 │              │                               │
│         ┌───────▼──┐     ┌─────▼─────┐                       │
│         │ useVerif  │     │ useSmartVer│                      │
│         │ication    │     │ificationUI │                      │
│         └───────┬──┘     └─────┬─────┘                       │
│                 │              │                               │
│     ┌───────────▼──────────────▼──────────────┐              │
│     │  UI COMPONENTS                          │              │
│     │  - VerificationDashboard               │              │
│     │  - DocumentUploadPanel                 │              │
│     │  - FraudAnalysisView                   │              │
│     │  - VerificationStatus                  │              │
│     └─────────────────────────────────────────┘              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Core Services

### 1. Verification Service (`verificationService.ts`)

**Location:** `src/services/verificationService.ts`

#### Modules

##### A. ID Verification Service
```typescript
export const idVerificationService = {
  initializeVerification(userId: string, identificationType: string)
  getVerificationRequest(requestId: string)
  updateVerificationData(requestId: string, data: any)
  getUserVerificationRequest(userId: string)
  listUserVerifications(userId: string, limit: number)
}
```

**Methods:**
- `initializeVerification()` - Start new ID verification process
- `getVerificationRequest()` - Fetch specific verification request
- `updateVerificationData()` - Update verification request data
- `getUserVerificationRequest()` - Get current verification request
- `listUserVerifications()` - List all verification history

##### B. Document Verification Service
```typescript
export const documentVerificationService = {
  uploadDocument(documentData: any)
  verifyDocument(documentId: string)
  extractDocumentData(documentId: string)
  getDocumentStatus(documentId: string)
  rejectDocument(documentId: string, reason: string)
  listDocuments(requestId: string)
}
```

**Methods:**
- `uploadDocument()` - Submit document for verification
- `verifyDocument()` - Process document verification
- `extractDocumentData()` - Extract info via OCR
- `getDocumentStatus()` - Check document status
- `rejectDocument()` - Reject with reason
- `listDocuments()` - List all documents for request

##### C. User Verification Service
```typescript
export const userVerificationService = {
  getUserVerificationStatus(userId: string)
  updateUserVerificationStatus(userId: string, status: string)
  getVerifiedBadges(userId: string)
  awardVerificationBadge(userId: string, badgeType: string)
  revokeVerificationBadge(userId: string, badgeType: string)
}
```

**Methods:**
- `getUserVerificationStatus()` - Get current stats
- `updateUserVerificationStatus()` - Update status
- `getVerifiedBadges()` - List earned badges
- `awardVerificationBadge()` - Grant badge
- `revokeVerificationBadge()` - Revoke badge

##### D. Fraud Detection Service
```typescript
export const fraudDetectionService = {
  analyzeFraudPatterns(userId: string)
  checkBlacklist(userId: string, documentNumber: string)
  getUserFraudAlerts(userId: string)
  createFraudAlert(userId: string, alertData: any)
  updateFraudRisk(userId: string, riskLevel: string)
}
```

**Methods:**
- `analyzeFraudPatterns()` - Detect suspicious patterns
- `checkBlacklist()` - Check against fraud list
- `getUserFraudAlerts()` - Get fraud alerts
- `createFraudAlert()` - Log new alert
- `updateFraudRisk()` - Update risk score

##### E. Verification Workflow Service
```typescript
export const verificationWorkflowService = {
  initiateVerification(userId: string, type: string)
  completeVerificationCheck(requestId: string)
  rejectVerification(requestId: string, reason: string)
  getWorkflowStatus(requestId: string)
  updateWorkflowStatus(requestId: string, status: string)
}
```

**Methods:**
- `initiateVerification()` - Start verification workflow
- `completeVerificationCheck()` - Submit for review
- `rejectVerification()` - Decline with reason
- `getWorkflowStatus()` - Current workflow state
- `updateWorkflowStatus()` - Update status

## Custom Hooks

### useVerification Hook

**Location:** `src/hooks/useVerification.ts`

```typescript
export interface UseVerificationReturn {
  // State
  request: VerificationRequest | null;
  documents: VerificationDocument[];
  status: UserVerificationStatus | null;
  fraudAlerts: FraudAlert[];
  fraudAnalysis: any;
  loading: boolean;
  error: Error | null;
  uploadProgress: number;

  // Methods
  initiateVerification: (verificationType: string) => Promise<void>;
  uploadDocument: (documentData: Partial<VerificationDocument>) => Promise<void>;
  getVerificationStatus: (userId: string) => Promise<void>;
  analyzeFraud: (userId: string) => Promise<void>;
  completeVerification: () => Promise<boolean>;
  rejectDocument: (documentId: string, reason: string) => Promise<void>;
  clearError: () => void;
}
```

**Usage:**
```typescript
const {
  request,
  documents,
  status,
  fraudAlerts,
  fraudAnalysis,
  loading,
  error,
  uploadProgress,
  initiateVerification,
  uploadDocument,
  getVerificationStatus,
  analyzeFraud,
  completeVerification,
  rejectDocument,
  clearError,
} = useVerification();

// Initiate verification
await initiateVerification('national_id');

// Upload document
await uploadDocument({
  request_id: request?.id,
  document_type: 'national_id',
  file_name: 'id.jpg',
  file_type: 'image/jpeg',
  file_content: base64content,
  file_size: 204800,
});

// Complete and check fraud
await analyzeFraud(userId);
const approved = await completeVerification();
```

## UI Components

### 1. VerificationDashboard

**Location:** `src/components/VerificationDashboard.tsx`

**Props:**
```typescript
interface VerificationDashboardProps {
  userId?: string;
  onVerificationComplete?: () => void;
}
```

**Features:**
- Document type selection (National ID, Passport, Driver's License)
- File upload with drag-and-drop
- Camera capture option
- Document status display
- Fraud risk scoring
- Extracted data review
- Verification guidelines

**Usage:**
```typescript
<VerificationDashboard
  userId={currentUser.id}
  onVerificationComplete={() => {
    console.log('Verification complete!');
    redirectToDashboard();
  }}
/>
```

### 2. DocumentUploadPanel

**Location:** `src/components/DocumentUploadPanel.tsx`

**Props:**
```typescript
interface DocumentUploadPanelProps {
  documentType: string;
  onDocumentCapture: (data: {
    file: File;
    preview: string;
    data: { [key: string]: any };
  }) => void;
  loading?: boolean;
  error?: string | null;
  onError?: (error: string) => void;
}
```

**Features:**
- Gallery upload
- Camera capture
- Image preview
- OCR data extraction
- Data editing
- Document validation
- Real-time processing

**Usage:**
```typescript
<DocumentUploadPanel
  documentType="national_id"
  onDocumentCapture={(data) => {
    console.log('Document captured:', data);
    uploadToServer(data);
  }}
  loading={isUploading}
  error={uploadError}
  onError={setError}
/>
```

## Type Definitions

**Location:** `src/types/verification.ts`

```typescript
// Verification Type
export enum VerificationType {
  NATIONAL_ID = 'national_id',
  PASSPORT = 'passport',
  DRIVER_LICENSE = 'driver_license',
}

// Verification Request
export interface VerificationRequest {
  id: string;
  user_id: string;
  verification_type: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  completed_at?: string;
  rejection_reason?: string;
}

// Verification Document
export interface VerificationDocument {
  id: string;
  request_id: string;
  document_type: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  extracted_data: {
    [key: string]: any;
  };
  status: 'pending' | 'approved' | 'rejected';
  uploaded_at: string;
  verified_at?: string;
  rejection_reason?: string;
}

// User Verification Status
export interface UserVerificationStatus {
  user_id: string;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  last_verified_at?: string;
  verification_badge: boolean;
  fraud_risk_level: 'low' | 'medium' | 'high';
  verification_expiry?: string;
}

// Fraud Alert
export interface FraudAlert {
  id: string;
  user_id: string;
  alert_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  created_at: string;
  resolved: boolean;
}
```

## Database Schema

```sql
-- Verification Requests
CREATE TABLE verification_requests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Verification Documents
CREATE TABLE verification_documents (
  id UUID PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  extracted_data JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  rejection_reason TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP
);

-- User Verification Status
CREATE TABLE user_verification_status (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  verification_status VARCHAR(50) DEFAULT 'unverified',
  verification_badge BOOLEAN DEFAULT FALSE,
  fraud_risk_level VARCHAR(50) DEFAULT 'low',
  last_verified_at TIMESTAMP,
  verification_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fraud Alerts
CREATE TABLE fraud_alerts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type VARCHAR(100) NOT NULL,
  description TEXT,
  severity VARCHAR(50),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- Verification Badges
CREATE TABLE verification_badges (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type VARCHAR(100) NOT NULL,
  awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP
);
```

## API Endpoints

### Verification API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/verification/initiate` | POST | Start verification |
| `/api/verification/requests/:id` | GET | Get verification request |
| `/api/verification/requests/:id` | PUT | Update verification |
| `/api/verification/users/:userId/requests` | GET | List user requests |
| `/api/verification/documents/upload` | POST | Upload document |
| `/api/verification/documents/:id` | GET | Get document |
| `/api/verification/documents/:id/verify` | POST | Verify document |
| `/api/verification/documents/:id/reject` | POST | Reject document |
| `/api/verification/status/:userId` | GET | Get verification status |
| `/api/verification/fraud/analyze` | POST | Analyze fraud |
| `/api/verification/fraud/alerts/:userId` | GET | Get fraud alerts |
| `/api/verification/badges/:userId` | GET | Get badges |
| `/api/verification/complete` | POST | Complete verification |

### Request/Response Examples

**Initiate Verification**
```bash
POST /api/verification/initiate
Content-Type: application/json

{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "verificationType": "national_id"
}

Response:
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "verification_type": "national_id",
  "status": "pending",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Upload Document**
```bash
POST /api/verification/documents/upload
Content-Type: multipart/form-data

Form Data:
- request_id: "550e8400-e29b-41d4-a716-446655440001"
- document_type: "national_id"
- file: [binary file data]

Response:
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "request_id": "550e8400-e29b-41d4-a716-446655440001",
  "document_type": "national_id",
  "status": "pending",
  "file_url": "https://cdn.propertyhub.com/docs/550e8400-e29b-41d4-a716-446655440002.jpg",
  "extracted_data": {
    "number": "GH-123456789-0",
    "name": "John Doe",
    "dateOfBirth": "1990-05-15",
    "expiryDate": "2025-01-10"
  },
  "uploaded_at": "2024-01-15T10:35:00Z"
}
```

**Verify Document**
```bash
POST /api/verification/documents/:id/verify
Content-Type: application/json

{
  "approved": true,
  "notes": "Document verified successfully"
}

Response:
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "status": "approved",
  "verified_at": "2024-01-15T10:40:00Z"
}
```

**Complete Verification**
```bash
POST /api/verification/complete
Content-Type: application/json

{
  "requestId": "550e8400-e29b-41d4-a716-446655440001"
}

Response:
{
  "approved": true,
  "message": "Verification approved",
  "badgeAwarded": true,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "verificationStatus": "verified"
}
```

## Implementation Guide

### Step 1: Frontend Setup

```typescript
// Import components and hooks
import { VerificationDashboard } from '@/components/VerificationDashboard';
import { DocumentUploadPanel } from '@/components/DocumentUploadPanel';
import { useVerification } from '@/hooks/useVerification';

// Use in component
export const VerificationPage = () => {
  return (
    <VerificationDashboard
      userId={userId}
      onVerificationComplete={() => {
        console.log('Verified!');
      }}
    />
  );
};
```

### Step 2: Backend Implementation

1. Create tables using provided SQL schema
2. Implement API endpoints
3. Set up OCR service (Tesseract.js or cloud service)
4. Configure fraud detection rules
5. Set up file storage (AWS S3, Supabase Storage)

### Step 3: Environment Variables

```bash
VITE_VERIFICATION_API_BASE=https://api.propertyhub.com/api/verification
VITE_OCR_SERVICE=tesseract
VITE_FRAUD_API_KEY=your-fraud-detection-api-key
VITE_MAX_FILE_SIZE=5242880  # 5MB in bytes
VITE_ALLOWED_DOCUMENT_TYPES=national_id,passport,driver_license
```

## Security Considerations

1. **File Upload Security**
   - Validate file types and sizes
   - Scan uploads for malware
   - Store securely with encryption
   - Use signed URLs for access

2. **Data Privacy**
   - Encrypt sensitive extracted data
   - Implement access controls
   - Comply with data protection regulations
   - Implement data retention policies

3. **Fraud Detection**
   - Monitor for duplicate submissions
   - Cross-reference with blacklists
   - Analyze behavioral patterns
   - Flag high-risk activities

4. **API Security**
   - Require authentication
   - Rate limit endpoints
   - Validate all inputs
   - Use HTTPS only

## Error Handling

```typescript
try {
  await initiateVerification('national_id');
} catch (error) {
  if (error.message.includes('duplicate')) {
    // Handle duplicate submission
  } else if (error.message.includes('blacklist')) {
    // Handle blacklist match
  } else if (error.message.includes('fraud')) {
    // Handle fraud detection
  }
}
```

## Testing Checklist

- [ ] Upload documents successfully
- [ ] Verify document extraction works
- [ ] Check fraud detection logic
- [ ] Test file size validation
- [ ] Verify document rejection
- [ ] Test compliance with guidelines
- [ ] Check user status updates
- [ ] Verify badge awarding

## Deployment Checklist

- [ ] Configure API endpoints
- [ ] Set environment variables
- [ ] Create database tables
- [ ] Deploy backend services
- [ ] Set up file storage
- [ ] Configure fraud detection
- [ ] Enable monitoring and logging
- [ ] Document API for team
- [ ] Set up support processes

## Next Steps

1. **Complete Backend Implementation** - Implement all 13 API endpoints
2. **Add Advanced Features** - Video verification, liveness detection
3. **Integration Testing** - Test with real fraud detection service
4. **Performance Optimization** - Optimize OCR and fraud detection
5. **Compliance** - Ensure GDPR/local data protection compliance

---

**Last Updated:** 2024-01-15  
**Status:** Foundation Complete, Backend Pending  
**Related Features:** Payment System, User Profile, Landlord Dashboard
