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
│  │  AuthContext (Supabase Auth)                                          │ │
│  ├──────────────────────────────────────────────────────────────────────┤ │
│  │  @supabase/supabase-js — Client                                       │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                           │                                                │
│                           ▼                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  7 Hooks: useSchedule, useAttendance, useReports, useAnalytics,      │ │
│  │  useAuditLogs, useCorrectionRequests, useHolidays                    │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │
┌──────────────────────────┴───────────────────────────────────────────────┐
│              Supabase Backend (Project: wdhjtfmwjwmaibpayuea)              │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL 15 — 8 tables, 12+ triggers, 6 SECURITY DEFINER RPCs     │ │
│  │  profiles | college_settings | attendance_schedule |                  │ │
│  │  attendance_records | attendance_audit_logs | attendance_summary |    │ │
│  │  attendance_correction_requests | holidays                            │ │
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

#### `attendance_schedule` — Class Schedule Dates
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK DEFAULT uuid_generate_v4() |
| date | DATE | NOT NULL UNIQUE |
| start_time | TIME | NOT NULL |
| end_time | TIME | NOT NULL |
| created_by | UUID | NOT NULL FK → profiles(id) |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

Constraint: `CHECK (start_time < end_time)`

#### `attendance_records` — Individual Marks (no session_id)
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK DEFAULT uuid_generate_v4() |
| student_id | UUID | NOT NULL FK → profiles(id) |
| marked_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| latitude | DOUBLE PRECISION | NOT NULL |
| longitude | DOUBLE PRECISION | NOT NULL |
| status | TEXT | NOT NULL DEFAULT 'present' (values: 'present', 'absent') |
| attendance_date | DATE | NOT NULL DEFAULT CURRENT_DATE |
| ip_address | TEXT | NULLABLE |
| user_agent | TEXT | NULLABLE |

Unique constraint:
- `unique_student_per_day` UNIQUE INDEX (student_id, attendance_date)

#### `attendance_audit_logs` — Audit Trail
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK DEFAULT uuid_generate_v4() |
| attendance_record_id | UUID | FK → attendance_records(id) ON DELETE SET NULL |
| student_id | UUID | NOT NULL FK → profiles(id) |
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
| date | DATE | NULLABLE |
| reason | TEXT | NOT NULL |
| status | TEXT | NOT NULL DEFAULT 'pending' CHECK (IN 'pending','approved','rejected') |
| reviewed_by | UUID | FK → profiles(id) NULLABLE |
| reviewed_at | TIMESTAMPTZ | NULLABLE |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

#### `holidays` — Holiday Calendar
| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK DEFAULT uuid_generate_v4() |
| date | DATE | NOT NULL UNIQUE |
| reason | TEXT | NOT NULL |
| created_by | UUID | FK → profiles(id) NULLABLE |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

### 3.2 Indexes
- `idx_schedule_date` ON attendance_schedule(date)
- `idx_attendance_student` ON attendance_records(student_id)
- `idx_attendance_date` ON attendance_records(attendance_date)
- `idx_attendance_student_date` ON attendance_records(student_id, attendance_date)
- `unique_student_per_day` UNIQUE INDEX ON attendance_records(student_id, attendance_date)
- `idx_audit_student` ON attendance_audit_logs(student_id)
- `idx_audit_date` ON attendance_audit_logs(marked_at)
- `idx_summary_percentage` ON attendance_summary(percentage)
- `idx_correction_student` ON attendance_correction_requests(student_id)
- `idx_correction_status` ON attendance_correction_requests(status)

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
- UPSERTs attendance_records with status='present' (ON CONFLICT student_id, attendance_date DO UPDATE)

#### Correction Rejection Function
```sql
reject_correction_request(request_id UUID, reviewer_id UUID) → void
```
- Marks request as 'rejected'

#### `recalc_attendance_summary(p_student_id UUID)` → void
- Counts total schedule dates (WHERE date <= CURRENT_DATE) minus holidays overlapping schedule dates
- Counts present records for student
- UPSERTs into attendance_summary

### 3.5 Auto-Absent RPCs

