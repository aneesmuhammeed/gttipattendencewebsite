# College Attendance Management System — Complete Workflow

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Frontend (React 18 + Vite 5)                          │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  react-router-dom (SPA routes + ProtectedRoute role guards)          │ │
│  │  @tanstack/react-query (server state, caching, mutations, refetch)    │ │
│  │  react-hook-form + zod (form validation)                              │ │
│  │  react-hot-toast (toast notifications)                                │ │
│  │  lucide-react (icons), recharts (charts), framer-motion (animations)  │ │
│  ├──────────────────────────────────────────────────────────────────────┤ │
│  │  AuthContext          NotificationContext                              │ │
│  │  (Supabase Auth)      (role-based Realtime subscriptions)             │ │
│  ├──────────────────────────────────────────────────────────────────────┤ │
│  │  @supabase/supabase-js — Client                                       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                           │                                                │
│                           ▼                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  7 Hooks: useSessions, useAttendance, useReports, useAnalytics,       │ │
│  │           useAuditLogs, useCorrectionRequests, useBrowserNotifications│ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │
┌──────────────────────────┴───────────────────────────────────────────────┐
│              Supabase Backend (Project: wdhjtfmwjwmaibpayuea)              │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  Edge Function: validate-attendance (Deno)                            │ │
│  │  Validates: session active, student role, geofence (Haversine),       │ │
│  │  end_time expiry (calls expire_session_and_mark_absent RPC),          │ │
│  │  duplicate check (unique_student_per_day index)                       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL 15 — 7 tables, 12+ triggers, 4 SECURITY DEFINER RPCs     │ │
│  │  profiles | college_settings | attendance_sessions |                  │ │
│  │  attendance_records | attendance_audit_logs | attendance_summary |    │ │
│  │  attendance_correction_requests                                       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

## 2. Prerequisites & Setup

### 2.1 Environment Variables
Create `.env` in project root:
```
VITE_SUPABASE_URL=https://wdhjtfmwjwmaibpayuea.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key-from-supabase-dashboard>
```

### 2.2 Supabase Project
- **Project URL**: `https://wdhjtfmwjwmaibpayuea.supabase.co`
- **Project ID**: `wdhjtfmwjwmaibpayuea`
- Find keys at: Dashboard → Project Settings → API
- Realtime must be enabled for notification subscriptions

## 3. Database Schema

### 3.1 Tables

#### `profiles` — Extends Supabase Auth
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK, FK → auth.users(id) ON DELETE CASCADE |
| email | TEXT | NOT NULL |
| full_name | TEXT | NOT NULL |
| role | user_role (ENUM) | NOT NULL DEFAULT 'student' |
| roll_number | TEXT | UNIQUE |
| avatar_url | TEXT | NULLABLE |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

`user_role` ENUM values: `'admin'`, `'professor'`, `'student'`

#### `college_settings` — Geofence Configuration
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK DEFAULT uuid_generate_v4() |
| college_name | TEXT | NOT NULL DEFAULT 'My College' |
| latitude | DOUBLE PRECISION | NOT NULL DEFAULT 11.0168 |
| longitude | DOUBLE PRECISION | NOT NULL DEFAULT 76.9558 |
| geofence_radius_meters | INTEGER | NOT NULL DEFAULT 200 |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| updated_by | UUID | FK → profiles(id) NULLABLE |

#### `attendance_sessions` — Attendance Events
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK DEFAULT uuid_generate_v4() |
| session_code | TEXT | NOT NULL UNIQUE |
| attendance_date | DATE | NOT NULL DEFAULT CURRENT_DATE |
| start_time | TIME | NOT NULL |
| end_time | TIME | NOT NULL |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE |
| created_by | UUID | NOT NULL FK → profiles(id) |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

Constraint: `CHECK (start_time < end_time)`

#### `attendance_records` — Individual Marks
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK DEFAULT uuid_generate_v4() |
| session_id | UUID | NOT NULL FK → attendance_sessions(id) ON DELETE CASCADE |
| student_id | UUID | NOT NULL FK → profiles(id) |
| marked_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| latitude | DOUBLE PRECISION | NOT NULL |
| longitude | DOUBLE PRECISION | NOT NULL |
| status | TEXT | NOT NULL DEFAULT 'present' (values: 'present', 'absent') |
| attendance_date | DATE | NOT NULL DEFAULT CURRENT_DATE |
| ip_address | TEXT | NULLABLE |
| user_agent | TEXT | NULLABLE |

Unique constraints:
- `unique_student_per_session` (session_id, student_id)
- `unique_student_per_day` UNIQUE INDEX (student_id, attendance_date)

#### `attendance_audit_logs` — Audit Trail
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK DEFAULT uuid_generate_v4() |
| attendance_record_id | UUID | FK → attendance_records(id) ON DELETE SET NULL |
| student_id | UUID | NOT NULL FK → profiles(id) |
| session_id | UUID | NOT NULL FK → attendance_sessions(id) |
| marked_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| ip_address | TEXT | NULLABLE |
| latitude | DOUBLE PRECISION | NULLABLE |
| longitude | DOUBLE PRECISION | NULLABLE |
| device_info | TEXT | (Mobile / Tablet / Desktop) |
| browser | TEXT | (Chrome / Firefox / Safari / Edge) |
| user_agent | TEXT | NULLABLE |
| action_type | TEXT | NOT NULL DEFAULT 'mark' |

#### `attendance_summary` — Pre-calculated Percentages
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK DEFAULT uuid_generate_v4() |
| student_id | UUID | NOT NULL FK → profiles(id) ON DELETE CASCADE, UNIQUE |
| total_classes | INTEGER | NOT NULL DEFAULT 0 |
| present | INTEGER | NOT NULL DEFAULT 0 |
| absent | INTEGER | NOT NULL DEFAULT 0 |
| percentage | DECIMAL(5,2) | NOT NULL DEFAULT 0.00 |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

