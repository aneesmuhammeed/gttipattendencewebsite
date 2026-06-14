# College Attendance Management System — Complete Workflow

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Auth UI  │  │ Sessions │  │Attend-   │  │ Reports &        │ │
│  │Login/Reg │  │  Mgmt    │  │ ance     │  │ Export + Audit   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
│  ┌────┴─────────────┴─────────────┴─────────────────┴──────────┐ │
│  │           React Query (Caching + Mutations)                   │ │
│  └──────────────────────────┬───────────────────────────────────┘ │
│  ┌──────────────────────────┴───────────────────────────────────┐ │
│  │              Supabase Client (supabase-js)                     │ │
│  └──────────────────────────┬───────────────────────────────────┘ │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│              Supabase Backend (Project: wdhjtfmwjwmaibpayuea)     │
│  ┌──────────────────────────┴───────────────────────────────────┐ │
│  │              Edge Functions                                    │ │
│  │  validate-attendance (Deno runtime)                            │ │
│  └──────────────────────────┬───────────────────────────────────┘ │
│                             │                                     │
│  ┌──────────────────────────┴───────────────────────────────────┐ │
│  │              PostgreSQL Database                               │ │
│  │  Tables: profiles, attendance_sessions, attendance_records,   │ │
│  │          college_settings, attendance_audit_logs,             │ │
│  │          attendance_summary, attendance_correction_requests   │ │
│  │  RLS Policies + SECURITY DEFINER helper functions             │ │
│  └───────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
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
| status | TEXT | NOT NULL DEFAULT 'present' |
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
| device_info | TEXT | (Mobile / Tablet / Desktop — parsed from user_agent) |
| browser | TEXT | (Chrome / Firefox / Safari / Edge — parsed from user_agent) |
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
| date | DATE | NULLABLE (alternative to session_id) |
| reason | TEXT | NOT NULL |
| status | TEXT | NOT NULL DEFAULT 'pending' CHECK (IN 'pending','approved','rejected') |
| reviewed_by | UUID | FK → profiles(id) NULLABLE |
| reviewed_at | TIMESTAMPTZ | NULLABLE |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

### 3.2 Indexes
- `idx_sessions_code` ON attendance_sessions(session_code)
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
- Extracts from `raw_user_meta_data`: full_name, role, roll_number
- Defaults role to 'student' if not provided
- Runs with SECURITY DEFINER (bypasses RLS)

#### `update_updated_at_column()` — Auto-timestamp
- Trigger: `set_profiles_updated_at`, `set_college_settings_updated_at`
- Runs BEFORE UPDATE on profiles and college_settings

#### `log_attendance_audit()` — Auto-audit on mark
- Trigger: `on_attendance_inserted` AFTER INSERT ON attendance_records
- Parses user_agent into browser (Chrome/Firefox/Safari/Edge) and device (Mobile/Tablet/Desktop)
- Inserts row into attendance_audit_logs with all metadata

#### `recalc_attendance_summary()` — Manual recalc function
- Called by the trigger below, or can be called manually
- Counts total/present/absent from attendance_records for a given student
- UPSERTs into attendance_summary

#### `update_attendance_summary()` — Auto-summary on attendance change
- Trigger: `on_attendance_summary_update` AFTER INSERT OR UPDATE ON attendance_records
- Calls `recalc_attendance_summary(NEW.student_id)`

### 3.4 Helper Functions (SECURITY DEFINER — bypass RLS)

```sql
is_admin()     → BOOLEAN  — Checks if auth.uid() has role='admin'
is_professor() → BOOLEAN  — Checks if auth.uid() has role='professor'
```

Used in RLS policies to prevent infinite recursion.

#### Correction Approval Function
```sql
approve_correction_request(request_id UUID, reviewer_id UUID) → void
```
- Marks request as 'approved'
- If request has a `date` (not session_id), finds the first session for that date
- UPSERTs attendance_records with status='present' for the student on that date (ON CONFLICT UPDATE)
- If request has a session_id (legacy), inserts attendance_records for that session

