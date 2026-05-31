# iProcess Agentic Builder - Backend

FastAPI backend with PostgreSQL and OpenAI integration.

## Setup

### 1. Install PostgreSQL

**Windows:**
```bash
# Download from: https://www.postgresql.org/download/windows/
# Or use chocolatey:
choco install postgresql
```

### 2. Create Database

```bash
# Open psql
psql -U postgres

# Create database
CREATE DATABASE agentic_builder;

# Exit
\q
```

### 3. Install Python Dependencies

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Configure Environment

```bash
# Copy example env file
copy .env.example .env

# Edit .env and add your OpenAI API key
```

### 5. Run Server

```bash
# Make sure virtual environment is activated
python main.py

# Or use uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Server will start at: http://localhost:8000

API Documentation: http://localhost:8000/docs

## API Endpoints

### Agents
- `POST /api/agents` - Create agent
- `GET /api/agents` - List all agents
- `GET /api/agents/{id}` - Get agent by ID
- `PUT /api/agents/{id}` - Update agent
- `DELETE /api/agents/{id}` - Delete agent

### Chat
- `POST /api/chat` - Chat with agent (non-streaming)
- `POST /api/chat/stream` - Chat with agent (streaming)

### Executions
- `GET /api/executions` - List executions
- `GET /api/executions/{id}` - Get execution by ID

### Health
- `GET /health` - Health check
- `GET /` - API info

## Database Schema

### agents
- id (UUID)
- name (String)
- description (Text)
- workflow (JSON) - nodes and edges
- config (JSON) - node configurations
- created_at (DateTime)
- updated_at (DateTime)
- version (Integer)
- status (String)

### executions
- id (UUID)
- agent_id (UUID)
- input_data (JSON)
- output_data (JSON)
- trace (JSON)
- status (String)
- started_at (DateTime)
- completed_at (DateTime)
- duration_ms (Integer)
- cost (JSON)

### messages
- id (UUID)
- execution_id (UUID)
- role (String)
- content (Text)
- metadata (JSON)
- created_at (DateTime)

## Development

```bash
# Run with auto-reload
uvicorn main:app --reload

# Run tests (TODO)
pytest

# Format code
black main.py

# Lint
flake8 main.py
```

## Production

```bash
# Run with gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Docker (Optional)

```bash
# Build
docker build -t agentic-builder-backend .

# Run
docker run -p 8000:8000 --env-file .env agentic-builder-backend
```