#### `attendance_correction_requests` — Student Correction Requests
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK DEFAULT uuid_generate_v4() |
| student_id | UUID | NOT NULL FK → profiles(id) |
| session_id | UUID | NULLABLE FK → attendance_sessions(id) |
| date | DATE | NULLABLE |
| reason | TEXT | NOT NULL |
| status | TEXT | NOT NULL DEFAULT 'pending' CHECK (IN 'pending','approved','rejected') |
| reviewed_by | UUID | FK → profiles(id) NULLABLE |
| reviewed_at | TIMESTAMPTZ | NULLABLE |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

### 3.2 Indexes
- `idx_sessions_code` ON attendance_sessions(session_code)
- `idx_sessions_date` ON attendance_sessions(attendance_date)
- `idx_attendance_session` ON attendance_records(session_id)
- `idx_attendance_student` ON attendance_records(student_id)
- `idx_attendance_date` ON attendance_records(attendance_date)
- `idx_attendance_student_date` ON attendance_records(student_id, attendance_date)
- `unique_student_per_day` UNIQUE INDEX ON attendance_records(student_id, attendance_date)
- `idx_audit_student` ON attendance_audit_logs(student_id)
- `idx_audit_session` ON attendance_audit_logs(session_id)
- `idx_audit_date` ON attendance_audit_logs(marked_at)
- `idx_summary_percentage` ON attendance_summary(percentage)
- `idx_correction_student` ON attendance_correction_requests(student_id)
- `idx_correction_status` ON attendance_correction_requests(status)
- `idx_correction_session` ON attendance_correction_requests(session_id)

### 3.3 Triggers

#### `handle_new_user()` — Auto-create profile on signup
- Trigger: `on_auth_user_created` AFTER INSERT ON auth.users
- Extracts from `raw_user_meta_data`: full_name, role (defaults to 'student'), roll_number
- SECURITY DEFINER

#### `update_updated_at_column()` — Auto-timestamp
- Triggers: `set_profiles_updated_at`, `set_college_settings_updated_at`
- BEFORE UPDATE on profiles and college_settings

#### `log_attendance_audit()` — Auto-audit on mark
- Trigger: `on_attendance_inserted` AFTER INSERT ON attendance_records
- Parses user_agent → browser (Chrome/Firefox/Safari/Edge) and device (Mobile/Tablet/Desktop)
- Inserts into attendance_audit_logs

#### `update_attendance_summary()` — Auto-summary on attendance change
- Trigger: `on_attendance_summary_update` AFTER INSERT OR UPDATE ON attendance_records
- Calls `recalc_attendance_summary(NEW.student_id)`

### 3.4 Helper Functions (SECURITY DEFINER)

```sql
is_admin()     → BOOLEAN  — auth.uid() has role='admin'
is_professor() → BOOLEAN  — auth.uid() has role='professor'
```

Used in RLS policies to prevent infinite recursion.

#### Correction Approval Function
```sql
approve_correction_request(request_id UUID, reviewer_id UUID) → void
```
- Marks request as 'approved'
- If request has a `date`, finds first session for that date
- UPSERTs attendance_records with status='present' (ON CONFLICT student_id, attendance_date DO UPDATE)
- If session_id provided (legacy), inserts with ON CONFLICT DO NOTHING

#### Correction Rejection Function
```sql
reject_correction_request(request_id UUID, reviewer_id UUID) → void
```
- Marks request as 'rejected'

#### `recalc_attendance_summary(p_student_id UUID)` → void
- Counts total sessions (WHERE attendance_date <= CURRENT_DATE) vs present records
- UPSERTs into attendance_summary

### 3.5 Auto-Absent RPCs (Migration 006)

#### `expire_session_and_mark_absent(p_session_id UUID)` → void
- Deactivates the session (is_active = FALSE)
- Iterates all students with role='student'
- For each student with NO record for that session's date, inserts `status='absent'` record
- Uses `ON CONFLICT (student_id, attendance_date) DO NOTHING` — safe for repeated calls

#### `expire_all_past_sessions()` → INTEGER
- Finds all sessions WHERE is_active=TRUE AND (attendance_date < today OR (attendance_date=today AND end_time <= now))
- Calls `expire_session_and_mark_absent` for each
- Returns count of expired sessions

## 4. RLS Policies

### 4.1 profiles
| Policy | Operation | Rule |
|--------|-----------|------|
| Users can view own profile | SELECT | auth.uid() = id |
| Users can update own profile | UPDATE | auth.uid() = id |
| Admins can view all profiles | SELECT | is_admin() |
| Professors can view all profiles | SELECT | is_professor() |
| Admins can update any profile | UPDATE | is_admin() |

### 4.2 college_settings
| Policy | Operation | Rule |
|--------|-----------|------|
| Anyone can read | SELECT | true |
| Only admins can update | UPDATE | is_admin() |

### 4.3 attendance_sessions
| Policy | Operation | Rule |
|--------|-----------|------|
| Anyone can read sessions by code | SELECT | true |
| Admins and professors can create | INSERT | is_admin() OR is_professor() |
| Creators and admins can update | UPDATE | created_by = auth.uid() OR is_admin() |
| Admins can delete | DELETE | is_admin() |

### 4.4 attendance_records
| Policy | Operation | Rule |
|--------|-----------|------|
| Students can view own | SELECT | student_id = auth.uid() |
| Professors can view their sessions' | SELECT | EXISTS(session.created_by = auth.uid()) |
| Admins can view all | SELECT | is_admin() |
| Students can insert own | INSERT | student_id = auth.uid() |
| Professors can update their sessions' | UPDATE | EXISTS(session.created_by = auth.uid()) |
| Admins can update any | UPDATE | is_admin() |