#### Correction Rejection Function
```sql
reject_correction_request(request_id UUID, reviewer_id UUID) → void
```
- Marks request as 'rejected'

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
| Anyone can read college settings | SELECT | true |
| Only admins can update college settings | UPDATE | is_admin() |

### 4.3 attendance_sessions
| Policy | Operation | Rule |
|--------|-----------|------|
| Anyone can read sessions by code | SELECT | true |
| Admins and professors can create sessions | INSERT | is_admin() OR is_professor() |
| Creators and admins can update sessions | UPDATE | created_by = auth.uid() OR is_admin() |
| Admins can delete sessions | DELETE | is_admin() |

### 4.4 attendance_records
| Policy | Operation | Rule |
|--------|-----------|------|
| Students can view own attendance | SELECT | student_id = auth.uid() |
| Professors can view their session attendance | SELECT | EXISTS(session.created_by = auth.uid()) |
| Admins can view all attendance | SELECT | is_admin() |
| Students can insert own attendance | INSERT | student_id = auth.uid() |
| Professors can update attendance in their sessions | UPDATE | EXISTS(session.created_by = auth.uid()) |
| Admins can update any attendance | UPDATE | is_admin() |

### 4.5 attendance_audit_logs
| Policy | Operation | Rule |
|--------|-----------|------|
| Students can view own audit logs | SELECT | student_id = auth.uid() |
| Professors can view audit for their sessions | SELECT | EXISTS(session.created_by = auth.uid()) |
| Admins can view all audit logs | SELECT | is_admin() |

### 4.6 attendance_summary
| Policy | Operation | Rule |
|--------|-----------|------|
| Students can view own summary | SELECT | student_id = auth.uid() |
| Professors can view all summaries | SELECT | is_professor() |
| Admins can view all summaries | SELECT | is_admin() |

### 4.7 attendance_correction_requests
| Policy | Operation | Rule |
|--------|-----------|------|
| Students can view own requests | SELECT | student_id = auth.uid() |
| Students can create requests | INSERT | student_id = auth.uid() |
| Professors can view requests for their sessions | SELECT | EXISTS(session.created_by = auth.uid()) |
| Professors can update requests for their sessions | UPDATE | EXISTS(session.created_by = auth.uid()) |
| Admins can view all requests | SELECT | is_admin() |
| Admins can update all requests | UPDATE | is_admin() |

## 5. Roles & Permissions

### 5.1 Admin
- Full access to everything
- View all users, promote students to professors
- Configure geofence settings
- Create/manage sessions
- View all reports, audit trail, correction requests
- Export data (CSV, Excel, PDF)
- **Only one admin exists** (set via SQL, never via UI)

### 5.2 Professor
- Create attendance sessions (only date + time fields)
- View/manage sessions they created (activate/deactivate)
- View attendance records for their sessions
- View reports with student names
- **Calendar View**: Click any date → see which students were present/absent → toggle per-student status
- **Correction Requests**: Approve/reject pending requests from Reports → Corrections tab
- **Audit Trail**: View audit logs for their sessions

### 5.3 Student
- Register with email + password + roll number (auto-UPPERCASED name)
- Mark attendance via session link (geofence-gated)
- View own attendance history, percentage, heatmap, and trend
- **Calendar View**: Month grid with day colors (green=present, red=absent, gray=no session)
- **Correction Requests**: Click absent day → submit correction/leave request with reason
- Track correction request status (pending/approved/rejected)

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
Admin goes to **Users** page → clicks "Promote to Professor" on a student

## 7. Session Creation Flow

### 7.1 Professor Creates Session
1. Logged in as professor → **Sessions** page → **Create Session**
2. Form shows only: Date, Start Time, End Time
3. No title, department, or semester fields
4. Session code auto-generated: `att-YYYYMMDD-HHmmss` (e.g., `att-20260614-193000`)
5. Click **Create Session** → card appears with Copy Link button
6. Copy Link copies: `http://localhost:5173/attendance?session=att-20260614-193000`