#### `mark_today_attendance(p_latitude DOUBLE PRECISION, p_longitude DOUBLE PRECISION)` → JSONB
- Checks: authenticated as student, not a holiday, no duplicate record, geofence distance
- Inserts attendance_records with status='present', student_id = auth.uid(), attendance_date = CURRENT_DATE
- Returns success details or error JSONB

#### `expire_past_schedules()` → void
- Finds all past schedule dates (date < CURRENT_DATE OR (date = CURRENT_DATE AND end_time < NOW()))
- For each such date and each unmarked student, inserts `status='absent'` record
- Uses subquery + NOT EXISTS — no FOR loop
- Idempotent: ON CONFLICT (student_id, attendance_date) DO NOTHING

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

### 4.3 attendance_schedule
| Policy | Operation | Rule |
|--------|-----------|------|
| Anyone can read | SELECT | true |
| Admins and professors can create | INSERT | is_admin() OR is_professor() |
| Admins can delete | DELETE | is_admin() |

### 4.4 attendance_records
| Policy | Operation | Rule |
|--------|-----------|------|
| Students can view own | SELECT | student_id = auth.uid() |
| Admins can view all | SELECT | is_admin() |
| Students can insert own (mark) | INSERT | student_id = auth.uid() |
| Admins can update any | UPDATE | is_admin() |

### 4.5 attendance_audit_logs
| Policy | Operation | Rule |
|--------|-----------|------|
| Students can view own | SELECT | student_id = auth.uid() |
| Professors can view for their schedules | SELECT | EXISTS(schedule.created_by = auth.uid()) |
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
| Professors can view all | SELECT | is_professor() |
| Professors can update all | UPDATE | is_professor() |
| Admins can view all | SELECT | is_admin() |
| Admins can update all | UPDATE | is_admin() |

### 4.8 holidays
| Policy | Operation | Rule |
|--------|-----------|------|
| Anyone can read | SELECT | true |
| Professors and admins can insert | INSERT | is_professor() OR is_admin() |
| Professors and admins can delete | DELETE | is_professor() OR is_admin() |

## 5. Roles & Permissions

### 5.1 Admin
- Full access to everything
- View all users, promote students to professors (Users page)
- Configure geofence settings (Settings page)
- Manage class schedule (Sessions page)
- View all reports, audit trail, correction requests
- Export data (CSV, Excel, PDF)
- Only one admin exists (set via SQL, never via UI)

### 5.2 Professor
- Manage class schedule calendar (Sessions page)
- Set class dates/times on future days
- Delete schedule dates (removes attendance records for that date)
- Manage holidays (mark/unmark dates as holidays)
- View attendance records and reports
- Approve/reject correction requests
- View audit logs for their schedules

### 5.3 Student
- Register with email + password + roll number (auto-UPPERCASED full_name)
- Mark attendance via one-click card on Attendance page (geofence-gated)
- View own attendance history, percentage, heatmap, trend, streak, health gauge
- Submit correction requests for absent dates (only dates with explicit absent record)
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
Admin → **Users** page → "Promote to Professor" button on any student row

## 7. Schedule Management Flow

### 7.1 Calendar-Based Schedule (Sessions page)
1. Monthly calendar view — green = class day, red = holiday, white = none
2. Tap a future day to open action popup:
   - Set class time (start_time, end_time) → inserts into `attendance_schedule`
   - Toggle holiday → inserts/deletes from `holidays` table
3. Past days are dimmed and not clickable
4. Tap an existing green day to edit time or delete schedule
5. Deleting a schedule removes the schedule row AND all attendance_records for that date

### 7.2 Holiday Management
1. On a future day: tap → toggle holiday → inserts into `holidays` table
2. On an existing green day: tap → mark as holiday → both schedule + holiday set
3. Holiday exclusion: only holidays overlapping schedule dates are subtracted from total class count
4. When a holiday is marked mid-term, existing attendance records for that date are deleted

### 7.3 Auto-Expire on Page Mount
- `useAutoExpire()` runs on mount of Attendance page and StudentDashboard
- Calls `expire_past_schedules()` RPC — idempotent, safe to call multiple times
- Creates `absent` records for any past schedule dates where student has no record

## 8. Attendance Marking Flow

