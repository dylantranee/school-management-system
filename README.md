# Edusoft - Comprehensive School Management System

Edusoft is a production-grade, role-based School Management System (SMS) built to streamline administration and academic registry operations. It consolidates student course registrations, academic advising validations, dynamic schedule overlap checking, and automatic tuition ledger calculation into a unified single-page application (SPA).

---

## 1. Team Members & Roles
We developed this project as part of the **Web Application Development** course at International University (VNU-HCM):
* **Tran Anh Van (ITITWE22171)** - Backend Architect (Express REST APIs, relational MySQL design, transaction lock checks, security policy implementation, environment configuration, database seeding).
* **Nguyen Tran Minh Thu (ITITWE24025)** - Frontend Developer (React component hierarchy, React Query caching layer, interactive timetable layout, login workflow, responsive CSS grids).

---

## 2. Technology Stack & Versions
* **Frontend**: React 18, Vite 5, TypeScript 5, Tailwind CSS 3, TanStack Query (React Query) v5.
* **Backend**: Node.js v18+, Express 4, TypeScript 5, Prisma ORM v5.
* **Database**: MySQL v8.0+.
* **Package Manager**: pnpm workspace configurations.

---

## 3. Prerequisites
Ensure you have the following installed on your local development environment:
* **Node.js**: `v18.x` or `v20.x`
* **MySQL**: `v8.0` or later (running database instance)
* **pnpm**: `v8.x` or `v9.x` (global install via `npm i -g pnpm`)

---

## 4. Setup Instructions

### Step 1: Clone and Install Dependencies
Install all workspace dependencies from the root directory using pnpm:
```bash
git clone https://github.com/dylantranee/school-management-system.git
cd school-management-system
pnpm install
```

### Step 2: Set Up Database Schema & Seeds
1. Ensure your local MySQL server is running and create an empty database (e.g. `school_management`).
2. Run database migration pushes and apply seed data from the root:
```bash
# Push schema representation
pnpm --filter backend exec prisma db push

# Import seed script
mysql -u [your_mysql_username] -p school_management < seed-data_v2.sql
```

---

## 5. Environment Variables
Create the configuration environment files in the respective workspaces:

### Backend Configuration (`backend/.env`)
```env
PORT=3000
DATABASE_URL="mysql://your_username:your_password@localhost:3306/school_management"
JWT_SECRET="your_secure_jwt_secret_token_here"
CORS_ORIGIN="http://localhost:5173"
```

### Frontend Configuration (`frontend/.env`)
```env
VITE_API_URL="http://localhost:3000/api/v1"
```

---

## 6. How to Run Locally
Start both the backend server and the frontend client concurrently with a single command from the repository root:
```bash
pnpm dev
```
* **Frontend Client URL**: `http://localhost:5173`
* **Backend API URL**: `http://localhost:3000/api/v1`

---

## 7. How to Run Verification Tests
To run verification scripts checking static typing, schema validations, and route checks:
```bash
# Compile and check typescript integrity
pnpm --filter backend exec tsc --noEmit
pnpm --filter frontend exec tsc --noEmit

# Run backend validations
pnpm --filter backend run test
```

---

## 8. Known Issues & Limitations
* **Cache Latency**: Timetables and credit status charts rely on TanStack Query cache. Under high-latency networks, updates may require a hard browser refresh or short delay.
* **Real-time Notifications**: Direct push notifications upon advising approvals are pending WebSockets integration and currently operate on query refetches.

---

## 9. Live Demo URL
The system is deployed on production environments:
* **Frontend Client (Vercel)**: [https://school-management-system-hcmiu.vercel.app/](https://school-management-system-hcmiu.vercel.app/)
* **Backend Server (Railway)**: [https://school-management-system-backend.up.railway.app/](https://school-management-system-backend.up.railway.app/)

---

## 10. Test Account Credentials
For evaluation, log in to the portal using these pre-seeded accounts:

| Role | Email Address | Default Password |
|---|---|---|
| **Admin** | `admin2@hcmiu.edu.vn` | `Password123!` |
| **Staff (Advisor)** | `nhphu@hcmiu.edu.vn` | `Password123!` |
| **Student** | `ITITWE24025@student.hcmiu.edu.vn` | `Password123!` |

---

## 11. Screen Layouts & Features

### Portal Login Screen
Authentication interface with institutional role separation.
![Login portal](docs/LoginScreen.png)

### Student Course Selection Panel
Course offering workspace featuring active search filters and draft selections.
![Course Registration](docs/CourseRegistration.png)

### Personal Class Timetable
Weekly academic calendar grid displaying class hours, rooms, and advisors.
![Class Timetable](docs/WeeklySchedule.png)
