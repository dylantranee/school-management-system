# School Management System (SMS) User Stories

This document outlines the system requirements and specifications for the School Management System (SMS). The user stories are organized into 6 core business domains, designed for single-responsibility and complete test coverage with Gherkin-style Acceptance Criteria.

---

## Domain 1: Identity, Access & Session Management

### SMS-1: User Authentication & Session Security
**As a** User (Admin, Staff, or Student),  
**I want to** securely log in and log out of the system,  
**so that** my account and session are protected from unauthorized access.

#### Acceptance Criteria

**Scenario 1: Successful Authentication**
* **Given** a user is on the login screen and has an active account,
* **When** they submit a valid email and password,
* **Then** the backend must verify the credentials using bcrypt password hashing (enforcing a minimum cost factor of 10),
* **And** return a `200 OK` status,
* **And** set a secure JSON Web Token (JWT) inside an `HttpOnly`, `SameSite=Strict`, and `Secure` (in production) cookie,
* **And** the frontend must redirect the user to their role-specific dashboard.

**Scenario 2: Invalid Credentials & Obfuscated Errors**
* **Given** a user is on the login screen,
* **When** they submit an unregistered email or an incorrect password,
* **Then** the backend must return a `401 Unauthorized` status,
* **And** the frontend must display a generic "Invalid email or password" error message (obfuscating whether the email or password was the incorrect element).

**Scenario 3: Brute-Force Rate Limiting & Security Lockout**
* **Given** a user is on the login page,
* **When** they enter an incorrect password,
* **Then** the backend must increment `failed_login_attempts` by 1,
* **And** retrieve the global `MAX_FAILED_LOGIN_ATTEMPTS` setting (defaulting to 5) and `LOGIN_LOCKOUT_DURATION_MINUTES` setting (defaulting to 15),
* **And** if `failed_login_attempts` reaches or exceeds `MAX_FAILED_LOGIN_ATTEMPTS`, set the account `locked_until` timestamp to the configured minutes in the future,
* **And** the frontend must display an error: "Account locked due to too many failed attempts. Please try again later.",
* **And** any further login attempts within this window must be rejected immediately with a `423 Locked` status without validating the password.

**Scenario 4: Lockout Recovery by Admin**
* **Given** a user account is locked due to consecutive failures,
* **When** an Admin manually unlocks the account via the User Directory,
* **Then** the backend must reset `failed_login_attempts` to 0,
* **And** clear the `locked_until` timestamp,
* **And** allow the user to immediately attempt to authenticate again.

**Scenario 5: Attempt Login by Suspended Account**
* **Given** a user account has been deactivated (`is_active` set to false),
* **When** they attempt to log in with valid credentials,
* **Then** the backend must deny access and return a `403 Forbidden` status,
* **And** the frontend must display: "Your account is currently inactive. Please contact the administrator."

**Scenario 6: Input Normalization**
* **Given** a user is logging in,
* **When** they submit an email containing uppercase letters or leading/trailing spaces (e.g., `  User@School.Edu  `),
* **Then** the backend must trim the spaces and convert the email to lowercase before performing the database query, allowing successful authentication.

**Scenario 7: Successful Session Logout**
* **Given** a user is authenticated,
* **When** they click the "Logout" button,
* **Then** the frontend must request `POST /auth/logout`,
* **And** the backend must respond with a `Set-Cookie` header that expires the JWT cookie (Max-Age=0),
* **And** blacklist the active JTI (token identifier) in the cache/database for the duration of the token's remaining lifespan to prevent token reuse,
* **And** the frontend must clear local user state, broadcast a storage event to synchronize logout across other active browser tabs, and redirect to the login screen.

**Scenario 8: Token Expiration and Session Revocation**
* **Given** a user is logged into the dashboard but has been inactive long enough for their JWT to expire,
* **When** they attempt to perform any dashboard action (sending an API request),
* **Then** the backend must return a `401 Unauthorized` status with a token-expired payload,
* **And** the frontend global interceptor must capture this, clear local user state, and redirect to the login page with a message: "Your session has expired. Please log in again."

**Scenario 9: IP-Based Rate Limiting on Login (Credential Stuffing Protection)**
* **Given** the login endpoint is active,
* **When** a single client IP address makes more than 10 login requests within a 60-second window,
* **Then** the backend must temporarily block further login requests from that IP address,
* **And** return a `429 Too Many Requests` status with an error message: "Too many login attempts from this IP address. Please try again after 60 seconds."

**Scenario 10: Automatic Blacklist Cleanup**
* **Given** token JTIs are blacklisted in the cache/database upon logout,
* **When** a blacklisted token's original expiration timestamp is reached,
* **Then** the system must automatically prune and delete the expired JTI from the blacklist to prevent database/cache storage growth.

---

### SMS-2: Password Recovery & Account Activation
**As a** User (Admin, Staff, or Student),  
**I want to** reset my forgotten password or activate my new account,  
**so that** I can securely establish my credentials without admin pre-determination.

#### Acceptance Criteria