### 4.5 attendance_audit_logs
| Policy | Operation | Rule |
|--------|-----------|------|
| Students can view own | SELECT | student_id = auth.uid() |
| Professors can view for their sessions | SELECT | EXISTS(session.created_by = auth.uid()) |
| Admins can view all | SELECT | is_admin() |

### 4.6 attendance_summary
| Policy | Operation | Rule |
|--------|-----------|------|
| Students can view own | SELECT | student_id = auth.uid() |
| Professors can view all | SELECT | is_professor() |
| Admins can view all | SELECT | is_admin() |

### 4.7 attendance_correction_requests
| Policy | Operation | Rule |
|--------|-----------|------|
| Students can view own | SELECT | student_id = auth.uid() |
| Students can create | INSERT | student_id = auth.uid() |
| Professors can view for their sessions | SELECT | EXISTS(session.created_by = auth.uid()) |
| Professors can update for their sessions | UPDATE | EXISTS(session.created_by = auth.uid()) |
| Admins can view all | SELECT | is_admin() |
| Admins can update all | UPDATE | is_admin() |

## 5. Roles & Permissions

### 5.1 Admin
- Full access to everything
- View all users, promote students to professors (Users page)
- Configure geofence settings (Settings page)
- Create/manage all sessions
- View all reports, audit trail, correction requests
- Export data (CSV, Excel, PDF)
- Only one admin exists (set via SQL, never via UI)

### 5.2 Professor
- Create attendance sessions (date + start_time + end_time only)
- View/manage sessions they created (activate/deactivate via toggle)
- Auto-absent marking on deactivation via RPC
- View attendance records for their sessions
- View reports with student names
- Approve/reject correction requests
- View audit logs for their sessions
- Access Session History tab

### 5.3 Student
- Register with email + password + roll number (auto-UPPERCASED full_name)
- Mark attendance via session link (geofence-gated + Edge Function validated)
- View own attendance history, percentage, heatmap, trend, streak, health gauge
- Submit correction/leave requests with reason
- Track correction request status (pending/approved/rejected)
- Real-time notifications for correction status changes + new sessions

## 6. Authentication Flow

### 6.1 Registration
1. User fills form: full_name (auto-UPPERCASED), email, password, roll_number
2. **No role selector** — everyone registers as 'student'
3. Supabase Auth creates user, trigger auto-creates profile row
4. `raw_user_meta_data` sends: `{ full_name, role: 'student', roll_number }`

### 6.2 Login
1. User enters email + password
2. Supabase Auth validates credentials
3. AuthContext loads profile from `profiles` table
4. Sidebar renders nav items based on `profile.role`
5. Protected routes redirect unauthorized users

### 6.3 Admin Setup
Only way to create admin — direct SQL:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@test.edu';
```

### 6.4 Professor Promotion
Admin → **Users** page → "Promote to Professor" button on any student row

## 7. Session Creation Flow

### 7.1 Professor Creates Session
1. **Sessions** page → **New Session** button → CreateSessionModal
2. Form: Date, Start Time, End Time (no title/department/semester)
3. Session code auto-generated: `att-YYYYMMDD-HHmmss`
4. On create: inserted with is_active=TRUE, creator linked
5. SessionCard appears with Copy Link / Open / Deactivate buttons
6. Copy Link copies: `http://localhost:5173/attendance?session=att-YYYYMMDD-HHmmss`

### 7.2 Session Toggle Behavior
- **Deactivate**: Calls `expire_session_and_mark_absent` RPC → deactivates session + inserts `absent` records for all unmarked students
- **Activate**: Simple UPDATE `is_active = true`

### 7.3 Auto-Expire on Sessions Page
- `useAutoExpireSessions` runs on mount
- Calls `expire_all_past_sessions` RPC → batch-expires all past sessions
- Invalidates sessions query if any were expired

## 8. Attendance Marking Flow

### 8.1 Student Opens Link
1. Navigates to `/attendance?session=att-YYYYMMDD-HHmmss`
2. Auto-expire check: if session past end_time, RPC called before proceeding
3. `useSessionByCode` fetches session via `.maybeSingle()` (no crash on null)

**Validations (in order):**
1. **Authentication** — ProtectedRoute redirects to login
2. **Session exists** — Invalid code shows "Invalid Session" badge
3. **Session active** — Inactive shows "Expired" badge
4. **Time window** — current time vs end_time; expired shows "Session Expired" card with dashboard link
5. **Geolocation** — high-accuracy GPS (15s timeout) with fallback to low-accuracy (10s); calculates Haversine distance; shows within/outside campus status; button disabled if outside
6. **Already marked** — `useTodayAttendance` checks for existing record; shows "Attendance Marked" card if found
7. **Mark button** — calls Edge Function for server-side validation

### 8.2 Edge Function: validate-attendance
- **URL**: `https://wdhjtfmwjwmaibpayuea.supabase.co/functions/v1/validate-attendance`
- **Method**: POST
- **Auth**: Bearer token (Authorization header)
- **Body**: `{ session_code, latitude, longitude }`
- **Runtime**: Deno with supabase-js

**Validation chain:**
1. Auth token → `supabaseAdmin.auth.getUser(token)`
2. Session exists + is_active=true → `supabaseAdmin.from('attendance_sessions').select('*').eq('session_code', session_code).single()`
3. Session end_time check → `now > sessionDate + endTime` → if expired, calls `expire_session_and_mark_absent` RPC, returns SESSION_EXPIRED
4. Profile exists + role = 'student' → `supabaseAdmin.from('profiles').select('*').eq('id', user.id).single()`
5. Geofence check → Haversine distance vs `college_settings.geofence_radius_meters` (uses .maybeSingle())
6. Duplicate check → `supabaseAdmin.from('attendance_records').select('id').eq('student_id', user.id).eq('attendance_date', currentDate).maybeSingle()`
7. On pass → INSERT into attendance_records with ip_address, user_agent