### 7.2 Session Link Format
```
http://localhost:5173/attendance?session={session_code}
```

## 8. Attendance Marking Flow

### 8.1 Student Opens Link
1. Navigates to `/attendance?session=att-20260614-193000`
2. `AttendanceValidator` component loads and validates:

   **Step 1 — Authentication**
   - Must be logged in
   - ProtectedRoute redirects to login if not

   **Step 2 — Session Exists**
   - Fetches session by session_code from DB
   - Shows "Session Not Found" if invalid

   **Step 3 — Session Active**
   - Checks `is_active` flag
   - Shows "Session Expired" if inactive

   **Step 4 — Time Window (Frontend only)**
   - Compares current time to start_time / end_time
   - Shows "Not Yet Started" or "Session Expired"

   **Step 5 — Geofence Check (Browser Geolocation)**
   - `GeofenceChecker` component requests browser location
   - Calculates distance from college using Haversine formula
   - Shows distance and whether within geofence
   - **Mark Attendance button disabled until inside geofence**

   **Step 6 — Backend Validation (Edge Function)**
   - On submit, calls: `POST /functions/v1/validate-attendance`
   - Validates:
     - Session exists & is active
     - Profile exists & role = 'student'
     - Geofence distance ≤ allowed radius
     - No duplicate attendance for this date
   - On success → inserts record, shows "Attendance Marked!"
   - Triggers auto-audit log and summary recalculation

### 8.2 Edge Function Details
- **URL**: `https://wdhjtfmwjwmaibpayuea.supabase.co/functions/v1/validate-attendance`
- **Request body**: `{ session_code, latitude, longitude }`
- **Auth**: Bearer token in Authorization header
- **Validations**:
  1. Session exists + is_active = true
  2. Profile exists + role = 'student'
  3. Distance using Haversine ≤ college_settings.geofence_radius_meters
  4. No existing record with same student_id + attendance_date
  5. On pass: INSERT into attendance_records
- **Response on success**: `{ success: true, message: "...", record: {...} }`
- **Response on failure**: `{ error: "...", code: "ERROR_CODE" }`

Error codes: `SESSION_NOT_FOUND`, `SESSION_INACTIVE`, `NOT_STUDENT`, `OUTSIDE_GEOFENCE`, `ALREADY_MARKED`

### 8.3 Haversine Formula
```javascript
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // distance in meters
}
```

### 8.4 One-Attendance-Per-Day Enforcement
- Database-level: UNIQUE INDEX on (student_id, attendance_date)
- Edge Function checks before insert
- Duplicate returns 409 with code `ALREADY_MARKED`

## 9. Dashboard Views

### 9.1 Admin Dashboard
- **Total Students**: Count of profiles with role='student'
- **Present Today**: Count of attendance_records for today
- **Absent Today**: Total Students - Present Today
- **Attendance %**: (Present / Total) × 100
- **Active Sessions**: Count of sessions where is_active=true AND date=today
- **Defaulters**: Students below 75% attendance (list with names + roll + percentage)
- **Heatmap**: 12-month attendance bar chart
- **Trend**: 30-day attendance bar chart
- Auto-refreshes every 30 seconds

### 9.2 Professor Dashboard
- **Total Sessions**: Count of sessions created
- **Active Sessions**: Count of currently active sessions
- **Quick Actions**: Create Session, View Reports buttons
- **Active Sessions List**: Shows last 5 active sessions with codes and times
- **Calendar Toggle**: Shows/hides ProfessorCalendarView
- **ProfessorCalendarView**: Month grid with color-coded days (green=all present, red=all absent, yellow=mixed, gray=no session). Click a date → right panel shows all students with present/absent toggle button per student. Professor can mark/unmark attendance for any student on any date. If no session exists for that date, prompts to create one first.