### 8.1 One-Day Attendance Card (Attendance page)
1. Navigate to `/attendance` — no session code, no picker
2. Auto-expire check runs on mount
3. **States** (single card):
   - **Holiday**: Shows "Today is a holiday" message
   - **Already present**: Green "Present ✓" with timestamp
   - **Already absent**: "Marked Absent" with correction request button
   - **Not yet marked**: Shows geofence check + Mark Attendance button
4. Geofence checked client-side via `checkGeofence()` before enabling button
5. Mark button calls `mark_today_attendance` RPC directly (no Edge Function)

### 8.2 Mark Attendance RPC: mark_today_attendance
- **Called by**: `useMarkAttendance` mutation
- **Validation chain** (inside RPC):
  1. Auth check → student role
  2. Holiday check → is date in `holidays` table?
  3. Duplicate check → existing record for student + today?
  4. Geofence check → Haversine distance vs college_settings radius
  5. Schedule check → is there a schedule entry for today?
  6. On pass → INSERT into attendance_records with provided lat/lng

- **Return**: JSONB with `{ success: true }` or `{ error: 'reason' }`

### 8.3 Haversine Formula (both client + server RPC)
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
- RPC checks before insert (returns error)
- Duplicate `present` or `absent` records cannot exist for same date+student

## 9. Dashboards

### 9.1 Admin Dashboard (AdminDashboard.tsx)
- **6 KPI cards** (all clickable → navigate to relevant pages):
  - Total Students → /users
  - Present Today → /attendance
  - Absent Today → /attendance
  - Attendance % → /reports
  - Scheduled Today → /sessions
  - Defaulters <75% → /reports
- **TrendChart**: 90-day area chart (Recharts) with gradient fill, custom tooltip
- **RecentActivityFeed**: Timeline of recent attendance marks
- **ContributionHeatmap**: GitHub-style full-year grid
- **Defaulters panel**: Scrollable list with names, roll numbers, percentage badges

### 9.2 Professor Dashboard (ProfessorDashboard.tsx)
- **4 KPI cards** (all clickable):
  - Present Today → /attendance
  - Absent Today → /attendance
  - Pending Corrections → /reports?tab=corrections
  - Scheduled Today → /sessions
- **TrendChart**: 30-day area chart
- **RecentActivityFeed**: Attendance marking timeline
- **"Manage Schedule"** button → /sessions

### 9.3 Student Dashboard (StudentDashboard.tsx)
- **ProgressRing**: SVG ring showing overall attendance % (animated fill via framer-motion)
- **3 KPI cards** (all clickable):
  - Present Days → /attendance
  - Absent Days → opens correction modal
  - Pending Corrections → /reports
- **TrendChart**: 90-day area chart
- **TodayStatus**: Current day's attendance status card
- **StreakCard**: Current + longest attendance streak
- **ContributionHeatmap**: Full-year activity grid
- **HealthGauge**: SVG arc gauge with 4 levels
- **SummaryCard**: 4-grid stats (Total Classes, Present, Absent, Corrections)
- **CorrectionWidget**: Pending/Approved/Rejected breakdown
- **RecentActivityFeed**: Personal attendance timeline
- **Recent Absences**: List of absent dates with "Request Correction" buttons (only for dates with explicit absent record)
- **Mark Attendance** button → /attendance

## 10. Premium Analytics Components

| Component | Description | Data Source |
|-----------|-------------|-------------|
| **ContributionHeatmap** | GitHub-style full-year day grid | `useAttendanceTrend` + schedule comparison |
| **TrendChart** | Recharts AreaChart with gradient fill, 30/90-day | `useAttendanceTrend` |
| **HealthGauge** | SVG semicircular arc gauge with 4 levels | Live percentage |
| **StreakCard** | Current + longest consecutive present-day streak | Computed from `useAttendanceTrend` |
| **TodayStatus** | Card showing today's present/absent/not-marked | `useTodayAttendance` |
| **SummaryCard** | 2×2 grid: Total Classes, Present, Absent, Corrections | `useStudentSummary` + `useMyCorrectionRequests` |
| **ActivityFeed** | Color-coded timeline | `useAttendanceRecords` |
| **CorrectionWidget** | 3-column widget: Pending/Approved/Rejected counts | `useMyCorrectionRequests` |

## 11. Correction Request Flow