**Error codes**: `SESSION_NOT_FOUND` (404), `SESSION_INACTIVE` (403), `SESSION_EXPIRED` (403), `NOT_STUDENT` (403), `OUTSIDE_GEOFENCE` (403), `ALREADY_MARKED` (409)

### 8.3 Haversine Formula (both client + Edge Function)
```javascript
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return R * c;
}
```
Note: Uses `Math.max(0, 1 - a)` to prevent `NaN` from floating-point rounding.

### 8.4 One-Attendance-Per-Day Enforcement
- DB: UNIQUE INDEX on (student_id, attendance_date)
- Edge Function checks before insert (returns 409)
- App-level duplicate guard in useTodayAttendance

## 9. Dashboards

### 9.1 Admin Dashboard (AdminDashboard.tsx)
- **6 KPI cards**: Total Students, Present Today, Absent Today, Attendance %, Active Sessions, Defaulters <75%
- **TrendChart**: 90-day area chart (Recharts) with gradient fill, custom tooltip
- **RecentActivityFeed**: Real-time timeline of attendance marks + correction status changes
- **ContributionHeatmap**: GitHub-style full-year grid (present/absent/no-session/correction colors)
- **Defaulters panel**: Scrollable list with names, roll numbers, percentage badges
- **AuditLogTable**: Full audit trail inline

### 9.2 Professor Dashboard (ProfessorDashboard.tsx)
- **4 KPI cards**: Present Today, Absent Today, Active Sessions, Pending Corrections
- **TrendChart**: 30-day area chart
- **RecentActivityFeed**: Attendance marking timeline
- **3 Tabs**: Active Sessions | Session History | Corrections
- Active Sessions: Grid of SessionCards with activate/deactivate toggle
- Session History: Grid of inactive SessionCards
- Corrections: Pending correction requests with Approve/Reject buttons
- CreateSessionModal integration

### 9.3 Student Dashboard (StudentDashboard.tsx)
- **ProgressRing**: SVG ring showing overall attendance % (animated fill via framer-motion)
- **3 KPI cards**: Present Days, Absent Days, Pending Corrections
- **TrendChart**: 90-day area chart
- **TodayStatus**: Current day's attendance status card
- **StreakCard**: Current + longest attendance streak
- **ContributionHeatmap**: Full-year activity grid
- **HealthGauge**: SVG arc gauge with 4 levels (Excellent/Good/Warning/Critical)
- **SummaryCard**: 4-grid stats (Total Sessions, Present, Absent, Corrections)
- **CorrectionWidget**: Pending/Approved/Rejected breakdown
- **RecentActivityFeed**: Personal attendance timeline
- **Request Correction** + **Mark Attendance** buttons

## 10. Premium Analytics Components

| Component | Description | Data Source |
|-----------|-------------|-------------|
| **ContributionHeatmap** | GitHub-style full-year day grid (present=green, absent=red, no-session=gray, correction=amber) | `useAttendanceTrend` + session comparison |
| **TrendChart** | Recharts AreaChart with gradient fill, custom tooltip, 30/90-day configurable | `useAttendanceTrend` |
| **HealthGauge** | SVG semicircular arc gauge with 4 color-coded levels + animated stroke | Live percentage |
| **StreakCard** | Current + longest consecutive present-day streak | Computed from `useAttendanceTrend` |
| **TodayStatus** | Card showing today's present/absent/not-marked status | `useTodayAttendance` |
| **SummaryCard** | 2×2 grid: Total Sessions, Present, Absent, Corrections | `useStudentSummary` + `useMyCorrectionRequests` |
| **ActivityFeed** | Color-coded timeline (marked=blue, correction-submitted=amber, approved=green, rejected=red) | `useAttendanceRecords` + `useCorrectionRequests` |
| **CorrectionWidget** | 3-column widget: Pending/Approved/Rejected counts with badges | `useMyCorrectionRequests` |

## 11. Real-Time Notification System

### 11.1 Architecture
- `NotificationContext` provides global notification state with Supabase Realtime subscriptions
- Notifications persisted in `localStorage` (max 50, key `attendify-notifications`)
- `AppNotification` interface: id, title, message, type (info/success/warning/error), time, read, timestamp, link
- Browser Notification API for system-level notifications (silently fails if not granted)

### 11.2 Role-Based Subscriptions

**Student subscriptions:**
- `attendance_correction_requests` UPDATE filtered by `student_id=eq.{id}` → approve/reject notifications
- `attendance_sessions` INSERT → new session notification with link

**Professor subscriptions:**
- `attendance_correction_requests` INSERT → new correction request notification (with link to dashboard)
- `attendance_records` INSERT → student marked attendance notification

**Admin subscriptions:**
- All professor subscriptions +
- `attendance_sessions` INSERT → session created notification

**All roles:**
- `attendance_sessions` UPDATE `is_active=eq.false` → session expired notification

### 11.3 Deduplication
- `processedRef` (Set<string>) tracks processed event IDs
- Keys use format: `{eventType}-{recordId}`
- Entries auto-cleaned after 5 seconds

### 11.4 NotificationBell Component
- Bell icon with unread count badge (red circle, max "9+")
- Dropdown panel with type-colored icons, title, message, relative time
- Unread items highlighted with blue background
- Mark all read button, individual click handler (marks read + navigates to link)
- Click outside to close

