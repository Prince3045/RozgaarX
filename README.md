# Rozgaarx - Professional Service Marketplace

This is a full-stack platform built with Spring Boot and React to connect workers with customers in real-time.

## 📁 Repository Overview

- **`/backend`**: Spring Boot application (Port 8081).
- **`/src`**: React Frontend source code.
- **`/public`**: Static assets for the frontend.
- **`/uploads`**: Backend directory for storing worker ID proofs.

## 🚀 Key Features

- **Real-time Connectivity**: WebSockets for instant job notifications.
- **Intelligent Routing**: Location and Category-based job broadcasting.
- **Admin Control**: Secure dashboard for verifying and approving workers.
- **Premium UI**: Modern Glassmorphic design with Tailwind CSS.

## 🛠️ Setup Instructions

1. **Database**: Create a MySQL database named `rozgaarx`.
2. **Backend**:
   ```bash
   cd backend
   ./gradlew bootRun
   ```
3. **Frontend**:
   ```bash
   npm run dev
   ```

## 🔑 Admin Credentials
- **Email**: `admin@rozgaarx.com`
- **Password**: `Admin@123`
