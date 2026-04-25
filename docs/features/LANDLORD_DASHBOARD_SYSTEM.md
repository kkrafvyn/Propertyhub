# Landlord Dashboard & Analytics System Documentation

## Overview

The PropertyHub Landlord Dashboard provides comprehensive analytics and insights for property owners. It enables landlords to track revenue, monitor occupancy rates, assess tenant quality, and make data-driven decisions about their property portfolio.

## System Architecture

```
┌──────────────────────────────────────────────────────────┐
│           LANDLORD ANALYTICS SYSTEM LAYER                │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Revenue     │  │  Occupancy   │  │   Tenant     │   │
│  │  Analytics   │  │  Analytics   │  │   Scoring    │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                  │                  │            │
│         └──────────────────┼──────────────────┘            │
│                            │                               │
│         ┌──────────────────▼──────────────────┐           │
│         │ landlordAnalyticsService            │           │
│         │ (5 modules, 20+ methods)            │           │
│         └──────────┬───────────────────┬──────┘           │
│                    │                   │                   │
│           ┌────────▼──┐        ┌──────▼────────┐         │
│           │useLandlord │       │LandlordDash    │         │
│           │Dashboard   │       │board Component │         │
│           │Hook        │       │                │         │
│           └────────┬──┘        └──────┬─────────┘         │
│                    │                  │                    │
│    ┌───────────────▼──────────────────▼────────────┐     │
│    │  UI COMPONENTS                                │     │
│    │  - LandlordDashboard                         │     │
│    │  - PropertyAnalytics (upcoming)              │     │
│    │  - TenantScorer (upcoming)                   │     │
│    │  - RevenueReports (upcoming)                 │     │
│    └────────────────────────────────────────────────┘     │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

## Core Service

### Landlord Analytics Service

**Location:** `src/services/landlordAnalyticsService.ts`

#### Modules

##### A. Revenue Analysis Module
```typescript
// Get comprehensive revenue metrics
async getRevenueMetrics(propertyId: string): Promise<RevenueMetrics>
```

**Returns:**
- `totalRevenue` - Total revenue across all time
- `monthlyRevenue` - Current month's revenue
- `averageRent` - Average rent per unit
- `expectedRevenue` - Expected monthly revenue
- `actualRevenue` - Actual monthly revenue collected
- `variance` - Difference between expected and actual
- `collectionRate` - Percentage of expected revenue collected

##### B. Occupancy Analysis Module
```typescript
// Get occupancy metrics for property
async getOccupancyMetrics(propertyId: string): Promise<OccupancyMetrics>
```

**Returns:**
- `totalUnits` - Total number of units
- `occupiedUnits` - Currently occupied units
- `vacantUnits` - Currently vacant units
- `occupancyRate` - Percentage occupancy
- `averageOccupancyDuration` - Average days occupied
- `vacancyDuration` - Average days vacant
- `turnoverRate` - Rate of tenant turnover

##### C. Tenant Scoring Module
```typescript
// Score tenants based on payment history and behavior
async getTenantScores(propertyId: string, limit: number): Promise<TenantScore[]>
```

**Scoring Components:**
- **Payment Score (0-100):** Based on on-time payment history
- **Behavior Score (0-100):** Based on complaints and maintenance
- **Risk Score (0-100):** Composite risk assessment
- **Overall Score (0-100):** Combined weighted score
- **Risk Level:** Low, Medium, or High

**Recommendations:** Actionable insights based on scores

##### D. Payment Analytics Module
```typescript
// Get comprehensive payment analytics
async getPaymentAnalytics(userId: string, propertyId?: string): Promise<PaymentAnalytics>
```

**Returns:**
- `totalPayments` - Total payment records
- `onTimePayments` - Payments made on or before due date
- `latePayments` - Payments made after due date
- `missedPayments` - Failed or pending payments
- `collectionRate` - Percentage of collected payments
- `averageLateDays` - Average delay in days
- `monthlyTrend` - Month-by-month payment data

##### E. Main Analytics Module
```typescript
// Get complete landlord dashboard analytics
async getLandlordAnalytics(userId: string): Promise<LandlordAnalytics>
```

**Returns:**
- Portfolio-level metrics
- Per-property performance
- Risk alerts
- Top-performing properties
- Tenant quality insights

## Custom Hooks

### useLandlordDashboard Hook

**Location:** `src/hooks/useLandlordDashboard.ts`

```typescript
export interface UseLandlordDashboardReturn {
  // State
  analytics: LandlordAnalytics | null;
  paymentAnalytics: PaymentAnalytics | null;
  selectedProperty: PropertyMetrics | null;
  selectedTenants: TenantScore[];
  timeframe: 'monthly' | 'quarterly' | 'yearly';
  loading: boolean;
  error: Error | null;
  lastUpdated: string | null;