### 11.1 Student Requests Correction
1. From StudentDashboard → click absent day in Recent Absences section
2. `CorrectionRequestModal` opens with date pre-selected
3. Student types reason, submits → INSERT into `attendance_correction_requests`
4. **Only allowed** for dates with an explicit `status='absent'` record in attendance_records

### 11.2 Professor Reviews Request
1. From Reports page → Corrections tab → sees pending requests
2. Each card: student name, reason, date, Approve/Reject buttons
3. Approve → calls `approve_correction_request(request_id, reviewer_id)` RPC
4. Reject → calls `reject_correction_request(request_id, reviewer_id)` RPC
5. On approve: attendance_records UPSERTed with status='present'
6. Triggers audit log + summary recalculation

### 11.3 Database-Level Logic
- `approve_correction_request()` is SECURITY DEFINER
- UPSERTs (student_id, attendance_date) with status='present'

## 12. Reports & Export

### 12.1 Reports Page
- **Date range presets**: Daily, Weekly, Monthly, Yearly, Custom Range
- **Search**: By student name or roll number
- **Student filter**: Dropdown of all students
- **Sortable columns**: Student, Date, Status, Time
- **3 tabs**: Reports | Audit Trail | Corrections

### 12.2 Export Formats
| Format | Library | Notes |
|--------|---------|-------|
| CSV | Native Blob | `.csv` download |
| Excel | xlsx (SheetJS) | `.xlsx` download |
| PDF | jsPDF + jspdf-autotable | `.pdf` download |

### 12.3 Audit Logs (AuditLogTable)
- Columns: Date & Time, Student, Roll No, Status, Device, Browser, IP, GPS
- Auto-populated via `log_attendance_audit` trigger on INSERT to attendance_records
- Role-filtered: students see own, professors see all, admins see all

### 12.4 Defaulters
- Students with attendance < 75%
- Listed in AdminDashboard and accessible via `useDefaulters` hook
- Queries `attendance_summary` table (pre-calculated)

## 13. User Management

### 13.1 Users Page (Admin Only)
- Table: Name, Email, Role (badge), Actions
- Student rows: "Promote to Professor" button
- Professor rows: shows "—"
- Admin rows: shows "System Admin" shield badge

### 13.2 Registration
- No role selector — everyone is student by default
- Professor accounts created via admin promotion
- Admin accounts via direct SQL UPDATE

## 14. Enterprise SaaS UI Theme

### 14.1 Design System (tailwind.config.js)
- **Primary blue**: `#1657C5` with 50-900 scale
- **Canvas background**: `#F5F6F8`
- **Text**: `#111827` (primary), `#6B7280` (secondary), `#9CA3AF` (meta)
- **Font**: Inter (300-800 weights)
- **Border radius**: `16px` (default), `10px` (btn), `16px` (card)
- **Shadows**: card, card-hover, dropdown, modal, sidebar, header, kpi-card, button

### 14.2 Animations (index.css + tailwind)
- `fade-in`, `fade-in-up`, `slide-in-left`, `slide-in-right`, `scale-in`
- `progress-fill` (width animation), `count-up`, `shimmer` (skeleton loading)
- Custom scrollbar: 6px, rounded, gray

### 14.3 UI Components
| Component | Features |
|-----------|----------|
| **Button** | Variants: primary, secondary, danger, ghost, outline; sizes: sm, md, lg; isLoading state; icon support |
| **Card** | CardHeader, CardTitle, CardContent, CardFooter; optional hover shadow |
| **Input** | Label, error, date/time/text/number types, SearchInput variant |
| **Select** | Label, error, options array |
| **Badge** | Variants: default, success, warning, danger, info |
| **Modal** | Overlay with backdrop, close button, title, animated scale-in |
| **Spinner** | SVG spinning circle; PageSpinner centered variant |
| **KpiCard** | Metric card with icon, label, value, color accent, onClick support (hover cursor/shadow); framer-motion staggered entrance |
| **ProgressRing** | SVG circular progress with center content area |
| **Tabs** | TabsList + TabsTrigger + TabsContent with transitions |

## 15. Frontend Structure