**Scenario 1: Request Password Reset & Rate Limiting**
* **Given** an active user has forgotten their password,
* **When** they click "Forgot Password" and submit their email address,
* **Then** the backend must generate a cryptographically secure, single-use reset token valid for 15 minutes,
* **And** send a password-reset link containing this token to their email,
* **And** enforce a rate limit of 3 forgot-password requests per hour per email/IP address (returning a `429 Too Many Requests` status if exceeded),
* **And** return a generic success message: "If this email is registered, you will receive a reset link." (to prevent email enumeration).

**Scenario 2: Reset Password with Valid Token**
* **Given** a user clicks on the reset password link,
* **When** they submit a new password meeting complexity rules (8+ characters, 1 number, 1 special character),
* **Then** the backend must validate that the token is unexpired and unused,
* **And** verify that the new password does not match the user's current password (returning a `400 Bad Request` if it does),
* **And** update the hashed password in the database,
* **And** mark the token as used,
* **And** invalidate all other active sessions/tokens for this user to ensure account security,
* **And** clear any active account lockouts (resetting `failed_login_attempts` to 0 and setting `locked_until` to null).

**Scenario 3: Account Onboarding Activation**
* **Given** a newly onboarded user has a status of `pending_activation` (represented by the user record having `is_active = false` and no password hash set yet),
* **When** they visit their secure, tokenized activation link and set their initial password,
* **Then** the backend must validate that the onboarding token is valid and unexpired (onboarding tokens are valid for 72 hours from generation),
* **And** validate the password complexity,
* **And** update the password hash,
* **And** transition the account status to active (setting `is_active = true`),
* **And** allow the user to log in.

**Scenario 4: Expired or Reused Token Rejection**
* **Given** a user attempts to activate an account or reset a password,
* **When** they submit a token that is expired, has already been used, or (for account activation) is linked to a user account that has already been set to `is_active = true`,
* **Then** the backend must reject the request with a `400 Bad Request` status,
* **And** the frontend must display an error: "This link is expired or invalid. Please request a new one."

**Scenario 5: Secure Token Storage**
* **Given** a password reset or onboarding activation token is generated,
* **When** the backend saves the token to the database,
* **Then** the backend must store a cryptographically secure hash of the token (e.g., SHA-256) instead of the plain-text token,
* **And** verify the token by hashing the client-provided token and comparing it against the stored database hash.

---

### SMS-3: User Account Directory (Admin)
**As an** Admin,  
**I want to** view and manage base user accounts,  
**so that** I can supervise access, search for users, and prevent duplicate registration.

#### Acceptance Criteria

**Scenario 1: Paginated User Listing**
* **Given** an Admin is authenticated,
* **When** they request the user list with parameters (e.g., `page=1`, `limit=20`),
* **Then** the backend must return the current page of users along with pagination metadata (`totalCount`, `totalPages`, `currentPage`).

**Scenario 2: Filter and Search Directory**
* **Given** an Admin is viewing the user list,
* **When** they filter by role (Admin, Staff, Student), status (Active where `is_active = true`; Inactive where `is_active = false` and password is set; Pending where `is_active = false` and password is not set), or search by email,
* **Then** the system must return a filtered list matching all criteria simultaneously.

**Scenario 3: Create Base User Account**
* **Given** an Admin is creating a user account,
* **When** they submit an email and select a role,
* **Then** the system must verify the email is unique (case-insensitive check),
* **And** create the user with `is_active = false` (representing the `pending_activation` state),
* **And** return a `201 Created` status with the generated onboarding link/token,
* **And** reject the request with a `409 Conflict` if the email is already in use.

**Scenario 4: Role Mutation Safeguards**
* **Given** a User account is linked to an active `Staff` or `Student` profile,
* **When** an Admin attempts to change that User's role to a different role,
* **Then** the backend must reject the update with a `409 Conflict` status, requiring the Admin to delete or unlink the associated profile first to prevent orphaned profile records.

**Scenario 5: User Account Deactivation/Suspension by Admin**
* **Given** an Admin is viewing a User's account in the directory,
* **When** they request to deactivate the User account,
* **Then** the backend must set `is_active = false` on the User record,
* **And** immediately invalidate and clear all active JWT session tokens for that user, preventing further API access.

**Scenario 6: Admin Self-Harm Guardrails**
* **Given** an Admin is logged in,
* **When** they attempt to deactivate their own account, change their own role, or delete their own user account,
* **Then** the backend must reject the request with a `400 Bad Request` status and return a message: "Self-deactivation, self-demotion, or self-deletion is not permitted."

**Scenario 7: User Account Hard Deletion Cascade**
* **Given** a Student or Staff profile is hard-deleted from the database,
* **When** the deletion transaction runs,
* **Then** the backend must hard-delete the corresponding base User record in the same database transaction.

**Scenario 8: Onboarding Token Resending**
* **Given** a User account is in the pending activation state,
* **When** an Admin requests to resend the onboarding activation link,
* **Then** the backend must invalidate any existing onboarding token for that user,
* **And** generate a new secure activation token valid for 72 hours,
* **And** return a `200 OK` status with the new token or trigger an automated email dispatch containing the new link.