### 9.3 Student Dashboard
- **Today's Status**: Present (green) or Not Marked (gray)
- **Total Classes**: Number of attendance records from summary
- **Attendance %**: (present / total) × 100 with color indicator (green ≥ 75%, red < 75%)
- **Correction Requests**: Total count + pending count
- **Recent Attendance**: Last 10 records with dates and status badges
- **Calendar Toggle**: Shows/hides StudentCalendarView
- **StudentCalendarView**: Month grid with day colors (green=present, red=absent, gray=no session, white=future). Click a date → right panel shows status badge. Click absent day → opens CorrectionRequestModal with date preset.
- **Heatmap**: 12-month attendance bar chart
- **Trend**: 30-day attendance bar chart
- **Quick Actions**: Request Correction button

## 10. Reports & Export

### 10.1 Report Tabs
Reports page has three tabs:
1. **Reports** — Attendance data table with filters
2. **Audit Trail** — Detailed audit log table
3. **Corrections** — Pending and processed correction requests

### 10.2 Report Filters
- **Preset ranges**: Daily, Weekly (Mon-Sun), Monthly, Yearly
- **Custom date range**: Start Date + End Date pickers
- **Student filter**: Dropdown showing all students (with roll numbers)

### 10.3 Report Data
Fetches from `attendance_records` joined with `profiles` (student name, roll number).
Columns in table: Date, Student, Roll No, Status, Time

### 10.4 Audit Trail Table
- Columns: Date, Student, Roll, Session, Status, Time, Device, Browser, IP, GPS Coordinates
- Shows all metadata captured during attendance marking
- Filtered by role (students see own, professors see their sessions, admins see all)

### 10.5 Correction Requests Tab
- **For Professors/Admins**: List of all correction requests with student name, roll, date, reason, status
- Pending requests show Approve / Reject buttons
- Approved/rejected requests show reviewer and timestamp
- **For Students**: List of own requests with status badges

### 10.6 Export Formats
| Format | Library | File Extension |
|--------|---------|---------------|
| CSV | Native (Blob) | .csv |
| Excel | xlsx (SheetJS) | .xlsx |
| PDF | jsPDF + jspdf-autotable | .pdf |

Export buttons appear next to filters; all three export the currently filtered data.

## 11. Geofencing

### 11.1 Configuration
Admin configures in **Settings** page:
- **Latitude**: Default 11.0168 (Coimbatore, India)
- **Longitude**: Default 76.9558
- **Radius**: Default 200 meters

### 11.2 Client-Side Check
1. `GeofenceChecker` component mounts → requests location via `navigator.geolocation.getCurrentPosition()`
2. Uses high accuracy, 10-second timeout
3. Calculates Haversine distance from college coordinates
4. Shows result: green "You are within campus (Xm)" or red "You are Xm away (max: Ym)"
5. Disables "Mark Attendance" button if outside geofence

### 11.3 Server-Side Check (Edge Function)
Same Haversine calculation repeated on backend for security (cannot be bypassed by modifying frontend).

## 12. Calendar-Based Attendance

### 12.1 Professor Calendar View (`ProfessorCalendarView`)
- Uses shared `AttendanceCalendar` component (month grid)
- Colors: green (all present that day), red (all absent), yellow (mixed), gray (no session), white (future)
- Click any date → right panel shows all students with their current status
- Each student row has two buttons: CheckCircle (mark present) and XCircle (mark absent)
- UPSERT logic: if record exists, updates status; if not, finds first session of the day and creates record
- If no session exists for the selected date, shows an error: "Create a session first"

### 12.2 Student Calendar View (`StudentCalendarView`)
- Uses shared `AttendanceCalendar` component (month grid)
- Colors: green (present), red (absent), gray (no session), white (future)
- Determines status: compares enrolled sessions vs. own attendance records
- Click any date → right panel shows status badge
- Click absent day → auto-opens CorrectionRequestModal with date pre-selected
- Student types reason and submits

### 12.3 Shared Calendar Component (`AttendanceCalendar`)
- Pure presentational: `getDaysInMonth()`, `AttendanceCalendar`, `CalendarNavigator`
- `getDayStatus` callback prop lets parent determine color per day
- `onDayClick(date, status)` callback for interaction
- `CalendarNavigator` renders month/year with left/right arrows
- Supports padding days from prev/next month
- Today highlighted with ring-2