```
src/
├── main.tsx                         # Entry point
├── App.tsx                          # Routes + Providers
├── index.css                        # Tailwind imports + utility classes
├── vite-env.d.ts
├── types/
│   ├── index.ts                     # All TypeScript interfaces
│   └── declarations.d.ts            # Module declarations
├── contexts/
│   └── AuthContext.tsx               # Auth state, signIn/signUp/signOut, profile fetch
├── lib/
│   ├── supabase.ts                  # createClient with env vars
│   └── utils.ts                     # Haversine, formatting, cn(), date ranges
├── hooks/
│   ├── useSchedule.ts               # useSchedule, useUpcomingSchedule, useSetSchedule,
│   │                                # useRemoveSchedule, useAutoExpire
│   ├── useAttendance.ts             # useMyAttendance, useTodayAttendance,
│   │                                # checkGeofence, useMarkAttendance (calls RPC)
│   ├── useReports.ts                # useDashboardStats, useReportData, useStudents,
│   │                                # useStudentSummary, useDefaulters, useMyAbsentRecords
│   ├── useHolidays.ts               # useHolidays, useAddHoliday, useDeleteHoliday
│   ├── useAuditLogs.ts              # useAuditLogs with filters
│   ├── useCorrectionRequests.ts     # CRUD + usePendingCorrections + useApproveCorrection + useRejectCorrection
│   └── useAnalytics.ts              # useAttendanceHeatmap, useAttendanceTrend
├── components/
│   ├── ui/
│   │   ├── Button.tsx               # All variants + sizes + loading
│   │   ├── Card.tsx                 # Card + Header + Title + Content + Footer
│   │   ├── Input.tsx                # Input + SearchInput + label + error
│   │   ├── Select.tsx               # Select + label + error + options
│   │   ├── Badge.tsx                # default/success/warning/danger/info
│   │   ├── Modal.tsx                # Overlay + backdrop + close + title
│   │   ├── Spinner.tsx              # Spinner + PageSpinner
│   │   ├── Tabs.tsx                 # TabsList + TabsTrigger + TabsContent
│   │   ├── ProgressRing.tsx         # SVG circular progress indicator
│   │   └── KpiCard.tsx              # Animated metric card with onClick, cursor, hover
│   ├── layout/
│   │   ├── AppLayout.tsx            # Sidebar + Header + Outlet + BottomNav
│   │   ├── Sidebar.tsx              # Collapsible desktop sidebar + mobile overlay
│   │   ├── Header.tsx               # Sticky top bar with welcome + user info
│   │   └── ProtectedRoute.tsx       # Auth check + optional role filter
│   ├── auth/
│   │   ├── LoginForm.tsx            # Email + password + show/hide toggle
│   │   └── RegisterForm.tsx         # Name (auto-UPPERCASE) + email + password + roll
│   ├── attendance/
│   │   ├── GeofenceChecker.tsx      # GPS location + distance + retry
│   │   ├── CorrectionRequestModal.tsx # Date + reason form
│   │   ├── AttendanceCalendar.tsx   # Reusable month grid
│   │   ├── ProfessorCalendarView.tsx # Per-student present/absent toggle
│   │   └── StudentCalendarView.tsx  # Status badges + correction request on absent click
│   ├── analytics/
│   │   ├── ContributionHeatmap.tsx  # Full-year day grid (GitHub-style)
│   │   ├── TrendChart.tsx           # Area chart (Recharts) with gradient
│   │   ├── HealthGauge.tsx          # SVG semicircular arc gauge
│   │   ├── StreakCard.tsx           # Current + longest streak
│   │   ├── TodayStatus.tsx          # Today's present/absent/not-marked
│   │   ├── SummaryCard.tsx          # 4-grid attendance stats
│   │   ├── ActivityFeed.tsx         # Color-coded timeline
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
│   ├── Sessions.tsx                 # Calendar-based schedule management
│   ├── Attendance.tsx               # One-day attendance card (no session code)
│   ├── Reports.tsx                  # 3 tabs: Reports | Audit Trail | Corrections
│   ├── Settings.tsx                 # Geofence config (admin) + Holiday management
│   ├── Users.tsx                    # User table + promote (admin only)
│   └── NotFound.tsx                 # 404 page
└── public/
```

## 16. Package Dependencies