**Scenario 9: Administrative Action Audit Logging**
* **Given** an Admin performs a mutating action in the User Directory (creating a user, deactivating/reactivating an account, changing a role, manually unlocking a user, or resending onboarding tokens),
* **When** the database update is committed,
* **Then** the backend must write an entry to the `Audit_Log` containing the Admin's user ID, target user ID, action name, old and new values, client IP address, and timestamp.

---

## Domain 2: Profile & Directory Management

### SMS-4: Personal Profile & Security Settings
**As a** User,  
**I want to** view my profile details and update my security credentials,  
**so that** my personal information is accurate and secure.

#### Acceptance Criteria

**Scenario 1: View Personal Details**
* **Given** an authenticated user is logged in,
* **When** they request their profile page data,
* **Then** the system must return their account details (email, role, status) along with their linked profile details (Staff details if staff; Student details if student),
* **And** reject the request with a `403 Forbidden` status if they attempt to query details for any other user's ID.

**Scenario 2: Change Password from Profile**
* **Given** a user is logged in,
* **When** they submit their current password and a new password,
* **Then** the backend must verify the current password,
* **And** validate the new password complexity (8+ chars, 1 number, 1 special character),
* **And** verify that the new password does not match the current password (returning a `400 Bad Request` if it does),
* **And** save the new password hash,
* **And** invalidate all other active sessions for the user to prevent unauthorized access.

**Scenario 3: Immutable Core Profile Fields**
* **Given** a user is editing their profile details,
* **When** they attempt to modify read-only fields (`email`, `role`, `student_code`, `employee_code`),
* **Then** the backend must reject the request and return a `400 Bad Request` status.

---

### SMS-5: Staff Directory & Profile Management
**As an** Admin,  
**I want to** manage staff profiles and departmental records,  
**so that** the school's employee directory is accurate and audit-compliant.

#### Acceptance Criteria

**Scenario 1: Link Staff Profile**
* **Given** a base User account with the 'Staff' role has been created,
* **When** the Admin submits a unique `employee_code` (trimmed and non-empty), `first_name`, `last_name`, `department`, and `hire_date` linked to that User,
* **Then** the backend must verify the base User account is not already linked to another staff profile (returning a `409 Conflict` if it is),
* **And** create the Staff profile, returning a `201 Created` status.

**Scenario 2: Unique Employee Code Enforcement**
* **Given** an Admin is creating or updating a Staff profile,
* **When** they submit an `employee_code` that is already assigned to another staff member,
* **Then** the backend must reject the payload and return a `409 Conflict` status.

**Scenario 3: Paginated Staff Directory and Filtering**
* **Given** an Admin is viewing the staff list,
* **When** they query the directory with search filters (name, employee code, department),
* **Then** the backend must return a paginated result containing only matching records.

**Scenario 4: Bulk Staff Import via CSV**
* **Given** an Admin uploads a CSV containing staff details,
* **When** the backend parses the file,
* **Then** it must execute the entire import inside a single parent database transaction (ensuring an all-or-nothing rollback for all rows),
* **And** check for duplicate emails or employee codes within the CSV file itself before database processing (returning a `400 Bad Request` list of duplicate errors if any are found),
* **And** check for employee code and email duplicates against existing database records,
* **And** create a base User account for each staff member with status `pending_activation`, generating a temporary password and a secure onboarding activation token,
* **And** create the corresponding Staff profile,
* **And** roll back all changes completely if any row fails validation (e.g. invalid email format, duplicate code), returning a `400 Bad Request` status with a list of specific row errors.

**Scenario 5: Soft Delete/Deactivation Consequence**
* **Given** a Staff member is teach-assigned to a course section,
* **When** an Admin deactivates their profile,
* **Then** the backend must set their user `is_active` status to false,
* **And** invalidate their active sessions,
* **And** keep historical assignments intact, but block them from being assigned to any new course sections.

**Scenario 6: Staff Deletion and Audit Integrity**
* **Given** a Staff member exists,
* **When** the Admin attempts to delete the Staff profile,
* **Then** the backend must check if the Staff member is currently assigned to teach any active course section in the current semester, rejecting the delete with a `409 Conflict` status if found,
* **Or** if they have historical teaching records OR salary records, perform a soft delete by deactivating their user account to preserve database audit history,
* **Or** if they have no historical teaching or salary records, perform a hard delete of the staff profile and their base user account from the database.

---

### SMS-6: Student Directory & Profile Management
**As an** Admin or Staff member,  
**I want to** view, search, and manage student profiles,  
**so that** learner directory records are accurate and searchable.

#### Acceptance Criteria

**Scenario 1: Link Student Profile**
* **Given** a base User account with the 'Student' role has been created,
* **When** the Admin submits a unique `student_code`, `first_name`, `last_name`, `class_level`, `enrollment_date`, and a valid `advisor_id` (referencing an active Staff member) linked to that User,
* **Then** the backend must verify the `advisor_id` exists and is active (returning a `400 Bad Request` if invalid or deactivated),
* **And** verify the base User account is not already linked to another student profile (returning a `409 Conflict` if it is),
* **And** create the Student profile, returning a `201 Created` status.

