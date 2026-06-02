# HealthQueue+ — PFG Build

A full-stack healthcare queue management system for private clinics in the Philippines.

## Repository Structure

```
hqplus_pfg/
├── hq-server/    ← Node.js/Express REST API (MongoDB)
├── hq-webapp/    ← React/Vite admin web portal (Super Admin & Facility Admin)
├── hq-mobapp/    ← Flutter patient mobile app (iOS/Android)
└── hq-tabapp/    ← Flutter staff tablet app (landscape-locked)
```

---

## Quick Start

### 1. Server (`hq-server`)

```bash
cd hq-server
cp .env.example .env    # Fill in MONGO_URI and JWT_SECRET
npm install
npm run seed            # Optional: seed demo data (clinics, users, queue entries)
npm run dev             # Starts on http://localhost:4000
```

**Health check:** `GET http://localhost:4000/health`

---

### 2. Web Admin Portal (`hq-webapp`)

```bash
cd hq-webapp
cp .env.example .env    # Set VITE_API_URL=http://localhost:4000
npm install
npm run dev             # Opens on http://localhost:3000
```

Login with Super Admin or Facility Admin credentials (see Seed Credentials below).

---

### 3. Patient Mobile App (`hq-mobapp`)

```bash
cd hq-mobapp
cp .env.example .env    # Set API_BASE_URL
flutter pub get
flutter run
```

Set `API_BASE_URL` in `.env`:
- Android emulator → `http://10.0.2.2:4000`
- iOS simulator     → `http://localhost:4000`
- Physical device   → `http://<your-local-ip>:4000`

---

### 4. Staff Tablet App (`hq-tabapp`)

```bash
cd hq-tabapp
cp .env.example .env    # Set API_BASE_URL
flutter pub get
flutter run             # Best on a tablet in landscape mode
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Patient self-registration |
| POST | `/api/auth/login` | — | Login (all roles) |
| GET | `/api/auth/me` | ✓ | Get current user |
| GET | `/api/clinics/directory` | ✓ | Live clinic list with wait times |
| GET | `/api/clinics/recommend` | ✓ | Recommended clinics |
| GET | `/api/clinics` | admin | Admin: list all clinics |
| POST | `/api/clinics` | super_admin | Create clinic |
| PUT | `/api/clinics/:id` | admin | Update clinic |
| DELETE | `/api/clinics/:id` | super_admin | Delete clinic |
| POST | `/api/queues/join` | patient | Join walk-in queue |
| GET | `/api/queues/my-status` | patient | Patient queue status |
| GET | `/api/queues` | staff | Get queue entries |
| GET | `/api/queues/metrics` | staff | Queue stats |
| POST | `/api/queues/add-walkin` | staff | Staff adds walk-in |
| PUT | `/api/queues/:id/call` | staff | Call patient |
| PUT | `/api/queues/:id/complete` | staff | Mark done |
| PUT | `/api/queues/:id/skip` | staff | Skip patient |
| PUT | `/api/queues/:id/no-show` | staff | Mark no-show |
| POST | `/api/appointments` | patient | Book appointment |
| GET | `/api/appointments/available-slots` | ✓ | Check open time slots |
| GET | `/api/appointments/today` | staff | Today's appointments |
| PUT | `/api/appointments/:id/status` | staff | Update appointment status |
| GET | `/api/users` | admin | List users |
| POST | `/api/users` | admin | Create user |
| PUT | `/api/users/:id` | admin | Update user |
| DELETE | `/api/users/:id` | admin | Deactivate user |
| GET | `/api/dashboard/facility` | admin | Facility stats |
| GET | `/api/dashboard/super-admin` | super_admin | System-wide stats |
| POST | `/api/chatbot/message` | ✓ | Chatbot (rule-based fallback) |
| GET | `/api/notifications` | ✓ | User notifications |

---

## Roles & App Access

| Role | App | Access |
|------|-----|--------|
| `super_admin` | Web (`hq-webapp`) | Full system — all clinics, users, reports |
| `facility_admin` | Web (`hq-webapp`) | Own clinic — queue, appointments, reports |
| `staff` | Tablet (`hq-tabapp`) | Own clinic queue management & appointments |
| `patient` | Mobile (`hq-mobapp`) | Queue join, appointments, clinic directory, chatbot |

---

## Seed Login Credentials

After running `npm run seed` in `hq-server/`:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@healthqueue.ph` | `Admin@123` |
| Facility Admin | `admin.delacruz@healthqueue.ph` | `Admin@123` |
| Staff | `staff.santos@healthqueue.ph` | `Staff@123` |
| Patient | `ana.reyes@gmail.com` | `Patient@123` |
| Patient | `carlos.b@gmail.com` | `Patient@123` |

---

## Environment Variables

### `hq-server/.env`

```env
PORT=4000
MONGO_URI=mongodb://localhost:27017/healthqueue
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### `hq-webapp/.env`

```env
VITE_API_URL=http://localhost:4000
```

### `hq-mobapp/.env` / `hq-tabapp/.env`

```env
API_BASE_URL=http://10.0.2.2:4000
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Node.js, Express, MongoDB (Mongoose) |
| Web Admin | React 18, Vite, React Router v6, Chart.js |
| Patient App | Flutter 3, Provider, HTTP, flutter_secure_storage |
| Tablet App | Flutter 3, Provider, HTTP, flutter_secure_storage |
| Auth | JWT (Bearer token) |
| Styling (web) | Pure CSS custom design system (no UI framework) |