| Package | Purpose |
|---------|---------|
| react + react-dom | UI framework (18.x) |
| react-router-dom | SPA routing + protected routes |
| @tanstack/react-query | Server state, caching, mutations |
| @supabase/supabase-js | Supabase client (auth + DB) |
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

## 17. Supabase Configuration

### 17.1 Auth Settings
- **Providers**: Email + Password only (no OAuth/social)
- **Session**: Persistent (survives tab close)
- **Security**: Disable public signup if admin-only user creation desired

### 17.2 Required Dashboard SQL
```sql
-- Insert default geofence settings
INSERT INTO college_settings (college_name, latitude, longitude, geofence_radius_meters)
VALUES ('My College', 11.0168, 76.9558, 200)
ON CONFLICT DO NOTHING;

-- Set first admin
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';

-- Grant execute for RPCs
GRANT EXECUTE ON FUNCTION mark_today_attendance TO authenticated;
GRANT EXECUTE ON FUNCTION expire_past_schedules TO authenticated;
GRANT EXECUTE ON FUNCTION approve_correction_request TO authenticated;
GRANT EXECUTE ON FUNCTION reject_correction_request TO authenticated;
```

## 18. Complete Test Scenario

**Step 1: Setup**
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@test.edu';
```

**Step 2: Admin promotes professor**
Login as admin → Users → find prof@test.edu → "Promote to Professor"

**Step 3: Professor sets schedule**
Login as prof → Sessions → tap a future date → set start_time & end_time → green day appears

**Step 4: Student marks attendance**
Login as student → Attendance page → allow location → Mark Attendance

**Step 5: Verify**
- Admin dashboard: Present Today incremented
- Student dashboard: "Present" badge, percentage updated
- Reports: record visible with student name + roll + status

**Step 6: Check Audit Trail**
Login as admin → Reports → Audit Trail → see device, browser, IP, GPS

**Step 7: Test auto-absent**
- Navigate to a day after a scheduled date → `expire_past_schedules` on mount creates absent records
- Student dashboard shows absent date with correction request option

**Step 8: Test correction flow**
- Student → click absent day → Request Correction → submit reason
- Professor → Reports → Corrections tab → Approve/Reject

**Step 9: Test holidays**
- Professor → Sessions → tap future date → toggle holiday → date turns red
- Student Attendance page shows "Today is a holiday"
- Total class count excludes holiday

**Step 10: Test exports**
Reports → PDF/Excel/CSV → verify filtered data exports correctly

**Step 11: Verify absent calculation**
- Create 5 schedule dates over different days
- Mark student present for 3
- Student dashboard should show 60% (3/5), not 100% (3/3)

## 19. Migration Summary

| Migration | Changes |
|-----------|---------|
| **001_schema.sql** | ENUMs, all tables, RLS, triggers, helper functions, initial geofence insert |
| **002_remove_department_semester_title.sql** | Removes unused columns |
| **003_attendance_features.sql** | Adds audit_logs, summary, corrections tables + RLS + RPCs |
| **004_correction_date.sql** | Adds `date` column to corrections, makes session_id nullable |
| **005_fix_absent_logic.sql** | Fixes recalc to count sessions (not records) as total_classes denominator |
| **006_auto_absent.sql** | Adds expire_session_and_mark_absent + expire_all_past_sessions RPCs |
| **007_holidays.sql** | Creates holidays table |
| **008_one_day_attendance.sql** | `mark_today_attendance` RPC, nullable session_id |
| **009_schedule.sql** | `attendance_schedule` table, `expire_past_schedules` RPC, drop `attendance_sessions` |
| **010_cleanup.sql** | Drop session_id columns from attendance_records, correction_requests, audit_logs |

## 20. Security Summary

| Feature | Implementation |
|---------|---------------|
| Authentication | Supabase Auth (email/password) |
| Row Level Security | All 8 tables RLS-enabled with role-based policies |
| Role-based access | ProtectedRoute component + RLS per role |
| One attendance per day | DB unique index + RPC check |
| Geofence enforcement | Client GPS + server Haversine (RPC) |
| Session expiry | Auto-absent RPC on mount of Dashboard/Attendance pages |
| CSRF protection | Supabase JWT tokens |
| XSS protection | React's built-in escaping |
| SQL injection | Supabase parameterized queries |
| No direct role change | Registration hardcoded to 'student' |
| SECURITY DEFINER | Helper functions bypass RLS for admin operations |
| Correction approval | Only professors/admins can approve via SECURITY DEFINER RPC |

## 21. Deployment

### 21.1 Vercel (Recommended)
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

### 21.2 Commands Reference
```bash
npm run dev              # Vite dev server
npm run build            # tsc -b && vite build
npx tsc --noEmit         # TypeScript check only
npm install              # Install dependencies
```

### 21.3 Critical Deployment Steps
1. Apply all 10 migrations in order (001→010) via Supabase SQL Editor
2. Verify auto-absent: create schedule, let it expire, check absent records
3. Grant execute permissions for all RPCs to `authenticated` role

## 22. File Inventory

```
supabase/
├── migrations/
│   ├── 001_schema.sql
│   ├── 002_remove_department_semester_title.sql
│   ├── 003_attendance_features.sql
│   ├── 004_correction_date.sql
│   ├── 005_fix_absent_logic.sql
│   ├── 006_auto_absent.sql
│   ├── 007_holidays.sql
│   ├── 008_one_day_attendance.sql
│   ├── 009_schedule.sql
│   └── 010_cleanup.sql

