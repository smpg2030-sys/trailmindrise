# MindRise Backend (Python + MongoDB)

## Setup

1. **Create virtual env and install dependencies**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate   # Windows
   pip install -r requirements.txt
   ```

2. **Configure MongoDB**
   - ✅ `.env` file is already configured with your MongoDB Atlas connection
   - If you need to change it, edit `.env` and set `MONGO_URI` to your connection string

3. **Run the server**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

API docs: http://127.0.0.1:8000/docs

## Auth endpoints

- `POST /auth/register` – body: `{ "email", "password", "full_name" (optional) }` – saves user in DB (password is hashed)
- `POST /auth/login` – body: `{ "email", "password" }` – returns user if credentials match

Frontend runs on Vite (port 5173) and proxies `/api` to this backend.