**Scenario 2: Advanced Multi-Criteria Search**
* **Given** an Admin or Staff member is on the Student directory page,
* **When** they submit a search query filtering by name/code, class level (year), and tuition fee status (Paid, Unpaid, Overdue) simultaneously,
* **Then** the backend must query the database matching all active filters and return the paginated list.

**Scenario 3: Bulk Student Import via CSV**
* **Given** an Admin uploads a student CSV import file,
* **When** the system runs the import,
* **Then** it must execute within a single parent database transaction (ensuring an all-or-nothing rollback for all rows),
* **And** check for duplicate emails or student codes within the CSV file itself before database processing (returning a `400 Bad Request` list of duplicate errors if any are found),
* **And** check for student code and email duplicates against existing database records,
* **And** create a base User account for each student with status `pending_activation`, generating a temporary password and a secure onboarding activation token,
* **And** create the corresponding Student profile,
* **And** roll back all changes completely if any row is invalid, returning a `400 Bad Request` status with a detailed row-by-row validation report.

**Scenario 4: Soft Delete & Financial Ledger Constraint**
* **Given** a Student has active or historical `Fee` records OR enrollment records in the system,
* **When** an Admin attempts to delete the student profile,
* **Then** the backend must reject hard deletion and return a `409 Conflict` status,
* **And** require a soft delete instead by setting the user's `is_active` status to false, which preserves financial audit and academic histories.

**Scenario 5: Academic Advisor Reassignment**
* **Given** a Student has active `pending` enrollment requests,
* **When** an Admin updates the Student's profile to assign a new `advisor_id`,
* **Then** the backend must verify that the new advisor exists in the `Staff` table and is active (`Users.is_active === true`), returning a `400 Bad Request` status if inactive or missing,
* **And** update the advisor reference in the Student record,
* **And** instantly transfer the approval/decline authorization for all active `pending` enrollments of that student to the new advisor.

---

## Domain 3: Curriculum & Classroom Allocation

### SMS-7: Subject Catalog Management
**As an** Admin,  
**I want to** configure curriculum subjects,  
**so that** courses can be officially offered and credits counted.

#### Acceptance Criteria

**Scenario 1: Create Catalog Subject**
* **Given** an Admin is configured on the Academic settings panel,
* **When** they submit a unique `subject_code`, `name`, and `credits` (an integer),
* **Then** the backend must query the global `MAX_SUBJECT_CREDITS` config (defaulting to 10),
* **And** save the subject and return a `201 Created` status if credits are between 1 and `MAX_SUBJECT_CREDITS` inclusive,
* **And** reject credit values outside this range or non-unique codes with a `400 Bad Request` status.

**Scenario 2: Modification Restrictions on Active Terms**
* **Given** a Subject is referenced by an active `Course_Section` in the current active semester,
* **When** an Admin attempts to edit its code or credits,
* **Then** the backend must block the edit and return a `409 Conflict` status to prevent altering active enrollment calculations.

**Scenario 3: Subject Deletion and Soft Delete**
* **Given** a Subject exists,
* **When** the Admin requests to delete the Subject,
* **Then** the backend must check if the Subject has historical or active course sections,
* **And** if it does, perform a soft delete by setting `is_active` to false, blocking scheduling of new sections while preserving transcripts,
* **Or** if it has zero associated course sections, perform a hard delete from the database.

**Scenario 4: Reactivate Soft-Deleted Subject**
* **Given** a Subject is soft-deleted (`is_active` is false),
* **When** the Admin requests to reactivate the Subject,
* **Then** the backend must set `is_active` to true,
* **And** allow new course sections to be scheduled for it again.

---

### SMS-8: Classroom & Infrastructure Allocation
**As an** Admin,  
**I want to** manage physical classrooms and labs,  
**so that** class scheduling matches room type and capacity.

#### Acceptance Criteria

**Scenario 1: Register Room**
* **Given** an Admin is on the Infrastructure page,
* **When** they submit a `room_number` (trimmed and non-empty), `capacity` (integer 1-250), and `is_lab` flag,
* **Then** the system must validate the fields, returning a `400 Bad Request` if bounds or formats are invalid,
* **And** save the room, enforcing unique room numbers (case-insensitive check) and returning `201 Created`.

**Scenario 2: Room Capacity and Lab Suitability Adjustments Check**
* **Given** an Admin is updating a Room's capacity or type,
* **When** they attempt to lower the capacity below the enrollment count OR below the `max_capacity` limit of any active course section scheduled in that room for the current semester,
* **Then** the backend must reject the update and return a `409 Conflict` status to prevent classroom over-enrollment,
* **Or When** they attempt to update `is_lab` to false for a room that currently hosts active schedule slots of any lab-requiring subject in the current semester,
* **Then** the backend must reject the update and return a `409 Conflict` status to prevent course lab suitability violations.

**Scenario 3: Room Maintenance Mode & Block**
* **Given** an Admin is placing a room into maintenance mode (`is_active` set to false),
* **When** there are active schedules using this room in the current semester,
* **Then** the backend must block the deactivation and return a `409 Conflict` status, displaying the list of affected course sections,
* **And** require the Admin to reschedule or delete those active schedule slots before the room can be successfully set to inactive.

---

