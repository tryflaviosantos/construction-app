# Design Guidelines: Construction Management System

## Design Approach

**Reference-Based Hybrid**: Drawing inspiration from Linear (clean dashboard aesthetics), Notion (information hierarchy), and Stripe (professional restraint) while maintaining construction industry authenticity. The system balances professionalism for client-facing portals with practical utility for field workers.

## Typography System

**Font Stack**: 
- Primary: Inter (via Google Fonts CDN) - for UI, dashboards, data-heavy screens
- Secondary: Outfit (via Google Fonts CDN) - for marketing site, headings, brand elements

**Hierarchy**:
- H1: text-5xl font-bold (marketing heroes), text-4xl font-bold (app headers)
- H2: text-3xl font-semibold (section headers)
- H3: text-2xl font-semibold (card headers, panel titles)
- H4: text-xl font-medium (subsections)
- Body Large: text-lg (landing page copy, important descriptions)
- Body: text-base (standard UI text, forms, tables)
- Small: text-sm (metadata, timestamps, helper text)
- Tiny: text-xs (labels, badges, fine print)

## Layout & Spacing System

**Tailwind Primitives**: Use spacing units of 2, 4, 8, 12, 16, 20, 24 for consistency
- Micro spacing (inline elements): space-x-2, gap-2
- Component padding: p-4, p-6, p-8
- Section spacing: py-12 (mobile), py-20 (tablet), py-32 (desktop)
- Container widths: max-w-7xl (dashboards), max-w-6xl (content), max-w-prose (text)

**Grid Systems**:
- Dashboard layouts: 12-column grid with lg:grid-cols-12
- Card grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Data tables: Full-width with horizontal scroll on mobile

## Component Library

### Corporate Marketing Site

**Hero Section**: 
- Full viewport height (min-h-screen) with large construction site hero image
- Centered content overlay with backdrop-blur on CTA container
- H1 + subtitle + dual CTA (primary + secondary)
- Trust indicators below CTAs: "Trusted by 500+ construction companies" with small company logos

**Features Grid**:
- 3-column layout (grid-cols-1 md:grid-cols-3)
- Each feature card: icon (top), title (H3), description, "Learn more" link
- Alternating visual sections with screenshot mockups and feature lists

**Pricing Plans** (3 tiers):
- Cards with: plan name, price (large text-4xl), billing period, feature list with checkmarks, CTA button
- Middle tier highlighted with border emphasis and "Most Popular" badge
- Annual/monthly toggle above cards

**Footer**: 
- 4-column grid: Product links, Company info, Resources, Contact
- Newsletter signup form (email + submit)
- Social media icons, language selector dropdown
- Company address and phone at bottom

### Worker Mobile App (PWA)

**Time Tracking Interface**:
- Large status card at top showing current state: "Not Clocked In" / "Working" with duration timer
- Prominent CTA button (full-width on mobile): "Clock In" / "Clock Out"
- Recent activity timeline below with timestamps, locations, and thumbnail photos
- Bottom navigation: Home, Hours, Tools, Profile

**Clock In/Out Flow**:
- Full-screen camera view for selfie capture
- GPS indicator showing location accuracy
- Site selection dropdown (if multiple sites)
- Confirmation screen showing: photo preview, location on map snippet, timestamp, site name

**Hours Summary**:
- Calendar view with color-coded days
- Weekly total card with breakdown: regular hours, overtime, breaks
- Expandable daily entries showing detailed check-in/out with photos and GPS

### Client Portal

**Dashboard Overview**:
- KPI cards in grid: Total Hours This Month, Active Workers, Pending Validations, Total Cost
- Site selector dropdown in header
- Recent activity feed with validation status indicators

**Hour Validation Interface**:
- Table layout with columns: Date, Worker, Check-In, Check-Out, Total Hours, Evidence, Actions
- Expandable rows showing: GPS map, check-in/out photos, location accuracy
- Bulk action controls: "Approve Selected" / "Contest Selected"
- Filter/search bar above table