src/
├── main.tsx
├── App.tsx
├── index.css
├── vite-env.d.ts
├── types/
│   ├── index.ts
│   └── declarations.d.ts
├── contexts/
│   └── AuthContext.tsx
├── lib/
│   ├── supabase.ts
│   └── utils.ts
├── hooks/
│   ├── useSchedule.ts
│   ├── useAttendance.ts
│   ├── useReports.ts
│   ├── useHolidays.ts
│   ├── useAuditLogs.ts
│   ├── useCorrectionRequests.ts
│   └── useAnalytics.ts
├── pages/
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── Sessions.tsx
│   ├── Attendance.tsx
│   ├── Reports.tsx
│   ├── Settings.tsx
│   ├── Users.tsx
│   └── NotFound.tsx
├── components/
│   ├── ui/ (10 files)
│   │   ├── Button.tsx, Card.tsx, Input.tsx, Select.tsx, Badge.tsx
│   │   ├── Modal.tsx, Spinner.tsx, Tabs.tsx, ProgressRing.tsx, KpiCard.tsx
│   ├── layout/ (4 files)
│   │   ├── AppLayout.tsx, Sidebar.tsx, Header.tsx, ProtectedRoute.tsx
│   ├── auth/ (2 files)
│   │   ├── LoginForm.tsx, RegisterForm.tsx
│   ├── attendance/ (5 files)
│   │   ├── GeofenceChecker.tsx, CorrectionRequestModal.tsx
│   │   ├── AttendanceCalendar.tsx, ProfessorCalendarView.tsx, StudentCalendarView.tsx
│   ├── analytics/ (12 files)
│   │   ├── ContributionHeatmap.tsx, TrendChart.tsx, HealthGauge.tsx, StreakCard.tsx
│   │   ├── TodayStatus.tsx, SummaryCard.tsx, ActivityFeed.tsx, CorrectionWidget.tsx
│   │   ├── AttendanceHeatmap.tsx, AttendanceTrend.tsx, DefaulterWidget.tsx, RiskPrediction.tsx
│   └── reports/ (4 files)
│       ├── AttendanceTable.tsx, AuditLogTable.tsx, ExportButtons.tsx, ReportFilters.tsx
└── dashboard/ (3 files)
    ├── AdminDashboard.tsx, ProfessorDashboard.tsx, StudentDashboard.tsx

Config files:
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── postcss.config.js
├── package.json
└── vercel.json
```

**Totals:**
- **68 files** across all directories
- **40 React components** (10 UI, 4 layout, 2 auth, 5 attendance, 12 analytics, 4 reports, 3 dashboards)
- **7 custom hooks** (useSchedule, useAttendance, useReports, useHolidays, useAuditLogs, useCorrectionRequests, useAnalytics)
- **9 pages** (Login, Register, Dashboard, Sessions, Attendance, Reports, Settings, Users, NotFound)
- **1 React context** (Auth)
- **10 SQL migrations** (no Edge Function)