## 13. Analytics

### 13.1 Attendance Heatmap (`AttendanceHeatmap`)
- 12-month bar chart using Recharts
- Fetches from DB: monthly present/total grouped by month
- Each bar shows percentage, colored green (≥75%) or red (<75%)
- Y-axis: 0–100%

### 13.2 Attendance Trend (`AttendanceTrend`)
- 30-day bar chart using Recharts
- Fetches from DB: daily present/total
- Shows daily attendance percentage trend
- Useful for spotting patterns

### 13.3 Defaulter Widget (`DefaulterWidget`)
- Lists students with attendance < 75%
- Shows name, roll number, percentage
- Color-coded: red (< 50%), orange (50–75%)

## 14. Correction Request Flow

### 14.1 Student Requests Correction
1. From StudentDashboard → click "Request Correction" or click absent day in calendar
2. `CorrectionRequestModal` opens with date pre-selected (from calendar click) or manual
3. Student types reason (e.g., "I was present but couldn't mark", "Medical leave")
4. Submit → inserts into `attendance_correction_requests`
5. Auto-links to session if one exists for that date (session_id can be null)

### 14.2 Professor Reviews Request
1. From Reports → Corrections tab → sees pending requests
2. Each row shows: student name, roll number, date, reason, created_at
3. Click Approve → calls `approve_correction_request(request_id, reviewer_id)` RPC
4. Click Reject → calls `reject_correction_request(request_id, reviewer_id)` RPC
5. On approve: attendance_records UPSERTed with status='present' for that date
6. Triggers audit log and summary recalculation

### 14.3 Database-Level Logic
- `approve_correction_request()` is SECURITY DEFINER (bypasses RLS)
- If request has a `date` (non-null), finds any session for that date
- UPSERTs attendance_records with ON CONFLICT (student_id, attendance_date) DO UPDATE
- If request has a `session_id` (legacy), inserts with that session_id + ON CONFLICT DO NOTHING

## 15. User Management

### 15.1 Users Page (Admin Only)
- Table showing all users: Name, Email, Role, Actions
- **Student row**: "Promote to Professor" button
- **Professor row**: Shows "Already Professor"
- **Admin row**: Shows "System Admin" badge

### 15.2 Registration
- **No role selector** — everyone is student by default
- Professor accounts are created by promoting students
- Admin accounts are created via direct SQL update

## 16. Frontend Structure