## Domain 4: Course Delivery & Scheduling

### SMS-9: Manage Course Sections Offering
**As an** Admin,  
**I want to** establish course sections for subjects in active semesters,  
**so that** students can enroll in specific classes.

#### Acceptance Criteria

**Scenario 1: Create Course Section**
* **Given** an Admin is creating a class offering,
* **When** they select a Subject, a Staff member (Teacher), `semester` ('1', '2', or '3'), `academic_year` (between 1900 and 2100), `section_number` (trimmed and non-empty), and `max_capacity` (greater than 0),
* **Then** the backend must verify the Subject and Staff member exist and are active (`is_active` is true), returning `400 Bad Request` if either is inactive,
* **And** verify that the section's `max_capacity` does not exceed the global `MAX_ROOM_CAPACITY` setting (returning a `400 Bad Request` if it does),
* **And** verify that the selected `semester` and `academic_year` are greater than or equal to the system's current active semester and academic year settings, blocking creation of sections in past terms with a `400 Bad Request` status,
* **And** block duplicates of the same subject-semester-year-section code with a `409 Conflict` status,
* **And** create the section.

**Scenario 2: Capacity Reductions and Limits Check**
* **Given** an Admin is updating a course section,
* **When** they reduce the `max_capacity` below the number of students already enrolled (approved or pending),
* **Then** the backend must reject the request with a `409 Conflict` status,
* **Or When** they update the `max_capacity` to a value that exceeds the global `MAX_ROOM_CAPACITY` setting, OR attempt to set the `semester` or `academic_year` to a past term relative to current active configurations,
* **Then** the backend must reject the request with a `400 Bad Request` status.

**Scenario 3: Deletion Restrictions**
* **Given** a Course Section exists,
* **When** the Admin attempts to delete the section,
* **Then** the backend must verify if there are one or more registered students (pending or approved) and reject the deletion with a `409 Conflict` status if found,
* **Or** if no students are registered, delete the section along with all its scheduled time slots in a single transaction (Cascade Delete schedules).

**Scenario 4: Section Teacher Reassignment & Exclusions**
* **Given** a Course Section has scheduled time slots,
* **When** the Admin updates the Course Section to assign a new Staff member (Teacher),
* **Then** the backend must verify the new Teacher exists, is active, and has no overlapping teaching schedules in the database for the active semester (excluding schedules of this specific Course Section if the teacher remains unchanged),
* **And** reject the update with a `409 Conflict` status if a schedule overlap conflict is detected.

---

### SMS-10: Class Time & Room Scheduling
**As an** Admin,  
**I want to** schedule time slots and room allocations for course sections,  
**so that** room double-bookings and staff schedule overlaps are blocked.

#### Acceptance Criteria

**Scenario 1: Schedule Time Slot**
* **Given** a course section exists,
* **When** the Admin assigns a `day_of_week` (MON, TUE, etc.), `start_time` (HH:MM:SS), `end_time` (HH:MM:SS), and `room_id`,
* **Then** the backend must verify `start_time` is before `end_time`,
* **And** commit the schedule if no conflicts exist,
* **And** when updating an existing schedule, the conflict detection queries must exclude the current schedule ID to prevent self-conflict false positives.

**Scenario 2: Room Double-Booking Clash Block**
* **Given** Room A is scheduled on Monday from 09:00 to 11:00 in Semester 1 (2026),
* **When** the Admin attempts to assign Room A on Monday to another section in Semester 1 (2026) with overlapping times (e.g., 10:00 to 12:00),
* **Then** the backend must reject the schedule with a `409 Conflict` status,
* **But When** the Admin attempts to assign Room A on Monday to an overlapping time in Semester 2 (2026),
* **Then** the backend must allow the schedule to be committed.

**Scenario 3: Staff Double-Booking Clash Block**
* **Given** Teacher A is teaching a section scheduled on Tuesday from 13:00 to 15:00 in Semester 1 (2026),
* **When** the Admin attempts to schedule another section taught by Teacher A on Tuesday at an overlapping time (e.g., 14:00 to 16:00) in Semester 1 (2026),
* **Then** the backend must reject the schedule with a `409 Conflict` status,
* **But When** the Admin attempts to schedule Teacher A on Tuesday at an overlapping time in Semester 2 (2026),
* **Then** the backend must allow the schedule to be committed.

**Scenario 4: Classroom Lab Suitability Enforcement**
* **Given** a Subject requires a laboratory setting (`requires_lab` is true),
* **When** the Admin attempts to schedule a section of this subject in a Room where `is_lab` is false,
* **Then** the backend must reject the request and return a `400 Bad Request` status.

**Scenario 5: Classroom Capacity Fit Warning**
* **Given** Room A has a capacity of 30, and Course Section B has a `max_capacity` of 50,
* **When** the Admin attempts to allocate Room A to Course Section B,
* **Then** the backend must reject the request and return a `400 Bad Request` status to ensure classroom size fits the section's maximum possible enrollment.