### 11.5 useBrowserNotifications (renamed from useNotifications)
- `requestPermission()` → requests Notification API permission
- `send(title, body, tag?)` → sends system notification
- `NotificationGate` component auto-requests permission 5s after mount

## 12. Geo-absent Logic

### 12.1 How Absence is Tracked
- **Present**: Explicit `status='present'` record in `attendance_records`
- **Absent**: Explicit `status='absent'` record inserted when session expires/marked inactive
- **Counting**: `total_sessions - present_records` for summary calculations
- Absent records exist mainly for audit trail visibility, not for statistical counting

### 12.2 Auto-Absent Marking Flow
1. **Manual deactivation**: Professor clicks Deactivate → `useToggleSession` → `expire_session_and_mark_absent` RPC
2. **Time-based expiry**: Sessions page `useAutoExpireSessions` on mount → `expire_all_past_sessions` RPC
3. **Attendance page check**: Auto-expires session if past end_time before showing expired state
4. **Edge Function check**: If session end_time passed, calls RPC before returning SESSION_EXPIRED

### 12.3 RPC Implementation
- `expire_session_and_mark_absent(p_session_id)`:
  - UPDATE attendance_sessions SET is_active = FALSE
  - Loop over profiles WHERE role='student' AND NOT EXISTS (record for that date)
  - INSERT INTO attendance_records (..., status='absent') ON CONFLICT DO NOTHING
- `expire_all_past_sessions()`:
  - Loop over sessions WHERE is_active=TRUE AND (date < today OR (date=today AND end_time <= now))
  - Call expire_session_and_mark_absent for each

## 13. Correction Request Flow

### 13.1 Student Requests Correction
1. From StudentDashboard → "Request Correction" button or click absent day in calendar
2. `CorrectionRequestModal` opens with date pre-selected (or manual entry)
3. Student types reason, submits → INSERT into `attendance_correction_requests`
4. Auto-links to a session if one exists for that date

### 13.2 Professor Reviews Request
1. From ProfessorDashboard → Corrections tab → sees pending requests
2. Each card: student name, reason, date, Approve/Reject buttons
3. Approve → calls `approve_correction_request(request_id, reviewer_id)` RPC
4. Reject → calls `reject_correction_request(request_id, reviewer_id)` RPC
5. On approve: attendance_records UPSERTed with status='present'
6. Triggers audit log + summary recalculation + real-time notification to student

### 13.3 Database-Level Logic
- `approve_correction_request()` is SECURITY DEFINER
- Date-based: looks up session for that date, UPSERTs (student_id, attendance_date)
- Session-based (legacy): inserts with ON CONFLICT DO NOTHING

## 14. Reports & Export

### 14.1 Reports Page
- **Date range presets**: Daily, Weekly (Mon-Sun), Monthly, Yearly, Custom Range
- **Search**: By student name or roll number (client-side filter)
- **Student filter**: Dropdown of all students
- **Sortable columns**: Student, Date, Status, Session, Time (click to toggle asc/desc)
- **Table**: Student name, roll number, date, status badge, session code, timestamp

### 14.2 Export Formats
| Format | Library | Notes |
|--------|---------|-------|
| CSV | Native Blob | `.csv` download |
| Excel | xlsx (SheetJS) | `.xlsx` download |
| PDF | jsPDF + jspdf-autotable | `.pdf` download |

All exports use the currently filtered/sorted data.

### 14.3 Audit Logs (AuditLogTable)
- Columns: Date & Time, Student, Roll No, Session, Status, Device, Browser, IP, GPS
- Auto-populated via `log_attendance_audit` trigger on INSERT to attendance_records
- Role-filtered: students see own, professors see their sessions', admins see all

### 14.4 Defaulters
- Students with attendance < 75%
- Listed in AdminDashboard and accessible via `useDefaulters` hook
- Queries `attendance_summary` table (pre-calculated)

## 15. User Management

### 15.1 Users Page (Admin Only)
- Table: Name, Email, Role (badge), Actions
- Student rows: "Promote to Professor" button → calls `supabase.from('profiles').update({ role: 'professor' })`
- Professor rows: shows "—"
- Admin rows: shows "System Admin" shield badge

### 15.2 Registration
- No role selector — everyone is student by default
- Professor accounts created via admin promotion
- Admin accounts via direct SQL UPDATE

## 16. Enterprise SaaS UI Theme

### 16.1 Design System (tailwind.config.js)
- **Primary blue**: `#1657C5` with 50-900 scale
- **Canvas background**: `#F5F6F8`
- **Text**: `#111827` (primary), `#6B7280` (secondary), `#9CA3AF` (meta)
- **Font**: Inter (300-800 weights)
- **Border radius**: `16px` (default), `10px` (btn), `16px` (card)
- **Shadows**: card, card-hover, dropdown, modal, sidebar, header, kpi-card, button

### 16.2 Animations (index.css + tailwind)
- `fade-in`, `fade-in-up`, `slide-in-left`, `slide-in-right`, `scale-in`
- `progress-fill` (width animation), `count-up` (opacity + translate), `shimmer` (skeleton loading)
- Custom scrollbar: 6px, rounded, gray

### 16.3 UI Components
| Component | Features |
|-----------|----------|
| **Button** | Variants: primary (blue fill), secondary, danger, ghost, outline; sizes: sm, md, lg; isLoading state with spinner; icon support |
| **Card** | Card, CardHeader, CardTitle, CardContent, CardFooter; optional hover shadow; border support |
| **Input** | Label, error message, date/time/text/number types, SearchInput variant with search icon |
| **Select** | Label, error, options array, native select styled |
| **Badge** | Variants: default (gray), success (green), warning (amber), danger (red), info (blue) |
| **Modal** | Overlay with backdrop, close button, title, animated scale-in |
| **Spinner** | SVG spinning circle; PageSpinner centered variant |
| **KpiCard** | Metric card with icon, label, value, color accent bar, optional subtitle/trend/tooltip; framer-motion staggered entrance |
| **ProgressRing** | SVG circular progress (Recharts pie) with center content area |
| **Tabs** | TabsList + TabsTrigger + TabsContent with smooth transitions |
| **NotificationBell** | Bell icon with unread count, dropdown notification panel, type-colored icons |

