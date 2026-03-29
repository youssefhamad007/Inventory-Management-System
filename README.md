# 📦 Inventory Management System (IMS)

*A secure, high-performance, SaaS-ready platform for real-time inventory and supply chain management.*

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)
![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase)

---

## 🏗️ Overview & Architecture

The Inventory Management System (IMS) is an enterprise-grade solution designed to handle multidimensional stock operations, supplier manifests, and multi-branch warehouse logistics. 

Built with a strictly decoupled architecture, the system operates securely by routing all client data mutations through a robust, validated API layer rather than allowing direct database access from the browser. 

### Tech Stack
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, TanStack React Query, Axios
- **Backend:** FastAPI (Python), Pydantic, Uvicorn
- **Database:** PostgreSQL (hosted on Supabase) with real-time subscriptions

---

## 🛡️ Advanced Engineering & Security Highlights

This system incorporates several mission-critical engineering patterns to guarantee data integrity, prevent race conditions, and enforce strict zero-trust security.

- **Row Level Security (RLS) & User-Scoped Clients:** Direct Supabase client queries are strictly prohibited on the frontend. Instead, the frontend passes a Supabase JWT to the FastAPI backend. A custom auth middleware extracts the JWT and instantiates a user-scoped database client per request. This ensures that every PostgreSQL query automatically inherits the identity of the caller, natively enforcing RLS policies (e.g., Staff can only access their assigned branch).
- **Concurrency Control & Idempotency:** Stock adjustments are handled natively inside the database using a PostgreSQL RPC (`adjust_stock_level`). This function implements pessimistic locking (`SELECT ... FOR UPDATE`) to guarantee atomicity and prevent race conditions during high-volume concurrent stock movements. It also includes an idempotency guard to prevent duplicate low-stock alerts.
- **Role-Based Access Control (RBAC):** Privileges are strictly layered through both database RLS and FastAPI dependency injection. The system enforces strict separation of concerns among **Admins** (system configuration and user provisioning), **Managers** (global order fulfillment and cross-branch logistics), and **Staff** (local branch operations).

---

## ✨ Key Features

- **Real-Time Stock Operations:** Live tracking of multi-branch inventory levels with optimistic UI updates.
- **Logistics & Order Management:** Procurement and direct sales routing with kanban-style status tracking.
- **Inter-Branch Transfers:** Audited stock rerouting between operational hubs.
- **Live Notifications:** Real-time, user-scoped alerts for low stock thresholds and system events via Supabase Realtime.
- **Comprehensive Analytics:** Valuation trending and historical stock movement analysis.

---

## 🚀 Prerequisites & Getting Started

### Backend Setup (FastAPI)

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```
2. **Create a virtual environment and activate it:**
   ```bash
   python -m venv env
   # Windows
   .\env\Scripts\activate
   # macOS/Linux
   source env/bin/activate
   ```
3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Start the FastAPI development server:**
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup (React/Vite)

1. **Navigate to the root directory:**
   ```bash
   # From the root IMS directory
   ```
2. **Install Node modules:**
   ```bash
   npm install
   ```
3. **Start the Vite development server:**
   ```bash
   npm run dev
   ```

---

## ⚙️ Environment Variables

Both the backend and frontend require `.env` files to connect to the database and API.

### Frontend (`/.env` in root)
| Variable | Description | Example Value |
|----------|-------------|---------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL (for auth only) | `https://your-project-id.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase public anonymous key | `eyJhbGciOiJIUzI1NiIsInR...` |
| `VITE_API_BASE_URL` | The local or production FastAPI URL | `http://localhost:8000/api/v1` |

### Backend (`/backend/.env`)
| Variable | Description | Example Value |
|----------|-------------|---------------|
| `SUPABASE_URL` | Your Supabase project URL | `https://your-project-id.supabase.co` |
| `SUPABASE_ANON_KEY` | Your Supabase public anonymous key | `eyJhbGciOiJIUzI1NiIsInR...` |
| `SUPABASE_SERVICE_ROLE_KEY` | The secret service role key (Bypasses RLS) | `eyJhbGciOiJIUzI1NiIsInR...` |
| `FRONTEND_URL` | Allowed CORS origin for the React app | `http://localhost:5173` |
| `JWT_SECRET` | Supabase JWT Secret for token verification | `super-secret-jwt-token-string` |

---

## 📖 API Documentation

The FastAPI backend automatically provides interactive, OpenAPI-compliant documentation. 
Once the backend server is running, navigate to the Swagger UI:
👉 **[http://localhost:8000/docs](http://localhost:8000/docs)**

## 👥 Team

- **Yousef Mahmoud** - Database
- **Mariam Mahmoud** - BackEnd
- **Yousef Hammad** - FrontEnd

---

## 🤝 Contributing & License

### Contributing
1. Fork the repository
2. Create a Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### License
Distributed under the MIT License. See `LICENSE` for more information.
