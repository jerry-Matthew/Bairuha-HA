# Bairuha Home Assistant

A modern Home Assistant clone built with NestJS (backend) and React + Vite (frontend).

## 📁 Project Structure

```
Bairuha-homeAssistant/
├── backend/          # NestJS Backend
│   ├── src/         # Application source code
│   ├── database/    # Database schema & migrations
│   ├── scripts/     # Database setup & utility scripts
│   └── .env         # Backend environment variables
├── frontend/         # Vite + React Frontend
│   ├── src/         # Application source code
│   └── .env         # Frontend environment variables
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 12+

### Installation

1. **Install Backend Dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Install Frontend Dependencies:**
   ```bash
   cd frontend
   npm install
   ```

### Configuration

1. **Backend Environment:**
   - Copy `backend/.env` and configure your database credentials
   - Set JWT secrets and API keys

2. **Frontend Environment:**
   - The `frontend/.env` is already configured with `VITE_API_URL=http://localhost:3000`

### Database Setup

Run these commands from the `backend/` directory:

```bash
cd backend
npm run setup-db      # Create database schema
npm run create-user   # Create your first user
npm run migrate       # Run migrations
```

### Running the Application

**Start Backend (Port 3000):**
```bash
cd backend
npm run start:dev
```

**Start Frontend (Port 5173):**
```bash
cd frontend
npm run dev
```

Access the application at `http://localhost:5173`

## 📝 Available Scripts

### Backend (`backend/`)
- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run setup-db` - Initialize database
- `npm run create-user` - Create a new user
- `npm run migrate` - Run database migrations
- `npm run seed-catalog` - Seed integration catalog

### Frontend (`frontend/`)
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🛠️ Tech Stack

- **Backend:** NestJS, PostgreSQL, TypeScript
- **Frontend:** React, Vite, Material-UI, TypeScript
- **Real-time:** WebSockets (Socket.io)
- **Authentication:** JWT

## 📄 License

Private