**Contestation Modal**:
- Side panel or centered modal
- Shows full evidence: photos, map, timestamps
- Textarea for contestation reason
- Severity selector: Minor discrepancy / Significant issue
- Submit/Cancel buttons

### Manager Dashboard

**Main Dashboard**:
- Sidebar navigation (collapsible on mobile): Dashboard, Workers, Sites, Tools, Reports, Settings
- Top bar: Company logo/name, site switcher, notifications bell, profile dropdown
- Widget-based layout: Attendance Today, Pending Approvals, Tool Status, Recent Alerts

**Worker Management**:
- Data table with search/filter controls
- Columns: Photo, Name, Role, Current Site, Status, Hours This Week, Actions
- Quick actions dropdown per row: View Details, Edit, Manage Access
- "Add Worker" CTA button (top right)

**Approval Queue**:
- Card-based layout for pending items
- Each card shows: worker photo, timestamp, location snippet, reason (if late/early)
- Evidence thumbnails (click to expand)
- Approve/Reject/Request Info buttons
- Filter tabs: All, Late Arrivals, Early Departures, Contestations, Anomalies

### Tool Management

**Tool Inventory**:
- Grid of tool cards with photos, QR code thumbnail, status badge, assigned worker (if checked out)
- Filtering: All, Available, In Use, Maintenance, Lost/Stolen
- "Add Tool" and "Generate QR Codes" CTAs

**Check-Out Interface** (Mobile):
- QR code scanner (full camera view)
- After scan: Tool details card, worker confirmation, site assignment, submit

**Tool History Modal**:
- Timeline view of all transactions: check-outs, returns, incidents
- Each entry: timestamp, worker, site, photos (if incident), status change

## Images & Visual Assets

**Hero Image**: Large, high-quality construction site photo showing active work, modern equipment, workers collaborating. Full viewport width, positioned with object-cover.

**Marketing Sections**: 
- Feature sections alternate between left/right image placements
- Use authentic construction imagery: workers using tablets/phones on site, safety equipment, machinery, building progress
- Screenshots of app interfaces in device mockups (phones, tablets)

**Dashboard Backgrounds**: 
- Subtle texture overlays (concrete, blueprint patterns) at very low opacity for branded sections
- Avoid busy backgrounds in data-heavy areas

**Icons**: Heroicons via CDN for UI elements, construction-specific icons for features (hard hat, tools, clock, location pin, camera)

**Worker/Company Photos**: Circular avatars (rounded-full), 40x40px (small), 64x64px (medium), 128x128px (large)

## Multi-Language & Localization

**Language Selector**: 
- Dropdown in top navigation (both marketing and app)
- Flag icons + language codes: EN, PT, NL, FR
- Persists selection in localStorage

**Text Layout Considerations**:
- Allow flexible widths for labels (some languages 30% longer)
- Avoid fixed-width containers for text content
- Use min-width instead of width for buttons with text

**Date/Time Formatting**: 
- Display using locale-appropriate formats
- Show timezone clearly for time tracking features

## Mobile-First PWA Considerations

**Touch Targets**: Minimum 44x44px for all interactive elements, 56x56px for primary CTAs

**Bottom Navigation**: Fixed position, 4-5 primary actions, icons + labels

**Forms**: 
- Full-width inputs on mobile (w-full)
- Adequate spacing between fields (space-y-4)
- Large submit buttons (h-12 minimum)
- Inline validation with clear error messages below fields

**Camera Integration**: Full-screen camera view with minimal UI overlay for selfie capture

**Offline Indicator**: Persistent banner at top when offline, showing sync status

## Responsive Breakpoints

- Mobile: base (< 768px) - single column, stacked navigation
- Tablet: md (768px+) - 2 columns where appropriate, collapsible sidebar
- Desktop: lg (1024px+) - full multi-column layouts, persistent sidebar
- Wide: xl (1280px+) - max content width with centered containers