```
src/
├── main.tsx                       # Entry point
├── App.tsx                        # Routes + Providers
├── index.css                      # Tailwind imports
├── vite-env.d.ts                  # Vite env types
├── types/
│   ├── index.ts                   # TypeScript interfaces (all entities)
│   └── declarations.d.ts          # Module declarations (lucide-react, jspdf-autotable)
├── contexts/
│   └── AuthContext.tsx            # Auth state + signIn/signUp/signOut
├── lib/
│   ├── supabase.ts                # Supabase client init
│   └── utils.ts                   # Helpers: Haversine, session code, formatting
├── hooks/
│   ├── useAuth.ts                 # Auth hook (re-exports from context)
│   ├── useSessions.ts             # Session CRUD + toggle
│   ├── useAttendance.ts           # Mark attendance + geofence + records queries
│   ├── useReports.ts              # Dashboard stats + report data + defaulter list + student summary
│   ├── useAuditLogs.ts            # Audit log queries
│   ├── useCorrectionRequests.ts   # Correction requests CRUD + approve/reject RPC
│   └── useAnalytics.ts            # Heatmap + trend queries
├── components/
│   ├── ui/
│   │   ├── Button.tsx             # Variants: primary, secondary, danger, ghost, outline
│   │   ├── Card.tsx               # Card + CardHeader + CardTitle + CardContent
│   │   ├── Input.tsx              # Input with label + error
│   │   ├── Select.tsx             # Select dropdown with label + error
│   │   ├── Badge.tsx              # Variants: default, success, warning, danger, info
│   │   ├── Modal.tsx              # Overlay modal with close
│   │   └── Spinner.tsx           # Loading spinner + PageSpinner
│   ├── layout/
│   │   ├── AppLayout.tsx          # Sidebar + Header + Outlet
│   │   ├── Sidebar.tsx            # Nav items filtered by role
│   │   ├── Header.tsx             # Top bar with menu toggle
│   │   └── ProtectedRoute.tsx     # Auth check + role filter
│   ├── auth/
│   │   ├── LoginForm.tsx          # Email + password + show/hide
│   │   └── RegisterForm.tsx       # Name (auto-UPPERCASE) + email + password + roll
│   ├── sessions/
│   │   ├── CreateSessionModal.tsx # Simplified form (date + times only)
│   │   ├── SessionCard.tsx        # Session display + copy link + toggle
│   │   └── SessionList.tsx        # Grid of session cards
│   ├── attendance/
│   │   ├── AttendanceValidator.tsx # Full validation chain UI
│   │   ├── GeofenceChecker.tsx    # Browser GPS + distance display
│   │   ├── AttendanceCalendar.tsx  # Reusable month grid + CalendarNavigator + DayStatus
│   │   ├── ProfessorCalendarView.tsx # Professor calendar with per-student toggle
│   │   ├── StudentCalendarView.tsx   # Student calendar with correction request integration
│   │   └── CorrectionRequestModal.tsx # Form: date + reason -> submit
│   ├── analytics/
│   │   ├── AttendanceHeatmap.tsx   # 12-month bar chart (Recharts)
│   │   ├── AttendanceTrend.tsx     # 30-day bar chart (Recharts)
│   │   └── DefaulterWidget.tsx     # Student list below 75%
│   ├── reports/
│   │   ├── ReportFilters.tsx      # Preset ranges + date pickers + student filter
│   │   ├── AttendanceTable.tsx    # Data table from report results
│   │   ├── ExportButtons.tsx      # CSV + Excel + PDF
│   │   └── AuditLogTable.tsx      # Audit trail with device/browser/IP/GPS
│   └── dashboard/
│       ├── AdminDashboard.tsx     # 6 stat cards + defaulter + heatmap + trend
│       ├── ProfessorDashboard.tsx # Stats + quick actions + calendar toggle
│       └── StudentDashboard.tsx   # 4 stat cards + recent + heatmap + trend + correction + calendar toggle
├── pages/
│   ├── Login.tsx                  # Login page layout
│   ├── Register.tsx               # Register page layout
│   ├── Dashboard.tsx              # Routes to role-specific dashboard
│   ├── Sessions.tsx               # Session list + create button
│   ├── Attendance.tsx             # Parses ?session= code → Validator
│   ├── Reports.tsx                # 3 tabs: Reports | Audit Trail | Corrections
│   ├── Settings.tsx               # Geofence configuration
│   ├── Users.tsx                  # User table + promote button (admin)
│   └── NotFound.tsx               # 404 page
└── public/
```

## 17. Package Dependencies

| Package | Purpose |
|---------|---------|
| react + react-dom | UI framework |
| react-router-dom | Routing + protected routes |
| @tanstack/react-query | Server state + caching + mutations |
| @supabase/supabase-js | Supabase client (auth + DB + functions) |
| react-hook-form + @hookform/resolvers + zod | Form validation |
| react-hot-toast | Toast notifications |
| lucide-react | Icons |
| tailwindcss + postcss + autoprefixer | CSS utility framework |
| xlsx (SheetJS) | Excel export |
| jspdf + jspdf-autotable | PDF export |
| recharts | Charts (heatmap + trend bars) |
| date-fns | Date manipulation |

## 18. Supabase Configuration

### 18.1 Edge Function
- **Name**: `validate-attendance`
- **Runtime**: Deno
- **Environment**: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (auto-injected)
- **Deploy**: Copy code to Dashboard → Edge Functions → validate-attendance → Deploy