## 17. Frontend Structure

```
src/
├── main.tsx                         # Entry point
├── App.tsx                          # Routes + Providers + NotificationGate
├── index.css                        # Tailwind imports + utility classes
├── vite-env.d.ts
├── types/
│   ├── index.ts                     # All TypeScript interfaces (Profile, AttendanceSession, etc.)
│   └── declarations.d.ts            # Module declarations
├── contexts/
│   ├── AuthContext.tsx               # Auth state, signIn/signUp/signOut, profile fetch
│   └── NotificationContext.tsx       # Real-time notifications + localStorage + browser API
├── lib/
│   ├── supabase.ts                  # createClient with env vars
│   └── utils.ts                     # Haversine, session code gen, formatting, cn(), date ranges
├── hooks/
│   ├── useSessions.ts               # useSessions, useSessionByCode, useCreateSession,
│   │                                # useToggleSession (calls RPC on deactivate), useAutoExpireSessions
│   ├── useAttendance.ts             # useAttendanceRecords, useMyAttendance, useTodayAttendance,
│   │                                # checkGeofence, useMarkAttendance (calls Edge Function)
│   ├── useReports.ts                # useDashboardStats (30s refetch), useReportData, useStudents,
│   │                                # useStudentSummary, useDefaulters
│   ├── useAuditLogs.ts              # useAuditLogs with filters
│   ├── useCorrectionRequests.ts     # CRUD + usePendingCorrections + useApproveCorrection + useRejectCorrection
│   ├── useAnalytics.ts              # useAttendanceHeatmap (12mo), useAttendanceTrend (configurable days)
│   └── useNotifications.tsx         # useBrowserNotifications + NotificationGate component
├── components/
│   ├── ui/
│   │   ├── Button.tsx               # Primary/secondary/danger/ghost/outline + sizes + loading
│   │   ├── Card.tsx                 # Card + Header + Title + Content + Footer + hover
│   │   ├── Input.tsx                # Input + SearchInput + label + error
│   │   ├── Select.tsx               # Select + label + error + options
│   │   ├── Badge.tsx                # default/success/warning/danger/info
│   │   ├── Modal.tsx                # Overlay + backdrop + close + title
│   │   ├── Spinner.tsx              # Spinner + PageSpinner
│   │   ├── Tabs.tsx                 # TabsList + TabsTrigger + TabsContent
│   │   ├── ProgressRing.tsx         # SVG circular progress indicator
│   │   ├── KpiCard.tsx              # Animated metric card with color, icon, trend
│   │   └── NotificationBell.tsx     # Bell + dropdown + unread count + type colors
│   ├── layout/
│   │   ├── AppLayout.tsx            # Sidebar + Header + Outlet + BottomNav
│   │   ├── Sidebar.tsx              # Collapsible desktop sidebar + mobile overlay + BottomNav
│   │   ├── Header.tsx               # Sticky top bar with welcome + NotificationBell
│   │   └── ProtectedRoute.tsx       # Auth check + optional role filter
│   ├── auth/
│   │   ├── LoginForm.tsx            # Email + password + show/hide toggle
│   │   └── RegisterForm.tsx         # Name (auto-UPPERCASE) + email + password + roll
│   ├── sessions/
│   │   ├── CreateSessionModal.tsx   # Zod-validated form (date, start, end)
│   │   ├── SessionCard.tsx          # Code, date, time, link, copy, open, toggle
│   │   └── SessionList.tsx          # Grid of SessionCards
│   ├── attendance/
│   │   ├── AttendanceValidator.tsx  # Full validation chain UI component
│   │   ├── GeofenceChecker.tsx      # GPS location + distance + retry
│   │   ├── CorrectionRequestModal.tsx # Date + reason form
│   │   ├── AttendanceCalendar.tsx    # Reusable month grid
│   │   ├── ProfessorCalendarView.tsx # Per-student present/absent toggle
│   │   └── StudentCalendarView.tsx   # Status badges + correction request on absent click
│   ├── analytics/
│   │   ├── ContributionHeatmap.tsx   # Full-year day grid (GitHub-style)
│   │   ├── TrendChart.tsx           # Area chart (Recharts) with gradient
│   │   ├── HealthGauge.tsx          # SVG semicircular arc gauge
│   │   ├── StreakCard.tsx           # Current + longest streak
│   │   ├── TodayStatus.tsx          # Today's present/absent/not-marked
│   │   ├── SummaryCard.tsx          # 4-grid attendance stats
│   │   ├── ActivityFeed.tsx         # Type-colored timeline
│   │   ├── CorrectionWidget.tsx     # Pending/approved/rejected columns
│   │   ├── AttendanceHeatmap.tsx    # 12-month bar chart (legacy)
│   │   ├── AttendanceTrend.tsx      # 30-day bar chart (legacy)
│   │   ├── DefaulterWidget.tsx      # Student list <75%
│   │   └── RiskPrediction.tsx       # What-if calculator
│   └── reports/
│       ├── AttendanceTable.tsx      # Data table component
│       ├── AuditLogTable.tsx        # Audit trail with device/browser/IP
│       ├── ExportButtons.tsx        # CSV + Excel + PDF export functions
│       └── ReportFilters.tsx        # Date range + student filter
├── pages/
│   ├── Login.tsx                    # Login page layout
│   ├── Register.tsx                 # Register page layout
│   ├── Dashboard.tsx                # Routes to role-specific dashboard
│   ├── Sessions.tsx                 # Session management + auto-expire on mount
│   ├── Attendance.tsx               # Parses ?session= code → full attendance flow
│   ├── Reports.tsx                  # 3 tabs: Reports | Audit Trail | Corrections
│   ├── Settings.tsx                 # Geofence configuration (admin only)
│   ├── Users.tsx                    # User table + promote (admin only)
│   └── NotFound.tsx                 # 404 page
└── public/
```

