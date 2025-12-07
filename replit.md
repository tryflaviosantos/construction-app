# Construction Management System

## Overview

This is a construction workforce management system designed to solve critical problems in the construction industry: time tracking fraud, disputes over worked hours, tool accountability, and payroll complexity. The system provides GPS-verified time tracking with photo evidence, tool check-in/out management, leave requests, client transparency portals, and automated payroll processing.

The application serves multiple user roles: construction workers who clock in/out at job sites, managers who oversee teams and approve requests, clients who verify billed hours, and administrators who configure company-wide settings.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18+ with TypeScript, using Wouter for client-side routing instead of React Router.

**UI Component Library**: Shadcn/ui with Radix UI primitives. The design system uses the "new-york" style variant with a neutral base color and CSS variables for theming. All components follow a consistent spacing scale (2, 4, 8, 12, 16, 20, 24) and use Tailwind CSS for styling.

**State Management**: TanStack Query (React Query) for server state management with a custom query client configuration. No global state management library is used - server state is cached and synchronized via React Query, while local UI state is managed with React hooks.

**Internationalization**: i18next for multi-language support (English, Portuguese, Dutch, French). Language preference is stored in localStorage and applied globally.

**Theming**: Custom theme provider supporting light/dark/system modes with CSS custom properties. Theme preference persists in localStorage.

**Build Tool**: Vite for development and production builds, with custom alias configuration for imports (@/, @shared/, @assets/).

### Backend Architecture

**Runtime**: Node.js with Express server framework.

**Language**: TypeScript throughout, compiled to CommonJS for production (dist/index.cjs).

**API Pattern**: RESTful HTTP endpoints under `/api/*` namespace. All routes defined in `server/routes.ts` and registered via `registerRoutes()` function.

**Authentication**: Replit Auth (OpenID Connect) integrated via Passport.js strategy. Session-based authentication with PostgreSQL session store. Users are identified by OIDC subject claim and stored in the users table.

**Session Management**: Express-session with connect-pg-simple for PostgreSQL-backed sessions. Sessions expire after 7 days with httpOnly, secure cookies.

**Request Handling**: JSON body parsing with raw body capture for webhook validation. Request/response logging middleware with duration tracking.

### Database Architecture

**ORM**: Drizzle ORM with PostgreSQL dialect.

**Schema Design**: Multi-tenant architecture with the following core entities:
- **tenants**: Company/organization records with subscription and Stripe integration
- **users**: All user types (admin, manager, employee, client) with role-based access
- **sites**: Construction job sites linked to clients
- **siteAssignments**: Many-to-many relationship between users and sites
- **timeRecords**: Clock in/out events with GPS coordinates, photos, and fraud detection metadata
- **tools**: Tool inventory with QR codes and status tracking
- **toolTransactions**: Check-in/check-out history for tools
- **leaveRequests**: Vacation/sick leave with approval workflow
- **payrollRecords**: Calculated payroll with regular/overtime hours
- **contestations**: Client disputes of time records
- **sessions**: PostgreSQL-backed session storage

**Migration Strategy**: Drizzle Kit for schema migrations. Schema defined in `shared/schema.ts` and migrations output to `./migrations/`.

**Data Access Layer**: Storage abstraction in `server/storage.ts` implementing `IStorage` interface. All database operations go through this layer for testability and consistency.

### File Storage Architecture

**Provider**: Google Cloud Storage via Replit's object storage sidecar (localhost:1106).

**Access Control**: Custom ACL system (`server/objectAcl.ts`) supporting:
- Public vs private visibility
- Owner-based permissions
- Group-based access rules (READ/WRITE)
- Per-object policy metadata

**Service Layer**: `ObjectStorageService` class handles file operations with permission checking. Public objects searchable via configurable path prefixes.

**Use Cases**: Profile images, time-tracking selfies, tool photos, payroll exports.

### Anti-Fraud Mechanisms

**GPS Verification**: Time records capture latitude/longitude and validate against site geofence radius (configurable per-tenant).

**Photo Evidence**: Optional selfie capture on clock-in/out to prevent buddy punching.

**PIN Codes**: Optional secondary authentication factor for time tracking actions.

**Offline Detection**: Client-side online/offline status tracking to flag potentially fraudulent offline submissions.

**Metadata Capture**: Device information, IP address, and user agent stored with time records.

### Role-Based Access Control

**Roles**: admin, manager, employee, client

**Permissions**:
- **Employees**: Clock in/out, request leave, check tools in/out, view own records
- **Managers**: All employee permissions plus approve/reject requests, manage sites, view team data
- **Admins**: All manager permissions plus tenant configuration, user management, billing
- **Clients**: Read-only access to their sites' time records and payroll, ability to contest hours

**Implementation**: Role checking via `useAuth` hook on frontend and `isAuthenticated` middleware + role checks on backend routes.

## External Dependencies

### Third-Party Services

**Replit Auth**: OIDC-based authentication provider. Handles user login flow, token management, and session refresh. Configuration via environment variables (ISSUER_URL, REPL_ID, SESSION_SECRET).

**Google Cloud Storage**: Object storage for uploaded files (photos, documents). Accessed via Replit sidecar with external account credentials.

**Stripe**: Payment processing for subscription billing (referenced in tenant schema but implementation not visible in provided files). Tenant records store stripeCustomerId and stripeSubscriptionId.

**PostgreSQL**: Primary database accessed via DATABASE_URL environment variable. Required for application startup.

### Key NPM Packages

**UI Components**: @radix-ui/* primitives (20+ component packages), lucide-react for icons

**Forms**: react-hook-form with @hookform/resolvers for validation

**File Uploads**: @uppy/core, @uppy/dashboard, @uppy/aws-s3, @uppy/react for file upload UI and S3 integration

**Date Handling**: date-fns for date manipulation and formatting

**Validation**: zod for schema validation, drizzle-zod for database schema validation

**Authentication**: passport, passport-local, express-session, connect-pg-simple

**Utilities**: nanoid for ID generation, memoizee for function memoization

### Environment Variables

**Required**:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Express session encryption key
- `REPL_ID`: Replit deployment identifier for OIDC

**Optional**:
- `ISSUER_URL`: OIDC issuer URL (defaults to https://replit.com/oidc)
- `PUBLIC_OBJECT_SEARCH_PATHS`: Comma-separated public object prefixes
- `NODE_ENV`: development/production mode flag