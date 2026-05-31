# 🤖 iProcess Agentic Builder

A visual, no-code platform for building and deploying AI agents with LangGraph. Configure LLM providers, design workflows, add tools, and test agents - all through an intuitive interface.

## ✨ Features

### 🎨 **Agent Studio**
- Visual workflow builder with drag-and-drop nodes
- Real-time validation and error checking
- Multi-node workflows with conditional routing
- Save, load, and export agent configurations

### 🧠 **Models Microservice**
- Dynamic LLM provider management
- Support for OpenAI, Anthropic, Google, Groq, and more
- API key management per provider
- Model selection and configuration

### 🛠️ **Tools Microservice**
- HTTP API integration
- Pre-built tool registry (Weather, Search, Email)
- Test tool execution before deployment
- Custom tool configuration

### 🧪 **Try Agent**
- Test agents with real conversations
- Execution traces and debugging
- Response streaming support
- Chat history and export

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv311
venv311\Scripts\activate  # Windows
# source venv311/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env
# Add your API keys to .env

# Run backend
uvicorn main:app --reload
```

Backend will run on `http://localhost:8000`

### Frontend Setup

```bash
cd pg

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will run on `http://localhost:5173`

## 📁 Project Structure

```
agentic_builder/
├── backend/
│   ├── main.py              # FastAPI backend
│   ├── workflow_executor.py # LangGraph execution engine
│   ├── requirements.txt     # Python dependencies
│   └── .env.example        # Environment variables template
│
├── pg/                      # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ModelsPanel.jsx
│   │   │   ├── ToolsPanel.jsx
│   │   │   ├── TryAgentPanel.jsx
│   │   │   └── ...
│   │   ├── services/       # API client
│   │   ├── store/          # State management
│   │   └── data/           # Node definitions
│   └── package.json
│
└── README.md
```

## 🔧 Configuration

### Environment Variables

Create `backend/.env`:

```env
# Database
DATABASE_URL=sqlite:///./agentic_builder.db

# LLM Provider API Keys (Optional - configure via UI)
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
```

**Note:** API keys can be configured dynamically through the Models Panel UI.

## 📚 Usage

### 1. Configure LLM Providers
- Navigate to **Microservices → Models**
- Add your preferred LLM providers
- Enter API keys and select models
- Enable/disable providers as needed

### 2. Configure Tools
- Navigate to **Microservices → Tools**
- Add HTTP APIs or use pre-built tools
- Test tool execution
- Save for use in workflows

### 3. Build an Agent
- Navigate to **Microservices → Agent Studio**
- Drag nodes from sidebar to canvas
- Connect nodes to create workflow
- Configure node properties
- Save agent

### 4. Test Agent
- Navigate to **Microservices → Try Agent**
- Select your agent
- Start chatting to test functionality
- View execution traces

## 🏗️ Architecture

### Backend (FastAPI + LangGraph)
- **FastAPI**: REST API server
- **LangGraph**: Workflow execution engine
- **SQLAlchemy**: Database ORM
- **SQLite**: Default database (PostgreSQL supported)

### Frontend (React + Vite)
- **React**: UI framework
- **React Flow**: Visual workflow editor
- **Lucide Icons**: Icon library
- **CSS Variables**: Theming system

## 🎯 Roadmap

### ✅ Completed
- [x] Backend setup with LangGraph
- [x] Models microservice (dynamic providers)
- [x] Tools microservice (HTTP, Registry, Test)
- [x] Agent Studio (visual builder)
- [x] Try Agent (testing interface)
- [x] Dynamic API key injection

### 🚧 In Progress
- [ ] Multi-node workflow execution
- [ ] Orchestrator node (routing logic)
- [ ] RAG/Knowledge microservice
- [ ] Memory microservice

### 📋 Planned
- [ ] Guardrails microservice
- [ ] Prompt Manager
- [ ] Streaming responses
- [ ] Execution history & analytics
- [ ] Agent deployment (REST API)
- [ ] More LLM providers
- [ ] OpenAPI import
- [ ] MCP support

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- Built with [LangGraph](https://github.com/langchain-ai/langgraph)
- UI inspired by modern no-code platforms
- Icons by [Lucide](https://lucide.dev/)

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Made with ❤️ for the AI agent community**