  // Methods
  fetchLandlordAnalytics: (userId: string) => Promise<void>;
  fetchPropertyMetrics: (propertyId: string) => Promise<void>;
  fetchPaymentAnalytics: (userId: string, propertyId?: string) => Promise<void>;
  fetchTenantScores: (propertyId: string) => Promise<void>;
  selectProperty: (propertyId: string) => void;
  setTimeframe: (timeframe: 'monthly' | 'quarterly' | 'yearly') => void;
  generateReport: (userId: string) => Promise<any>;
  clearError: () => void;
  refreshData: (userId: string) => Promise<void>;
}
```

**Usage:**
```typescript
const {
  analytics,
  paymentAnalytics,
  selectedProperty,
  loading,
  error,
  fetchLandlordAnalytics,
  fetchPropertyMetrics,
  selectProperty,
  generateReport,
  refreshData,
} = useLandlordDashboard();

// Fetch initial analytics
useEffect(() => {
  if (userId) {
    refreshData(userId);
  }
}, [userId]);

// Select specific property
const handlePropertyClick = async (propertyId: string) => {
  selectProperty(propertyId);
  await fetchPropertyMetrics(propertyId);
};

// Generate downloadable report
const handleDownloadReport = async () => {
  const report = await generateReport(userId);
  // Download JSON report
};
```

## UI Components

### 1. LandlordDashboard

**Location:** `src/components/LandlordDashboard.tsx`

**Props:**
```typescript
interface LandlordDashboardProps {
  userId: string;
  onPropertyClick?: (propertyId: string) => void;
}
```

**Features:**
- **Key Metrics Cards**
  - Total Revenue
  - Net Income
  - Occupancy Rate
  - Total Tenants

- **Timeframe Selector**
  - Monthly
  - Quarterly
  - Yearly

- **Risk Alerts**
  - Low occupancy warnings
  - Collection rate issues
  - Negative ROI alerts
  - High-risk tenant alerts

- **Properties List**
  - Revenue per property
  - Occupancy percentage
  - Collection rate
  - ROI calculation

- **Property Details Sidebar**
  - Detailed metrics
  - Top tenants
  - Net income
  - Expense breakdown

- **Report Generation**
  - Download as JSON
  - Timestamped
  - Comprehensive data export

**Usage:**
```typescript
import { LandlordDashboard } from '@/components/LandlordDashboard';

export const AnalyticsPage = () => {
  return (
    <LandlordDashboard
      userId={currentUser.id}
      onPropertyClick={(propertyId) => {
        console.log('Property selected:', propertyId);
      }}
    />
  );
};
```

## Type Definitions

**Location:** `src/types`

```typescript
// Revenue Metrics
interface RevenueMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  averageRent: number;
  expectedRevenue: number;
  actualRevenue: number;
  variance: number;
  collectionRate: number;
}

// Occupancy Metrics
interface OccupancyMetrics {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  averageOccupancyDuration: number;
  vacancyDuration: number;
  turnoverRate: number;
}

// Tenant Score
interface TenantScore {
  tenantId: string;
  tenantName: string;
  property: string;
  paymentScore: number;
  behaviorScore: number;
  riskScore: number;
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

// Property Metrics
interface PropertyMetrics {
  propertyId: string;
  propertyName: string;
  revenue: RevenueMetrics;
  occupancy: OccupancyMetrics;
  topTenants: TenantScore[];
  maintenanceCosts: number;
  expenses: number;
  netIncome: number;
  roi: number;
  lastUpdated: string;
}

// Landlord Analytics
interface LandlordAnalytics {
  userId: string;
  totalProperties: number;
  totalUnits: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalExpenses: number;
  netIncome: number;
  portfolioOccupancyRate: number;
  averagePropertyOccupancy: number;
  topPerformingProperty: string;
  riskAlerts: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    propertyId?: string;
  }>;
  properties: PropertyMetrics[];
}

