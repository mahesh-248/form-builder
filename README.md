go run main.go # Start development server
go test ./... # Run tests
go build # Build binary

## Form Builder

A dynamic form builder with real-time analytics. Create forms with various field types, publish them, collect responses via a public link, and watch live analytics update instantly over WebSockets.

### Key Features

- Create, edit, publish/unpublish forms
- Field types: text, textarea, email, number, multiple choice, checkbox, rating, date
- Drag-and-drop field reordering (builder & edit pages)
- Manage options for choice/checkbox fields
- Public submission (repeat submissions supported)
- Real-time analytics: response count, completion rate, trends, per-field stats
- Native WebSocket subscription per form

### Stack

Frontend: Next.js (App Router), TypeScript, Tailwind CSS
Backend: Go (Fiber), MongoDB
Real-time: Native WebSocket (gofiber/websocket)

### Local Setup

Prerequisites: Node 18+, Go 1.21+, MongoDB (local or Atlas URI)

1. Install

```
cd frontend
npm install
cd ../backend
go mod download
```

2. Env Files
   backend/.env

```
PORT=8081
MONGODB_URI=mongodb://localhost:27017/form_builder
```

frontend/.env.local (optional overrides)

```
NEXT_PUBLIC_API_URL=http://localhost:8081/api/v1
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8081/ws
```

3. Run

```
# Terminal A
cd backend
go run main.go

# Terminal B
cd frontend
npm run dev
```

Open http://localhost:3000

### Real-Time Analytics Test

1. Open analytics page: /forms/:id/analytics
2. In another tab open public form: /f/:token
3. Submit response; analytics tab should auto-refresh (watch network or console for event `response_submitted`).
4. Multiple submissions trigger immediate updates via WebSocket event followed by data refetch.

### Challenges / Assumptions

- Migrated from Socket.IO to native WebSocket to simplify stack.
- Fixed early abnormal closures (1006) by keeping read loop blocking & improved logging.
- Added ping/pong & greeting to stabilize certain clients.
- Simplified CORS/dev origins; production must restrict and add auth.
- Assumed unauthenticated builder actions in dev (should add auth + RBAC in production).

### Deployment (Free / Low-Cost)

Frontend:

- Vercel (optimal for Next.js)
- Netlify
  Backend (Go + WebSocket):
- Render free web service (auto-build, may sleep)
- Fly.io (light VM, global regions)
- Railway (usage-based credits)
  Database:
- MongoDB Atlas Free M0 cluster

Example (Render + Vercel + Atlas):

1. Create Atlas cluster; whitelist 0.0.0.0/0 (dev) and get connection string.
2. Deploy backend on Render (env: PORT=8081, MONGODB_URI, set auto deploy).
3. Deploy frontend on Vercel (env: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WEBSOCKET_URL wss://<render-domain>/ws).
4. Update backend CORS AllowedOrigins to Vercel domain.
5. Test public submission + analytics live update.

### Scripts

Frontend:

```
npm run dev
npm run build
npm start
```

Backend:

```
go run main.go
go build -o server ./...
```