**Scenario 6: Inactive Infrastructure, Subject, and Staff Safeguards**
* **Given** a Room has been marked as inactive/maintenance mode (`is_active` set to false), a Subject is inactive (`is_active` set to false), or the assigned Teacher of a Course Section is deactivated (`is_active` of their linked User profile is false),
* **When** the Admin attempts to schedule a new time slot in that Room, or for a section of that Subject or Teacher,
* **Then** the backend must reject the schedule creation or update and return a `400 Bad Request` status.

---

### SMS-11: Staff Class Schedule & Portal
**As a** Staff member,  
**I want to** view my teaching schedule and download my official timetable,  
**so that** I know when and where to teach and can print my schedule.

#### Acceptance Criteria

**Scenario 1: Assigned Course Offerings**
* **Given** a logged-in Staff member (Teacher),
* **When** they request their course list,
* **Then** the system must return only the course sections where they are assigned as the teacher for the current active semester.

**Scenario 2: Weekly Teaching Timetable Grid**
* **Given** a logged-in Staff member,
* **When** they view their schedule dashboard,
* **Then** the frontend must display a weekly grid layout displaying scheduled day, times, room numbers, and subject codes for all their assigned sections.

**Scenario 3: Timetable PDF Export and Access Rules**
* **Given** a user is requesting a Staff member's weekly timetable as a PDF,
* **When** they request the stream,
* **Then** the backend must verify the requester is either an Admin or the Staff owner,
* **And** reject the request with a `403 Forbidden` if they are a different user,
* **Or** generate and stream a structured timetable PDF.

**Scenario 4: Timetable Data Access Control**
* **Given** an authenticated user is requesting a Staff member's weekly timetable data via the API,
* **When** the request is received by the backend,
* **Then** the backend must verify the requester is either an Admin or the target Staff member,
* **And** reject the request and return a `403 Forbidden` status if they are unauthorized.

---

## Domain 5: Academic Enrollment

### SMS-12: Course Registration & Enrollment Compliance
**As a** Student,  
**I want to** register for courses that match my curriculum and calendar,  
**As an** Academic Advisor (Staff),  
**I want to** approve or decline pending student enrollments for my advisees,  
**so that** enrollment compliance and advisement guidelines are enforced.

#### Acceptance Criteria

**Scenario 1: Enrollment Request Submission**
* **Given** an active Student is logged in during the active registration window,
* **When** they submit a request to enroll in a Course Section,
* **Then** the system must execute the capacity checks, credit calculations, and registration creation inside a database transaction lock (e.g. select-for-update or serializable transaction) to prevent concurrent request race conditions,
* **And** verify the section is not at or above `max_capacity`,
* **And** verify the student is not already enrolled,
* **And** verify the additional credits do not push their semester credits over the `MAX_SEMESTER_CREDITS` config (e.g., 18 credits),
* **And** create a `Student_Enrollment` record with a status of `pending`.

**Scenario 2: Student Timetable Conflict Block**
* **Given** a student is enrolling in a section,
* **When** the section schedule overlaps with any of their currently approved or pending registrations,
* **Then** the backend must block enrollment and return a `409 Conflict` status.

**Scenario 3: Duplicate Subject Block**
* **Given** a student is enrolled in Section A of Subject "CS101",
* **When** they attempt to enroll in Section B of Subject "CS101" in the same semester,
* **Then** the backend must reject the enrollment and return a `409 Conflict` status.

**Scenario 4: Tuition Compliance Block (Overdue Fees)**
* **Given** a Student has one or more fee statements marked `overdue` (unpaid past due date),
* **When** they attempt to submit an enrollment request,
* **Then** the backend must block the registration and return a `402 Payment Required` status.
* **And** immediately lift this block once the outstanding fee balance is marked as `paid`.

**Scenario 5: Enrollment Decision Workflow Restricted to Academic Advisor**
* **Given** a Student has an assigned Academic Advisor (a Staff member),
* **When** a user attempts to approve or decline a pending student enrollment,
* **Then** the backend must verify the user is the Student's designated Academic Advisor,
* **And** reject the request with a `403 Forbidden` status if the requester is any other user (including the course teacher, administrators, or other staff members),
* **Or** update the enrollment status to `approving` (Approved) or `declining` (Declined) in the database,
* **And** adjust the course section's active enrollment counter accordingly if approved.
* **But Given** the Student does not currently have an assigned Academic Advisor (value is null),
* **When** an Admin attempts to approve or decline their pending student enrollment,
* **Then** the backend must permit the action as a fallback, updating the status and adjusting the counter.

**Scenario 6: Listing Advisee Pending Enrollments**
* **Given** an Academic Advisor (Staff) is logged in,
* **When** they request the list of pending student enrollments,
* **Then** the backend must query the database and return only pending enrollments for students whose assigned `advisor_id` matches the logged-in staff member's ID,
* **And** exclude any student enrollments for students assigned to other advisors.
* **And** if an Admin requests the list, return all pending student enrollments as a fallback.

**Scenario 7: Drop Course Section during Registration Window**
* **Given** a Student is logged in and has an active enrollment (pending or approved) in a course section,
* **When** they request to drop the course section,
* **Then** the backend must verify the current system date falls within the active registration window,
* **And** reject the request with a `400 Bad Request` status if submitted outside the active registration window dates,
* **Or** delete/remove the student's enrollment record from the database,
* **And** decrement the course section's active enrollment count,
* **And** trigger an automatic tuition recalculation to refund/credit the student's semester invoice.

