# User Stories

## SMS-1 Secure login
**As a** User (Admin, Staff, or Student), **I want to** securely log in using my email and password, **so that** I can access my role-specific dashboard.

### Acceptance Criteria

**Scenario 1: Successful Authentication**
* **Given** a user is on the login screen and holds an active account,
* **When** they submit a valid email and password,
* **Then** the backend must verify the credentials against the hashed password,
* **And** return a 200 OK with a valid JWT token,
* **And** the frontend must redirect the user to their role-specific dashboard.

**Scenario 2: Invalid Credentials**
* **Given** a user is on the login screen,
* **When** they submit an unregistered email or incorrect password,
* **Then** the backend must return a 401 Unauthorized status,
* **And** the frontend must display an "Invalid credentials" error message without specifying whether the email or password was the incorrect element (for security).

**Scenario 3: Maximum Failed Login Attempts**
* **Given** a user is on the login page,
* **When** they enter an incorrect password for the 5th consecutive time,
* **Then** the backend must lock the account temporarily (e.g., for 15 minutes),
* **And** the frontend must display an error message: "Account locked due to too many failed attempts. Please try again later."

**Scenario 4: Login Attempt by Inactive User**
* **Given** a user with a suspended or inactive account status is on the login page,
* **When** they enter their valid email and password,
* **Then** the system must deny access,
* **And** the frontend must display: "Your account is currently inactive. Please contact the administrator."

**Scenario 5: Empty Fields Submission**
* **Given** the user is on the login page,
* **When** the user leaves the email or password field blank and clicks submit,
* **Then** the frontend must prevent the API call,
* **And** display validation errors on the respective empty fields (e.g., "Email is required").

**Scenario 6: Deep Link Redirection**
* **Given** an unauthenticated user attempts to access a protected route (e.g., /student-timetable),
* **When** they are redirected to the login page and successfully authenticate,
* **Then** the system should ideally redirect them back to their originally requested URL instead of the default dashboard.

---

## SMS-22 Secure logout
**As a** User (Admin, Staff, or Student), **I want to** securely log out of the system, **so that** my session is invalidated and unauthorized users cannot access my dashboard.

### Acceptance Criteria

**Scenario 1: Successful HttpOnly Logout**
* **Given** a user is currently authenticated and navigating their role-specific dashboard,
* **When** they click the "Logout" button,
* **Then** the frontend must send a request to POST `/auth/logout` (with credentials enabled),
* **And** the backend must respond with a `Set-Cookie` header that expires the JWT cookie (Max-Age=0),
* **And** the browser must automatically delete the cookie,
* **And** the frontend must clear its local user state and redirect to the public login screen.

**Scenario 2: Token Expiration Auto-Logout**
* **Given** a user is logged into the dashboard but has been inactive long enough for their JWT to expire,
* **When** they attempt to perform any action (which sends an API request),
* **Then** the backend must respond with a 401 Unauthorized,
* **And** the frontend must catch this 401 error globally via an Axios interceptor,
* **And** automatically clear the local user state,
* **And** redirect the user to the login page with a message: "Your session has expired. Please log in again."

**Scenario 3: Frontend-First Logout on Network Error**
* **Given** an authenticated user clicks the "Logout" button,
* **When** the network request to POST `/auth/logout` fails (e.g., timeout or 500 Server Error),
* **Then** the frontend must still clear the local user state and redirect to the login screen as a fail-safe.

---

## SMS-2 Admin creates user accounts
**As an** Admin, **I want to** create new user accounts and assign system roles, **so that** I can securely onboard new staff and students.

### Acceptance Criteria

**Scenario 1: Successful Account Creation**
* **Given** an Admin is authenticated and navigating the User Management interface,
* **When** they submit a valid email, password, and select a role (Admin, Staff, or Student),
* **Then** the backend must securely hash the password using Bcrypt,
* **And** generate a new id (UUID) for the user,
* **And** return a 201 Created status with the new user object.

**Scenario 2: Duplicate Email Prevention**
* **Given** an Admin is attempting to create a new user account,
* **When** they submit an email that already exists in the system database,
* **Then** the backend must return a 409 Conflict status,
* **And** the system must not create the account.

**Scenario 3: Weak Password Submission**
* **Given** an Admin is attempting to create a new user account,
* **When** they submit a password that fails to meet minimum complexity requirements (e.g., must be 8+ characters, include a number and a special character),
* **Then** the frontend must prevent the API call and display a validation error,
* **And** the backend must reject the payload with a 400 Bad Request if it bypasses the frontend.

**Scenario 4: Malformed Payload Submission**
* **Given** an Admin is on the User Creation form,
* **When** they leave a required field empty or input a malformed email address (e.g., admin.school.com),
* **Then** the frontend must display inline validation errors (e.g., "Please enter a valid email address"),
* **And** the backend must return a 400 Bad Request if the malformed data reaches the server.

**Scenario 5: Unrecognized Role Assignment**
* **Given** an Admin is creating a new user account,
* **When** the payload contains a role that is not part of the allowed enum (Admin, Staff, Student),
* **Then** the backend must reject the request and return a 400 Bad Request.