## 18. Package Dependencies

| Package | Purpose |
|---------|---------|
| react + react-dom | UI framework (18.x) |
| react-router-dom | SPA routing + protected routes |
| @tanstack/react-query | Server state, caching, mutations |
| @supabase/supabase-js | Supabase client (auth + DB + functions) |
| react-hook-form + @hookform/resolvers + zod | Form validation |
| react-hot-toast | Toast notifications |
| lucide-react | Icon set |
| framer-motion | Staggered entrance animations, animated fills |
| recharts | Area charts, progress rings |
| xlsx (SheetJS) | Excel export |
| jspdf + jspdf-autotable | PDF export |
| date-fns | Date manipulation |
| tailwindcss + postcss + autoprefixer | Utility CSS framework |
| vite + @vitejs/plugin-react | Build tool + fast refresh |
| typescript | Type safety |

## 19. Supabase Configuration

### 19.1 Edge Function
- **Name**: `validate-attendance`
- **Runtime**: Deno 1.x
- **Location**: `supabase/functions/validate-attendance/index.ts`
- **Deployment**: Copy source → Supabase Dashboard → Edge Functions → validate-attendance → Deploy
- **Environment**: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (auto-injected by Supabase)

### 19.2 Auth Settings
- **Providers**: Email + Password only (no OAuth/social)
- **Session**: Persistent (survives tab close)
- **Security**: Disable public signup if admin-only user creation desired

### 19.3 Required Dashboard SQL
```sql
-- Insert default geofence settings
INSERT INTO college_settings (college_name, latitude, longitude, geofence_radius_meters)
VALUES ('My College', 11.0168, 76.9558, 200)
ON CONFLICT DO NOTHING;

-- Set first admin
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';

-- Grant execute for auto-absent RPCs (migration 006)
GRANT EXECUTE ON FUNCTION expire_session_and_mark_absent TO authenticated;
GRANT EXECUTE ON FUNCTION expire_all_past_sessions TO authenticated;
```

## 20. Complete Test Scenario

**Step 1: Setup**
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@test.edu';
```

**Step 2: Admin promotes professor**
Login as admin → Users → find prof@test.edu → "Promote to Professor"

**Step 3: Professor creates session**
Login as prof → Sessions → Create Session → set date=today, start=5min ago, end=+1hr → Copy Link

**Step 4: Student marks attendance**
Open incognito → login as student → paste link → allow location → Mark Attendance

**Step 5: Verify**
- Admin dashboard: Present Today incremented
- Student dashboard: "Present" badge, percentage updated
- Reports: record visible with student name + roll + status

**Step 6: Check Audit Trail**
Login as admin/prof → Reports → Audit Trail → see device, browser, IP, GPS

**Step 7: Test auto-absent**
- Create session with past end_time → Sessions page auto-expires → absent records inserted
- Or: professor deactivates session → RPC marks all unmarked students absent

**Step 8: Test correction flow**
- Student → Request Correction → submit reason
- Professor → Dashboard → Corrections tab → Approve/Reject
- Student gets real-time notification (in-app + browser)

**Step 9: Test notifications**
- Student marks attendance → browser notification "Attendance Marked ✓"
- Professor creates session → students get "New Session" notification with link
- Professor deactivates session → students get "Session Expired" notification

**Step 10: Test exports**
Reports → PDF/Excel/CSV → verify filtered data exports correctly

**Step 11: Verify absent calculation**
- Create 5 sessions over different days
- Mark student present for 3
- Student dashboard should show 60% (3/5), not 100% (3/3)

## 21. Migration Summary

| Migration | Changes |
|-----------|---------|
| **001_schema.sql** | ENUMs, all tables, RLS, triggers, helper functions, initial geofence insert |
| **002_remove_department_semester_title.sql** | Removes unused columns (title, department, semester) |
| **003_attendance_features.sql** | Adds audit_logs, summary, corrections tables + RLS + RPCs |
| **004_correction_date.sql** | Adds `date` column to corrections, makes session_id nullable, updates approve RPC |
| **005_fix_absent_logic.sql** | Fixes recalc to count sessions (not records) as total_classes denominator |
| **006_auto_absent.sql** | Adds expire_session_and_mark_absent + expire_all_past_sessions RPCs |

## 22. Security Summary

| Feature | Implementation |
|---------|---------------|
| Authentication | Supabase Auth (email/password) |
| Row Level Security | All 7 tables RLS-enabled with role-based policies |
| Role-based access | ProtectedRoute component + RLS per role |
| One attendance per day | DB unique index + Edge Function check |
| Geofence enforcement | Client GPS + backend Haversine (Edge Function) |
| Session expiry | Time check in Edge Function + auto-absent RPC |
| CSRF protection | Supabase JWT tokens |
| XSS protection | React's built-in escaping |
| SQL injection | Supabase parameterized queries |
| No direct role change | Registration hardcoded to 'student' |
| SECURITY DEFINER | Helper functions bypass RLS for admin operations |
| Correction approval | Only professors/admins can approve via SECURITY DEFINER RPC |

## 23. Deployment

### 23.1 Vercel (Recommended)
`vercel.json` rewrites SPA routes to `/index.html`:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```
**Steps:**
1. Push to GitHub
2. Import in Vercel → Framework: Vite
3. Build command: `npm run build`
4. Output directory: `dist`
5. Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### 23.2 Commands Reference
```bash
npm run dev              # Vite dev server
npm run build            # tsc -b && vite build
npx tsc --noEmit         # TypeScript check only
npm install              # Install dependencies
```