---

### SMS-13: Student Personal Portal & Timetable
**As a** Student,  
**I want to** view my personal weekly timetable and export it as a PDF,  
**so that** I know my weekly schedule and can print it for reference.

#### Acceptance Criteria

**Scenario 1: Personal weekly timetable**
* **Given** a logged-in Student,
* **When** they request their weekly timetable page data,
* **Then** the backend must return schedules only for sections where the student's enrollment status is `approved` (`approving`),
* **And** if no approved enrollments exist, return an empty array,
* **And** the frontend must gracefully display a message: "No approved classes scheduled for this week. Please check your pending registrations."

**Scenario 2: Timetable PDF Export & Security**
* **Given** a user requests a student's timetable PDF stream,
* **When** the request is received,
* **Then** the backend must verify the requester is either an Admin, the Student owner, or the Student's designated Academic Advisor (Staff),
* **And** return a `403 Forbidden` if they are unauthorized,
* **Or** stream a structured schedule PDF containing the student's name, code, semester details, and schedule grid.

**Scenario 3: Timetable Data Access Control**
* **Given** an authenticated user is requesting a student's weekly timetable data via the API,
* **When** the request is received by the backend,
* **Then** the backend must verify the requester is either an Admin, the Student owner, or the Student's designated Academic Advisor (Staff),
* **And** reject the request and return a `403 Forbidden` status if they are unauthorized.

---

## Domain 6: Finances & Operations

### SMS-14: Student Tuition Billing & Payments
**As a** Student, **I want to** view my fee statements and submit payments,  
**As an** Admin, **I want to** generate bills and track tuition collections,  
**so that** the school's tuition collections are accurate and managed.

#### Acceptance Criteria

**Scenario 1: Term Billing Generation**
* **Given** an Admin initiates the billing run for the current semester,
* **When** the billing script executes,
* **Then** it must calculate fees for each student based on their approved enrollments (approved credits * cost-per-credit),
* **And** verify the student does not already have an invoice for the current active semester and academic year (skipping generation or returning a warning if it exists to prevent double-billing),
* **Or** create a `Fee` invoice for each student with status `unpaid` and a defined `due_date`.

**Scenario 2: Personal Fee Ledger**
* **Given** a logged-in Student,
* **When** they visit their financial portal,
* **Then** they must see all invoices showing amount due, amount paid, due date, and payment status (paid, unpaid, overdue).

**Scenario 3: Recording Payment Transaction**
* **Given** an Admin is recording a payment or a gateway webhook is received,
* **When** the payment details are submitted against an invoice,
* **Then** the backend must verify the gateway's cryptographic signature (if it is a webhook request) to prevent payment spoofing, rejecting invalid payloads with a `401 Unauthorized` status,
* **And** verify the payment amount does not exceed the outstanding balance (`amount_due - amount_paid`),
* **And** reject the request with a `400 Bad Request` status if an overpayment is submitted,
* **Or** record the payment by incrementing the invoice `amount_paid`,
* **And** set the invoice `updated_by` field to the operator's/gateway's user ID to serve as the transaction audit record,
* **And** set the status to `paid` if the outstanding balance is zero.

**Scenario 4: Automatic Overdue Status Transitions**
* **Given** a student fee statement is unpaid,
* **When** the daily system scheduler runs and the current date exceeds the invoice `due_date`,
* **Then** the system must update the invoice payment status to `overdue`.

**Scenario 5: Partial Payments**
* **Given** a student pays an amount less than the total outstanding balance,
* **When** the payment transaction is submitted,
* **Then** the system must record the transaction, increment `amount_paid`, keep the status as `unpaid` (or `overdue` if past due date), and display the remaining balance.

**Scenario 6: Billing Add/Drop Adjustments**
* **Given** a student drops a course section during the active registration window,
* **When** the drop is finalized,
* **Then** the system must automatically recalculate their tuition invoice for the semester, reducing the `amount_due` by the credit value of the dropped course,
* **And** if the student has already paid an amount that exceeds the new recalculated `amount_due`, keep the `amount_paid` intact, resulting in a negative outstanding balance that indicates an account credit to be manually refunded by admins.

**Scenario 7: Billing Operations Authorization**
* **Given** a user is logged in with the role of Staff or Student,
* **When** they attempt to trigger a semester billing run or record a payment transaction on any invoice,
* **Then** the backend must reject the request and return a `403 Forbidden` status.

---

### SMS-15: Staff Payroll & Payslip Management
**As a** Staff member, **I want to** view my salary statement history and download my payslip PDFs,  
**As an** Admin, **I want to** run monthly payroll and issue payslips,  
**so that** salary processing is correct and transparent.

#### Acceptance Criteria

