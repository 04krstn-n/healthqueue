# hq-mobapp — HealthQueue+ Patient Mobile App

Flutter patient-facing application for HealthQueue+.

## Tech Stack
- Flutter 3.x / Dart 3.3+
- Provider (state management)
- http (REST API client)
- flutter_secure_storage (JWT token)
- shared_preferences (user cache)
- google_fonts (Inter)
- flutter_dotenv (.env config)

## Target Platform
- **Android API 36** (Android 16) — compileSdk 36, targetSdk 36, minSdk 21

## Setup

### 1. Clone & install
```bash
cd hq-mobapp
flutter pub get
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env`:
- **Android emulator** → `API_BASE_URL=http://10.0.2.2:4000`
- **Physical device**  → `API_BASE_URL=http://<your-local-IP>:4000`
- **Production**       → `API_BASE_URL=https://your-api-domain.com`

### 3. Android SDK 36 setup (android/app/build.gradle)
After `flutter create` generates the android folder, update `android/app/build.gradle`:
```groovy
android {
    compileSdk 36
    defaultConfig {
        minSdk 21
        targetSdk 36
    }
}
```

### 4. Run
```bash
# Start the hq-server first (npm run dev in hq-server/)
flutter run
```

## Screens
| Screen | Route | Description |
|--------|-------|-------------|
| Splash | `/` | Auto-redirect based on auth state |
| Login | `/login` | Patient login with JWT |
| Register | `/register` | Self-registration (creates Patient record) |
| Home | `/home` | Dashboard with quick actions |
| Queue Status | `/queue-status` | Live position, ETA, cancel |
| Clinic Directory | `/clinics` | Browse active clinics |
| Clinic Detail | `/clinic-detail` | Services, hours, join queue |
| Appointments | `/appointments` | My upcoming/past appointments |
| Book Appointment | `/book-appointment` | Select date + time slot |
| Chatbot | `/chatbot` | AI/FAQ assistant |
| Notifications | `/notifications` | System alerts |
| Profile | `/profile` | Patient profile management |

## Default Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Patient | `ana.reyes@gmail.com` | `Patient@123` |
| Patient | `carlos.b@gmail.com` | `Patient@123` |
| Patient | `rosa.m@gmail.com` | `Patient@123` |