### 23.3 Critical Deployment Steps
1. Apply all 6 migrations in order (001→006) via Supabase SQL Editor or `supabase migration up`
2. Deploy Edge Function `validate-attendance` via Supabase Dashboard
3. Verify auto-absent: create test session, let it expire, check absent records in Reports/Audit Log
4. Enable Realtime in Supabase project settings for notification subscriptions

## 24. File Inventory (72 files)

```
supabase/
├── migrations/
│   ├── 001_schema.sql                    (272 lines)
│   ├── 002_remove_department_semester_title.sql (11 lines)
│   ├── 003_attendance_features.sql       (247 lines)
│   ├── 004_correction_date.sql           (58 lines)
│   ├── 005_fix_absent_logic.sql          (34 lines)
│   └── 006_auto_absent.sql               (82 lines)
└── functions/
    └── validate-attendance/
        ├── index.ts                      (242 lines)
        └── deno.json                     (5 lines)

src/
├── App.tsx                               (110 lines)
├── index.css                             (200 lines)
├── vite-env.d.ts
├── types/
│   ├── index.ts                          (121 lines)
│   └── declarations.d.ts
├── contexts/
│   ├── AuthContext.tsx                   (109 lines)
│   └── NotificationContext.tsx           (336 lines)
├── lib/
│   ├── supabase.ts                      (17 lines)
│   └── utils.ts                         (100 lines)
├── hooks/
│   ├── useSessions.ts                   (110 lines)
│   ├── useAttendance.ts                 (180 lines)
│   ├── useReports.ts                    (138 lines)
│   ├── useAuditLogs.ts                  (25 lines)
│   ├── useCorrectionRequests.ts         (137 lines)
│   ├── useAnalytics.ts                  (166 lines)
│   └── useNotifications.tsx             (46 lines)
├── pages/
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── Sessions.tsx                     (45 lines)
│   ├── Attendance.tsx                   (230 lines)
│   ├── Reports.tsx                      (221 lines)
│   ├── Settings.tsx                     (112 lines)
│   ├── Users.tsx                        (148 lines)
│   └── NotFound.tsx
├── components/
│   ├── ui/ (10 files)
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   ├── Spinner.tsx
│   │   ├── Tabs.tsx
│   │   ├── ProgressRing.tsx
│   │   ├── KpiCard.tsx
│   │   └── NotificationBell.tsx         (120 lines)
│   ├── layout/ (4 files)
│   │   ├── AppLayout.tsx               (20 lines)
│   │   ├── Sidebar.tsx                  (172 lines)
│   │   ├── Header.tsx                   (21 lines)
│   │   └── ProtectedRoute.tsx
│   ├── auth/ (2 files)
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── sessions/ (3 files)
│   │   ├── CreateSessionModal.tsx       (60 lines)
│   │   ├── SessionCard.tsx              (86 lines)
│   │   └── SessionList.tsx
│   ├── attendance/ (6 files)
│   │   ├── AttendanceValidator.tsx      (126 lines)
│   │   ├── GeofenceChecker.tsx          (80 lines)
│   │   ├── CorrectionRequestModal.tsx   (64 lines)
│   │   ├── AttendanceCalendar.tsx
│   │   ├── ProfessorCalendarView.tsx
│   │   └── StudentCalendarView.tsx
│   ├── analytics/ (12 files)
│   │   ├── ContributionHeatmap.tsx      (125 lines)
│   │   ├── TrendChart.tsx               (111 lines)
│   │   ├── HealthGauge.tsx              (67 lines)
│   │   ├── StreakCard.tsx               (82 lines)
│   │   ├── TodayStatus.tsx              (47 lines)
│   │   ├── SummaryCard.tsx              (64 lines)
│   │   ├── ActivityFeed.tsx             (84 lines)
│   │   ├── CorrectionWidget.tsx         (59 lines)
│   │   ├── AttendanceHeatmap.tsx
│   │   ├── AttendanceTrend.tsx
│   │   ├── DefaulterWidget.tsx
│   │   └── RiskPrediction.tsx
│   └── reports/ (4 files)
│       ├── AttendanceTable.tsx
│       ├── AuditLogTable.tsx
│       ├── ExportButtons.tsx
│       └── ReportFilters.tsx
└── dashboard/ (3 files)
    ├── AdminDashboard.tsx              (122 lines)
    ├── ProfessorDashboard.tsx           (149 lines)
    └── StudentDashboard.tsx             (160 lines)

Config files:
├── tailwind.config.js                   (93 lines)
├── vite.config.ts                       (12 lines)
├── tsconfig.json                        (27 lines)
├── tsconfig.node.json
├── postcss.config.js
├── package.json                         (45 lines)
└── vercel.json
```

**Totals:**
- **72 files** across all directories
- **44 React components** (11 UI, 4 layout, 2 auth, 3 sessions, 6 attendance, 12 analytics, 4 reports, 3 dashboards)
- **7 custom hooks** (useSessions, useAttendance, useReports, useAuditLogs, useCorrectionRequests, useAnalytics, useBrowserNotifications)
- **9 pages** (Login, Register, Dashboard, Sessions, Attendance, Reports, Settings, Users, NotFound)
- **2 React contexts** (Auth, Notifications)
- **6 SQL migrations** + **1 Edge Function**
- **1 Edge Function** (validate-attendance, 242 lines)
