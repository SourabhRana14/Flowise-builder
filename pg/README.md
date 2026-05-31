# iProcess Agentic Builder

A modern, visual workflow builder for creating and managing intelligent agent systems with microservices architecture.

## 🚀 Features

### Microservices Panel
- **Agent Studio** - Create and manage intelligent agents with visual workflow builder
- **Try Agent** - Test and run conversations against workflows
- **Models** - Configure LLM providers and routing
- **Tools** - Connect APIs, OpenAPI specs, and MCP tools
- **Connections** - Manage secrets, auth profiles, and credentials
- **Prompts** - Reusable prompt templates with versioning
- **Knowledge** - RAG collections and document management
- **Memory** - Conversation history and recall configuration
- **Traces** - Execution logs and debugging
- **Tests** - Scenario regression testing
- **Approvals** - Publish review workflow
- **Alerts** - Monitoring and notifications
- **Admin** - User management and access control

### Agent Studio
- **Visual Canvas** - Drag-and-drop node-based workflow builder
- **Node Palette** - Pre-built nodes for LLM, tools, memory, RAG, and more
- **Real-time Validation** - Instant feedback on workflow completeness
- **Auto Layout** - Automatic node positioning
- **Version Control** - Save and load workflow versions
- **Export/Import** - JSON-based workflow sharing

### Node Types
- **N01 Orchestrator** - Main agent coordinator
- **N02 LLM Manager** - Model selection and fallback
- **N03 RAG Knowledge** - Document retrieval and citations
- **N04 Tools** - API and function calling
- **N05 Router** - Conditional routing logic
- **N06 Prompt Manager** - Dynamic prompt assembly
- **N07 Human-in-Loop** - Approval checkpoints
- **N08 Memory** - Conversation context
- **N09 Guardrails** - Safety and compliance

## 📋 Prerequisites

- **Node.js** v18+ (LTS recommended)
- **npm** v9+ or **yarn** v1.22+

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pg
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:5173
   ```

## 📦 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality

## 🏗️ Project Structure

```
pg/
├── src/
│   ├── components/          # React components
│   │   ├── MicroservicesPanel.jsx
│   │   ├── FlowCanvas.jsx
│   │   ├── Sidebar.jsx
│   │   ├── PropertiesPanel.jsx
│   │   └── ...
│   ├── data/               # Static data and definitions
│   │   ├── nodeDefinitions.js
│   │   └── agentchainFeatures.js
│   ├── store/              # State management
│   │   └── FlowContext.jsx
│   ├── App.jsx             # Main app component
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── public/                 # Static assets
├── package.json
└── vite.config.js
```

## 🎨 Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **@xyflow/react** - Flow-based node editor
- **Lucide React** - Icon library
- **UUID** - Unique ID generation

## 🔧 Configuration

### Theme
The app supports dark and light themes. Toggle using the theme button in the header.

### Local Storage
- Workflows are saved to browser localStorage
- Theme preference is persisted
- No backend required for basic usage

## 📝 Usage

### Creating an Agent

1. Navigate to **Microservices** panel
2. Click on **Agent Studio**
3. Click **Create New Agent**
4. Drag nodes from the left sidebar to the canvas
5. Connect nodes by dragging from output to input ports
6. Configure each node using the properties panel
7. Save your workflow

### Loading Saved Agents

1. Go to **Agent Studio** in Microservices
2. Click on any saved agent card
3. Canvas opens with the workflow loaded
4. Continue editing or testing

### Workflow Validation

The builder provides real-time validation:
- **Ready** - All required nodes present and configured
- **Partial** - Missing optional nodes or warnings
- **Blocked** - Missing required nodes or configuration errors

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Deploy to Static Hosting

The app is a static SPA and can be deployed to:
- **Vercel** - `vercel deploy`
- **Netlify** - Drag & drop `dist/` folder
- **GitHub Pages** - Push `dist/` to `gh-pages` branch
- **AWS S3** - Upload `dist/` contents

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🐛 Known Issues

- Drag and drop may require browser refresh after first load
- Large workflows (100+ nodes) may experience performance issues
- Export/import preserves structure but not viewport position

## 🔮 Roadmap

- [ ] Backend API integration
- [ ] Real-time collaboration
- [ ] Template marketplace
- [ ] Advanced analytics dashboard
- [ ] Mobile responsive design
- [ ] Workflow execution engine
- [ ] Plugin system for custom nodes

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Contact: support@iprocess.com

---

Built with ❤️ by iProcess Team