// Payment Analytics
interface PaymentAnalytics {
  totalPayments: number;
  onTimePayments: number;
  latePayments: number;
  missedPayments: number;
  collectionRate: number;
  averageLateDays: number;
  monthlyTrend: Array<{
    month: string;
    received: number;
    expected: number;
  }>;
}
```

## Database Schema

```sql
-- Analytics Cache (for performance)
CREATE TABLE landlord_analytics_cache (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analytics JSONB NOT NULL,
  timeframe VARCHAR(50),
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- Property Metrics
CREATE TABLE property_metrics (
  id UUID PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  revenue_total DECIMAL(12, 2),
  revenue_monthly DECIMAL(12, 2),
  collection_rate DECIMAL(5, 2),
  occupancy_rate DECIMAL(5, 2),
  occupancy_count INTEGER,
  total_units INTEGER,
  roi DECIMAL(8, 2),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenant Scores
CREATE TABLE tenant_scores (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  payment_score DECIMAL(5, 2),
  behavior_score DECIMAL(5, 2),
  risk_score DECIMAL(5, 2),
  overall_score DECIMAL(5, 2),
  risk_level VARCHAR(50),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Property Expenses
CREATE TABLE property_expenses (
  id UUID PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  category VARCHAR(100),
  amount DECIMAL(12, 2),
  date DATE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Complaints Log
CREATE TABLE complaints (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title VARCHAR(255),
  description TEXT,
  severity VARCHAR(50),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);
```

## API Endpoints

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/api/landlord/analytics/:userId` | GET | Get complete analytics | Pending |
| `/api/landlord/properties/:userId` | GET | List properties with metrics | Pending |
| `/api/landlord/properties/:propertyId/metrics` | GET | Get property metrics | Pending |
| `/api/landlord/revenue/:propertyId` | GET | Get revenue breakdown | Pending |
| `/api/landlord/tenants/:propertyId/scores` | GET | Get tenant scores | Pending |
| `/api/landlord/payment-analytics/:userId` | GET | Get payment analytics | Pending |
| `/api/landlord/reports/generate` | POST | Generate report | Pending |
| `/api/landlord/reports/:userId/:reportId` | GET | Download report | Pending |

### Example Requests

**Get Landlord Analytics**
```bash
GET /api/landlord/analytics/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer token

Response:
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "totalProperties": 3,
  "totalUnits": 12,
  "totalRevenue": 150000,
  "monthlyRevenue": 12500,
  "totalExpenses": 2000,
  "netIncome": 10500,
  "portfolioOccupancyRate": 92,
  "averagePropertyOccupancy": 92,
  "topPerformingProperty": "property-1",
  "riskAlerts": [],
  "properties": [...]
}
```

**Get Property Metrics**
```bash
GET /api/landlord/properties/prop-123/metrics
Authorization: Bearer token

Response:
{
  "propertyId": "prop-123",
  "propertyName": "Downtown Apartments",
  "revenue": {
    "totalRevenue": 150000,
    "monthlyRevenue": 12500,
    "collectionRate": 95,
    ...
  },
  "occupancy": {
    "totalUnits": 4,
    "occupiedUnits": 4,
    "occupancyRate": 100,
    ...
  },
  "topTenants": [...],
  "netIncome": 10500,
  "roi": 21.5
}
```

## Key Features

### 1. Revenue Tracking
- Total revenue across all properties
- Monthly revenue trends
- Collection rate monitoring
- Expected vs. actual revenue variance
- Revenue per property
- Average rent analysis

### 2. Occupancy Analytics
- Portfolio-wide occupancy rate
- Per-property occupancy
- Unit management
- Vacancy tracking
- Occupancy duration analysis
- Turnover rate calculation

### 3. Tenant Scoring
- Payment history analysis
- Behavior/complaint tracking
- Risk assessment
- Composite scoring (0-100)
- Risk level classification
- Actionable recommendations

### 4. Payment Analytics
- Payment timing analysis
- On-time vs. late payments
- Collection rate
- Monthly payment trends
- Average late payment days
- Missing/failed payments

### 5. Risk Alerts
- Low occupancy warnings
- Collection rate issues
- Negative ROI properties
- High-risk tenants
- Expense tracking warnings
- Vendor problems

### 6. Report Generation
- Comprehensive data export
- JSON download
- Timestamped reports
- Portfolio overview
- Property-level details
- Historical comparisons

## Security Implementation

### Data Access Control
- Landlords can only see their own properties
- Tenants cannot access landlord analytics
- Role-based access control enforced
- API authentication required

### Data Privacy
- Personal information redaction
- Compliance with data protection laws
- Secure data transmission
- Audit logging of analytics access

## Performance Optimization

### Caching Strategy
```typescript
// Cache analytics for 1 hour
const ANALYTICS_CACHE_TTL = 3600 * 1000;

// Cache per property metrics
const PROPERTY_METRICS_CACHE_TTL = 1800 * 1000;

// Cache tenant scores
const TENANT_SCORES_CACHE_TTL = 3600 * 1000;
```

### Database Indexing
- Index on `property_id` in metrics tables
- Index on `user_id` for access control
- Index on `created_at` for time-based queries
- Composite indexes for common queries

## Implementation Roadmap

### Phase 1: Foundation (Complete)
- ✅ Service layer implementation
- ✅ Hook implementation
- ✅ UI component implementation

### Phase 2: Backend (Pending)
- API endpoints implementation
- Database setup and migrations
- Caching layer
- Real-time updates

### Phase 3: Advanced Features (Future)
- Chart visualizations (ApexCharts)
- Export to PDF
- Email report scheduling
- Comparative analysis
- Predictive analytics
- Machine learning scoring
- Custom dashboards

## Testing Strategy

### Unit Tests
- Service method tests
- Hook state management
- Data calculation accuracy
- Scoring algorithm validation

### Integration Tests
- API endpoint tests
- Database query tests
- Component integration
- End-to-end workflows

### Performance Tests
- Analytics calculation time
- Large dataset handling
- Report generation performance
- Cache effectiveness

## Deployment Checklist

- [ ] Create required database tables
- [ ] Implement all API endpoints
- [ ] Set up caching infrastructure
- [ ] Configure authentication/authorization
- [ ] Test with sample data
- [ ] Performance testing
- [ ] Security audit
- [ ] Documentation review
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production

---

**Status:** Frontend Complete, Backend Pending  
**Created:** 2024-01-15  
**Frontend Implementation:** ✅ Complete  
**Backend Implementation:** ⏳ Pending  
**Feature #:** 4 of 5
