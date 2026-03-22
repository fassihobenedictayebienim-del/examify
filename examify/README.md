# 🎓 Examify — AI-Powered Exam Prep

> **Single-server deployment** — Flask serves both the REST API *and* the built React frontend.
> One process · one port · one command.

---

## How it works

```
Browser  ──→  http://localhost:5000/          → Flask serves frontend/build/index.html
Browser  ──→  http://localhost:5000/quiz/3    → Same index.html (React Router takes over)
Browser  ──→  http://localhost:5000/api/...   → Flask API blueprints
```

React is built into `frontend/build/`. Flask is configured with `static_folder` pointing at
that directory. Any URL that is **not** under `/api/` and is **not** a real file (JS bundle,
CSS, favicon…) falls through to `index.html` so React Router handles it client-side.

---

## Folder structure

```
examify/
├── run.sh                        ← single command: build + start
├── frontend/
│   ├── package.json              ← "proxy": "http://localhost:5000" for dev
│   ├── build/                    ← created by `npm run build` (git-ignored)
│   └── src/
│       └── utils/api.js          ← BASE_URL = '/api' (relative, same-origin)
└── backend/
    ├── app.py                    ← static_folder=../frontend/build
    ├── requirements.txt
    ├── .env.example
    ├── models/
    ├── routes/
    ├── utils/
    └── uploads/
```

---

## 🚀 Quick start (3 steps)

### Prerequisites
- Python 3.10+
- Node.js 18+
- An OpenAI API key — https://platform.openai.com

### Step 1 — Configure the backend

```bash
cd examify/backend

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

# macOS:         brew install libmagic
# Ubuntu/Debian: sudo apt-get install libmagic1

cp .env.example .env
# Open .env and set:  OPENAI_API_KEY=sk-...
```

### Step 2 — Build the frontend

```bash
cd examify/frontend
npm install
npm run build
```

This creates `examify/frontend/build/` — a fully static production bundle.

### Step 3 — Run (single command)

```bash
cd examify/backend
source venv/bin/activate
python app.py
```

Open **http://localhost:5000** — the full app is live. ✅

---

### One-liner (build + run together)

```bash
cd examify
chmod +x run.sh
./run.sh
```

`run.sh` runs `npm install`, `npm run build`, then `python app.py` in sequence.

---

## Development mode (hot reload)

If you are actively editing the React code, run both servers separately:

```bash
# Terminal 1 — Flask API
cd examify/backend && source venv/bin/activate && python app.py

# Terminal 2 — CRA dev server (proxies /api → localhost:5000)
cd examify/frontend && npm start     # opens http://localhost:3000
```

The `"proxy": "http://localhost:5000"` in `package.json` forwards all `/api/*` requests
to Flask, so the dev experience is identical to production.

---

## Environment variables

### `backend/.env`

| Variable        | Required | Default                  | Description             |
|-----------------|----------|--------------------------|-------------------------|
| OPENAI_API_KEY  | ✅        | —                        | Your OpenAI key         |
| SECRET_KEY      | No       | dev key                  | Flask secret            |
| DATABASE_URL    | No       | sqlite:///examify.db     | DB connection string    |
| FLASK_DEBUG     | No       | False                    | Enable debug/reload     |
| PORT            | No       | 5000                     | Listening port          |

### `frontend/.env` (optional — only needed for split deployment)

| Variable            | Default | Description                                  |
|---------------------|---------|----------------------------------------------|
| REACT_APP_API_URL   | /api    | Override only if backend is on another host  |

---

## Deployment (single server)

### Render / Railway

1. Push the whole `examify/` folder to GitHub.
2. **Build Command**: `cd frontend && npm install && npm run build`
3. **Start Command**: `cd backend && pip install -r requirements.txt && python app.py`
4. Add `OPENAI_API_KEY` in the environment variables panel.
5. One service serves everything.

### With gunicorn (production WSGI)

```bash
cd backend
gunicorn "app:create_app()" --bind 0.0.0.0:5000 --workers 2
```

---

## Running tests

```bash
cd examify/backend
source venv/bin/activate
python -m pytest tests/test_examify.py -v
```