### 18.2 Auth Settings
- **Providers**: Email + Password only (no OAuth)
- **Security**: Disable signup from dashboard if only admin should create users
- **Session**: Persistent (stay logged in across tab closes)

### 18.3 Initial Setup SQL
```sql
-- Insert default geofence settings
INSERT INTO college_settings (college_name, latitude, longitude, geofence_radius_meters)
VALUES ('My College', 11.0168, 76.9558, 200)
ON CONFLICT DO NOTHING;

-- Set first admin
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

## 19. Testing Flow

### 19.1 Complete Test Scenario

**Step 1: Setup**
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@test.edu';
```

**Step 2: Admin promotes professor**
1. Login as admin@test.edu
2. Click **Users** in sidebar
3. Find prof@test.edu → click "Promote to Professor"

**Step 3: Professor creates session**
1. Login as prof@test.edu
2. Click **Sessions** → **Create Session**
3. Set Date = today, Start Time = 5 min ago, End Time = 1 hour later
4. Click **Copy Link**

**Step 4: Student marks attendance**
1. Open incognito/private window
2. Login as student@test.edu
3. Paste the copied link in URL bar
4. Allow location when prompted
5. Click **Mark Attendance**
6. See "Attendance Marked!" success

**Step 5: Verify**
- Admin dashboard: Present Today = 1, Absent Today = rest
- Student dashboard: Shows "Present Today", attendance % updated
- Reports: Click Daily → see student name + roll number + status

**Step 6: Check Audit Trail**
- Reports → Audit Trail tab → see the record with device info, browser, IP

**Step 7: Professor uses Calendar**
- Dashboard → Show Calendar → click today → see student row → toggle status

**Step 8: Student uses Calendar + Correction**
- Dashboard → Show Calendar → see green for today
- Click absent day (or click Request Correction) → submit reason
- Professor sees in Reports → Corrections tab → Approve

**Step 9: Export**
- On Reports page, click CSV → opens CSV file
- Click Excel → downloads .xlsx
- Click PDF → downloads .pdf

### 19.2 Notifications
- Correction approve/reject shows success toast
- Attendance mark shows success/failure toast
- All mutations show toast feedback

### 19.3 Error Handling
- Duplicate attendance → "Attendance already marked for today"
- Expired session → "Attendance Session Expired"
- Outside geofence → "You are Xm away (max: Ym)"
- Wrong session code → "Session Not Found"
- No session on date for professor calendar → "No session exists for this date. Create a session first."

## 20. Security Summary

| Security Feature | Implementation |
|-----------------|----------------|
| Authentication | Supabase Auth (email/password) |
| Row Level Security | All 7 tables have RLS enabled |
| Role-based access | Protected routes + RLS policies per role |
| One attendance per day | DB unique index + Edge Function check |
| Geofence enforcement | Client GPS + backend Haversine |
| Session expiry | Time window check (frontend) |
| CSRF protection | Supabase JWT tokens |
| XSS protection | React's built-in escaping |
| SQL injection | Supabase parameterized queries |
| No direct role change | Registration hardcoded to 'student' |
| SECURITY DEFINER bypass | RLS helper functions avoid recursion |
| Correction approval authority | Only professors/admins can approve via SECURITY DEFINER RPC |

## 21. Database Migrations

### 001_schema.sql
Creates everything: ENUMs, tables (profiles, attendance_sessions, attendance_records, college_settings), triggers (handle_new_user, updated_at), all indexes, initial RLS policies, is_admin()/is_professor() helper functions.

### 002_remove_department_semester_title.sql
Removes unused columns: title, department, semester from attendance_sessions; department, semester from profiles.

### 003_attendance_features.sql
Creates additional tables: attendance_audit_logs (audit trail with auto-population trigger from user_agent), attendance_summary (pre-calculated percentages with auto-update trigger), attendance_correction_requests (student correction flow). Adds RLS policies for all three tables. Creates approve_correction_request() and reject_correction_request() SECURITY DEFINER functions.