**Scenario 1: Generate Monthly Payslip**
* **Given** an Admin is on the Payroll screen,
* **When** they submit `base_salary`, `allowances`, `deductions`, `payment_month`, and `payment_year` for a Staff member,
* **Then** the backend must verify that the input values for `base_salary`, `allowances`, and `deductions` are greater than or equal to zero (rejecting the request with a `400 Bad Request` if any input is negative),
* **And** compute `net_salary = base_salary + allowances - deductions`,
* **And** verify that the computed `net_salary` is greater than zero,
* **And** reject the request with a `400 Bad Request` status if the calculated net salary is zero or negative (due to excessive deductions),
* **Or** save the record in `Draft` status,
* **And** prevent duplicate entries for the same staff member and month with a `409 Conflict`.

**Scenario 2: Payslip Disbursal Workflow**
* **Given** salary records are in `Draft` status,
* **When** the Admin approves and disburses payroll,
* **Then** the status transitions to `disbursed`,
* **And** the payslips become visible to the respective Staff members in their portals.

**Scenario 3: Personal Salary Statements History**
* **Given** a logged-in Staff member,
* **When** they view their earnings portal,
* **Then** they must see a chronological list of their disbursed salary records,
* **And** the system must block access if they try to view another employee's salary history (`403 Forbidden`).

**Scenario 4: Payslip PDF Export & Security**
* **Given** a user requests a payslip PDF stream,
* **When** the request is processed,
* **Then** the backend must verify the requester is either an Admin or the Staff owner of the payslip,
* **And** return a `403 Forbidden` if they are unauthorized,
* **Or** generate and stream a formatted payslip PDF showing breakdown of earnings, deductions, and final net payout.

**Scenario 5: Payroll Administration Authorization**
* **Given** a user is logged in with the role of Staff or Student,
* **When** they attempt to generate a monthly payslip or disburse any payroll,
* **Then** the backend must reject the request and return a `403 Forbidden` status.

---

### SMS-16: Operational Health & Analytics Dashboard
**As an** Admin,  
**I want to** view aggregated analytics on students, staff, and tuition collections,  
**so that** I can assess the school's operational health at a glance.

#### Acceptance Criteria

**Scenario 1: Operational Health Metrics & Visual Charts for Active Term**
* **Given** an Admin is on the Dashboard,
* **When** they view the page,
* **Then** the backend must retrieve the active term settings (current semester and year),
* **And** query aggregates for the active term (total approved student enrollments, active staff, total active student records),
* **And** compute financial sums for the active term (total tuition due, amount paid, and outstanding overdue balances matching the current term),
* **And** return active enrollment counts grouped by subject for the current term,
* **And** the frontend must render interactive bar/pie charts representing these active term datasets.

**Scenario 2: Non-Admin Access Rejection**
* **Given** a user is logged in with the role of Staff or Student,
* **When** they request dashboard metrics,
* **Then** the backend must reject the request and return a `403 Forbidden` status.

**Scenario 3: Performance & Zero-Data Fallback**
* **Given** the system has no registered student, staff, or fee entries (fresh database),
* **When** the Admin accesses the dashboard,
* **Then** the backend metrics must return `0` values (not nulls or errors),
* **And** the frontend must gracefully display a "No data available to display" visual state instead of crashing.
* **And** the backend must compute metrics under 500ms using efficient indexes or caching.

---

### SMS-17: System Policy & Global Settings
**As an** Admin,  
**I want to** dynamically configure global limits and active school term parameters,  
**so that** school policies are enforced at runtime without restarting the server.

#### Acceptance Criteria

**Scenario 1: Dynamic Policies and Verification**
* **Given** an Admin is on the Settings panel,
* **When** they update limits (e.g. `MAX_FAILED_LOGIN_ATTEMPTS` between 1-20, `MAX_SEMESTER_CREDITS` between 1-30), change the global active term (`CURRENT_SEMESTER` '1', '2', or '3' and `CURRENT_ACADEMIC_YEAR`), or update the course registration window (`REGISTRATION_START_DATE` and `REGISTRATION_END_DATE`),
* **Then** the system must validate the input values conform to constraints,
* **And** verify that `REGISTRATION_START_DATE` is less than or equal to `REGISTRATION_END_DATE` in YYYY-MM-DD format (rejecting the save with a `400 Bad Request` if the start date falls after the end date),
* **And** save the changes to the database,
* **And** log the admin's user ID in the audit trail (`updated_by` metadata),
* **And** apply these policy changes instantly to all runtime validation filters.

**Scenario 2: Non-Admin Access Rejection**
* **Given** a user is logged in with the role of Staff or Student,
* **When** they attempt to read or modify the global configurations,
* **Then** the backend must reject the request and return a `403 Forbidden` status.

**Scenario 3: Unauthenticated Request Rejection**
* **Given** an anonymous user is not logged in,
* **When** they attempt to request or update the system settings,
* **Then** the backend must return a `401 Unauthorized` status.

**Scenario 4: Active Term Configuration & Historical Safeguards**
* **Given** the system contains historical grade records, fee invoices, and student schedules,
* **When** the Admin updates the `CURRENT_SEMESTER` or `CURRENT_ACADEMIC_YEAR` configs,
* **Then** the system must successfully apply this setting to all future course offerings and registrations,
* **And** must not alter, recalculate, or delete any historical or active student transcripts, tuition fee invoices, or timetables associated with previous semesters, preserving audit history integrity.
