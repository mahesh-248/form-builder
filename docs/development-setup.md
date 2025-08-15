# Development Setup Guide

This guide will help you set up the Form Builder application for development.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Go 1.21+** - [Download here](https://golang.org/dl/)
- **MongoDB 6.0+** - [Download here](https://www.mongodb.com/try/download/community)

### Installation Instructions

#### Installing Go on Windows

1. Download Go from https://golang.org/dl/
2. Run the installer and follow the setup wizard
3. Add Go to your PATH environment variable
4. Verify installation: `go version`

#### Installing MongoDB on Windows

1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Run the installer and choose "Complete" installation
3. Install MongoDB as a Windows Service
4. Start the MongoDB service
5. Verify installation: `mongosh` (MongoDB Shell)

## Project Setup

### 1. Frontend Setup (Next.js)

```bash
# Navigate to frontend directory
cd "frontend"

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 2. Backend Setup (Go Fiber)

```bash
# Navigate to backend directory
cd "backend"

# Download Go dependencies
go mod tidy

# Start the development server
go run main.go
```

The backend API will be available at `http://localhost:8080`

### 3. Database Setup (MongoDB)

Make sure MongoDB is running locally. The application will connect to:

- **Database**: `formbuilder`
- **Connection String**: `mongodb://localhost:27017/formbuilder`

No additional setup is required - the database and collections will be created automatically.

## Environment Variables

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8080
```

### Backend (.env)

```env
MONGODB_URI=mongodb://localhost:27017/formbuilder
PORT=8080
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## Development Workflow

### Starting the Development Environment

1. **Start MongoDB** (if not running as a service):

   ```bash
   mongod
   ```

2. **Start the Backend** (Terminal 1):

   ```bash
   cd backend
   go run main.go
   ```

3. **Start the Frontend** (Terminal 2):
   ```bash
   cd frontend
   npm run dev
   ```

### Project Structure

```
form-builder/
├── frontend/                 # Next.js React application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # Reusable components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities and API client
│   │   └── types/           # TypeScript definitions
│   └── package.json
├── backend/                 # Go Fiber API
│   ├── controllers/         # HTTP handlers
│   ├── models/              # Data models
│   ├── routes/              # API routes
│   ├── database/            # Database connection
│   ├── websocket/           # WebSocket handlers
│   └── main.go
└── README.md
```

## API Endpoints

Once the backend is running, you can test the API endpoints:

### Forms

- `GET http://localhost:8080/api/v1/forms` - List all forms
- `POST http://localhost:8080/api/v1/forms` - Create new form
- `GET http://localhost:8080/api/v1/forms/:id` - Get specific form
- `PUT http://localhost:8080/api/v1/forms/:id` - Update form
- `DELETE http://localhost:8080/api/v1/forms/:id` - Delete form

### Public Access

- `GET http://localhost:8080/api/v1/public/:token` - Access form by share token

### Responses

- `POST http://localhost:8080/api/v1/forms/:id/responses` - Submit response
- `GET http://localhost:8080/api/v1/forms/:id/responses` - Get responses
- `GET http://localhost:8080/api/v1/forms/:id/analytics` - Get analytics

### WebSocket

- `ws://localhost:8080/ws` - WebSocket connection for real-time updates

## Troubleshooting

### Common Issues

1. **Go command not found**

   - Ensure Go is installed and added to PATH
   - Restart your terminal after installation

2. **MongoDB connection failed**

   - Check if MongoDB service is running
   - Verify connection string in .env file

3. **Port already in use**

   - Frontend (3000): `netstat -ano | findstr :3000`
   - Backend (8080): `netstat -ano | findstr :8080`
   - Kill the process: `taskkill /PID <PID> /F`

4. **Module not found errors**
   - Frontend: Run `npm install`
   - Backend: Run `go mod tidy`

### Database Reset

To reset the database during development:

```bash
# Connect to MongoDB
mongosh

# Switch to formbuilder database
use formbuilder

# Drop all collections
db.forms.drop()
db.responses.drop()
```

## Next Steps

Once you have the development environment running:

1. Visit `http://localhost:3000` to see the landing page
2. Click "Create Form" to start building your first form
3. Use the drag-and-drop interface to add fields
4. Publish the form and test form submissions
5. View real-time analytics as responses come in

## Development Features

### Hot Reload

- Frontend: Automatic reload on file changes
- Backend: Manual restart required (use air for auto-reload)

### Real-time Updates

- WebSocket connection for live form updates
- Real-time analytics dashboard
- Live response notifications

### Form Builder Features

- Drag-and-drop field arrangement
- Multiple field types (text, email, multiple choice, etc.)
- Field validation rules
- Form preview mode
- Draft saving

Happy coding! 🚀