### 004_correction_date.sql
Adds `date` column (DATE, nullable) to attendance_correction_requests. Makes session_id nullable. Updates approve_correction_request() to handle date-based corrections (looks up session for that date, UPSERTs attendance_records on conflict).

## 22. Commands Reference

```bash
# Development
npm run dev                    # Start Vite dev server

# Build
npm run build                  # TypeScript check (tsc -b) + Vite production build

# Type check only
npx tsc --noEmit              # TypeScript check without emitting

# Install dependencies
npm install                   # Install all packages from package.json

# Deploy Edge Function
# Via Dashboard: copy validate-attendance/index.ts → Supabase Edge Functions → Deploy

# SQL Queries
# Run in Supabase Dashboard → SQL Editor
# Run migrations in order: 001 → 002 → 003 → 004

# View all current policies
SELECT * FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

# View all tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
```

## 23. File Summary

| File | Lines | Purpose |
|------|-------|---------|
| src/App.tsx | ~85 | Root component with routing (all pages + protected routes) |
| src/contexts/AuthContext.tsx | ~109 | Auth state management (signIn, signUp, signOut, refreshProfile) |
| src/lib/supabase.ts | ~14 | Supabase client initialization |
| src/lib/utils.ts | ~95 | Utility functions (Haversine, session code, formatting) |
| src/hooks/useSessions.ts | ~90 | Session CRUD operations |
| src/hooks/useAttendance.ts | ~130 | Attendance marking + geofence + records queries |
| src/hooks/useReports.ts | ~110 | Reports + dashboard stats + defaulter + student summary |
| src/hooks/useAuditLogs.ts | ~35 | Audit log query hooks |
| src/hooks/useCorrectionRequests.ts | ~140 | Correction requests CRUD + approve/reject RPC |
| src/hooks/useAnalytics.ts | ~65 | Heatmap (12-month) + trend (30-day) queries |
| src/components/attendance/AttendanceCalendar.tsx | ~156 | Reusable month grid calendar with DayStatus, CalendarNavigator |
| src/components/attendance/ProfessorCalendarView.tsx | ~170 | Professor calendar with per-student present/absent toggle |
| src/components/attendance/StudentCalendarView.tsx | ~120 | Student calendar with correction request on absent click |
| src/components/attendance/CorrectionRequestModal.tsx | ~50 | Modal form: date + reason + submit |
| src/components/analytics/AttendanceHeatmap.tsx | ~80 | 12-month bar chart (Recharts) |
| src/components/analytics/AttendanceTrend.tsx | ~80 | 30-day bar chart (Recharts) |
| src/components/analytics/DefaulterWidget.tsx | ~60 | List of students below 75% |
| src/components/reports/AuditLogTable.tsx | ~80 | Audit trail table with device/browser/IP/GPS columns |
| src/components/dashboard/ProfessorDashboard.tsx | ~80 | Stats + quick actions + calendar toggle |
| src/components/dashboard/StudentDashboard.tsx | ~130 | Stats + recent + analytics + correction + calendar toggle |
| supabase/migrations/001_schema.sql | ~280 | Full database schema |
| supabase/migrations/002_remove_department_semester_title.sql | ~12 | Cleanup migration |
| supabase/migrations/003_attendance_features.sql | ~247 | Audit + summary + corrections tables |
| supabase/migrations/004_correction_date.sql | ~50 | Date column + nullable session_id for corrections |
| supabase/functions/validate-attendance/index.ts | ~247 | Backend validation function |

**Total frontend components: ~35 components** across ui/, layout/, auth/, sessions/, attendance/, analytics/, reports/, dashboard/ directories.

**Total hooks: 7** (useAuth, useSessions, useAttendance, useReports, useAuditLogs, useCorrectionRequests, useAnalytics)

**Total pages: 9** (Login, Register, Dashboard, Sessions, Attendance, Reports, Settings, Users, NotFound)
