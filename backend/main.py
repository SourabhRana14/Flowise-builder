"""
iProcess Agentic Builder - Backend API
FastAPI + PostgreSQL + OpenAI Integration
"""
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import create_engine, Column, String, JSON, DateTime, Integer, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import asyncio
import os
from openai import AsyncOpenAI

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./agentic_builder.db")
# For PostgreSQL: postgresql://postgres:postgres@localhost:5432/agentic_builder
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# OpenAI client
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

# FastAPI app
app = FastAPI(title="iProcess Agentic Builder API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== DATABASE MODELS ====================

class Agent(Base):
    __tablename__ = "agents"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    workflow = Column(JSON, nullable=False)  # nodes + edges
    config = Column(JSON)  # node configurations
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String)
    version = Column(Integer, default=1)
    status = Column(String, default="draft")  # draft, active, archived

class Execution(Base):
    __tablename__ = "executions"
    
    id = Column(String, primary_key=True)
    agent_id = Column(String, nullable=False)
    input_data = Column(JSON)
    output_data = Column(JSON)
    trace = Column(JSON)  # execution trace
    status = Column(String)  # running, completed, failed
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    duration_ms = Column(Integer)
    cost = Column(JSON)  # token usage and cost

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True)
    execution_id = Column(String, nullable=False)
    role = Column(String, nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    message_metadata = Column(JSON)  # renamed from metadata to avoid SQLAlchemy reserved word
    created_at = Column(DateTime, default=datetime.utcnow)

class Tool(Base):
    __tablename__ = "tools"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    type = Column(String, nullable=False)  # http, registry, custom
    config = Column(JSON, nullable=False)  # URL, method, headers, auth, body
    enabled = Column(Integer, default=1)  # SQLite uses INTEGER for boolean
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String)

class ConversationSession(Base):
    __tablename__ = "conversation_sessions"
    
    id = Column(String, primary_key=True)
    agent_id = Column(String, nullable=False)
    user_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)
    metadata = Column(JSON, default={})

class ConversationMessage(Base):
    __tablename__ = "conversation_messages"
    
    id = Column(String, primary_key=True)
    session_id = Column(String, nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    metadata = Column(JSON, default={})

# Create tables
Base.metadata.create_all(bind=engine)

# ==================== PYDANTIC MODELS ====================

class AgentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    workflow: Dict[str, Any]
    config: Optional[Dict[str, Any]] = None

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    workflow: Optional[Dict[str, Any]] = None
    config: Optional[Dict[str, Any]] = None
    status: Optional[str] = None

class AgentResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    workflow: Dict[str, Any]
    config: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    version: int
    status: str

class ExecutionCreate(BaseModel):
    agent_id: str
    input_data: Dict[str, Any]

class ExecutionResponse(BaseModel):
    id: str
    agent_id: str
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]]
    status: str
    started_at: datetime
    completed_at: Optional[datetime]
    duration_ms: Optional[int]

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    agent_id: str
    messages: List[ChatMessage]
    providers: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None  # Add session support
    user_id: Optional[str] = None  # Provider configurations from Models Panel

class ToolCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: str  # http, registry, custom
    config: Dict[str, Any]  # URL, method, headers, auth, body

class ToolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None

class ToolResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    type: str
    config: Dict[str, Any]
    enabled: bool
    created_at: datetime
    updated_at: datetime

class ToolTestRequest(BaseModel):
    parameters: Optional[Dict[str, Any]] = None

# ==================== DEPENDENCIES ====================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==================== AGENT CRUD ====================

@app.post("/api/agents", response_model=AgentResponse)
async def create_agent(agent: AgentCreate, db: Session = Depends(get_db)):
    """Create a new agent"""
    import uuid
    
    db_agent = Agent(
        id=str(uuid.uuid4()),
        name=agent.name,
        description=agent.description,
        workflow=agent.workflow,
        config=agent.config or {},
        created_by="system",  # TODO: Get from auth
    )
    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)
    
    return AgentResponse(
        id=db_agent.id,
        name=db_agent.name,
        description=db_agent.description,
        workflow=db_agent.workflow,
        config=db_agent.config,
        created_at=db_agent.created_at,
        updated_at=db_agent.updated_at,
        version=db_agent.version,
        status=db_agent.status,
    )

@app.get("/api/agents", response_model=List[AgentResponse])
async def list_agents(db: Session = Depends(get_db)):
    """List all agents"""
    agents = db.query(Agent).order_by(Agent.updated_at.desc()).all()
    return [
        AgentResponse(
            id=agent.id,
            name=agent.name,
            description=agent.description,
            workflow=agent.workflow,
            config=agent.config,
            created_at=agent.created_at,
            updated_at=agent.updated_at,
            version=agent.version,
            status=agent.status,
        )
        for agent in agents
    ]

@app.get("/api/agents/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, db: Session = Depends(get_db)):
    """Get agent by ID"""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        workflow=agent.workflow,
        config=agent.config,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        version=agent.version,
        status=agent.status,
    )

@app.put("/api/agents/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: str, agent_update: AgentUpdate, db: Session = Depends(get_db)):
    """Update agent"""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    if agent_update.name is not None:
        agent.name = agent_update.name
    if agent_update.description is not None:
        agent.description = agent_update.description
    if agent_update.workflow is not None:
        agent.workflow = agent_update.workflow
        agent.version += 1
    if agent_update.config is not None:
        agent.config = agent_update.config
    if agent_update.status is not None:
        agent.status = agent_update.status
    
    agent.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(agent)
    
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        workflow=agent.workflow,
        config=agent.config,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        version=agent.version,
        status=agent.status,
    )

@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str, db: Session = Depends(get_db)):
    """Delete agent"""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    db.delete(agent)
    db.commit()
    return {"message": "Agent deleted successfully"}

# ==================== AGENT EXECUTION ====================

async def execute_agent(agent_id: str, input_message: str, providers_config: Dict[str, Any], db: Session, session_id: Optional[str] = None):
    """Execute agent workflow using LangGraph with conversation memory"""
    import uuid
    from workflow_executor import execute_workflow
    from memory_manager import MemoryManager
    
    print(f"\n🔑 Providers config received: {providers_config}")
    
    # Get agent
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Get conversation context if session exists
    context_messages = []
    if session_id:
        memory = MemoryManager(db)
        context_messages = memory.get_context(session_id, window_size=10)
        print(f"📚 Loaded {len(context_messages)} messages from memory")
    
    # Inject provider API keys into workflow nodes
    workflow = agent.workflow.copy()
    if providers_config and 'providers' in providers_config:
        print(f"  📦 Found {len(providers_config['providers'])} providers in config")
        for node in workflow.get('nodes', []):
            if node.get('type') in ['llm', 'n02_llm_manager']:
                # Node structure from frontend: { id, type, position, values }
                # NOT { id, type, position, data: { values } }
                node_values = node.get('values', {})
                provider_name = node_values.get('provider', '')
                
                print(f"  🔍 Node needs provider: {provider_name}")
                print(f"  📊 Node values: {node_values}")
                
                # Find matching provider from config
                for provider in providers_config.get('providers', []):
                    print(f"    🔎 Checking provider: {provider.get('name')}")
                    if provider.get('name') == provider_name:
                        # Inject API key and endpoint directly into values
                        if 'values' not in node:
                            node['values'] = {}
                        
                        node['values']['apiKey'] = provider.get('apiKey', '')
                        node['values']['endpoint'] = provider.get('endpoint', '')
                        print(f"  ✅ Injected API key for provider: {provider_name}")
                        break
    else:
        print(f"  ⚠️ No providers config received or empty!")
    
    # Create execution record
    execution_id = str(uuid.uuid4())
    execution = Execution(
        id=execution_id,
        agent_id=agent_id,
        input_data={"message": input_message},
        status="running",
    )
    db.add(execution)
    db.commit()
    
    # Execute workflow with LangGraph
    try:
        print(f"\n🎯 Executing agent: {agent.name}")
        print(f"📊 Workflow: {len(workflow.get('nodes', []))} nodes, {len(workflow.get('edges', []))} edges")
        
        # Execute using LangGraph
        result = await execute_workflow(workflow, input_message, db_session=db, context_messages=context_messages)
        
        output = result['output']
        trace = result['trace']
        
        # Update execution
        execution.output_data = {"message": output}
        execution.trace = trace
        execution.status = "completed" if not result.get('error') else "failed"
        execution.completed_at = datetime.utcnow()
        execution.duration_ms = int((execution.completed_at - execution.started_at).total_seconds() * 1000)
        
        # TODO: Calculate actual token usage from trace
        execution.cost = {
            "nodes_executed": len(trace),
            "status": execution.status
        }
        
        db.commit()
        
        print(f"✅ Execution completed: {execution.status}")
        
        return output
        
    except Exception as e:
        print(f"❌ Execution failed: {str(e)}")
        execution.status = "failed"
        execution.output_data = {"error": str(e)}
        execution.completed_at = datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Chat with agent with conversation memory"""
    from memory_manager import MemoryManager
    
    # Initialize memory manager
    memory = MemoryManager(db)
    
    # Get or create session
    session_id = memory.get_or_create_session(
        agent_id=request.agent_id,
        session_id=request.session_id,
        user_id=request.user_id
    )
    
    # Get last user message
    last_message = request.messages[-1].content if request.messages else ""
    
    # Add user message to memory
    memory.add_message(session_id, 'user', last_message)
    
    # Execute agent
    providers_config = request.providers or {}
    response = await execute_agent(request.agent_id, last_message, providers_config, db, session_id=session_id)
    
    # Add assistant response to memory
    memory.add_message(session_id, 'assistant', response)
    
    return {
        "response": response,
        "role": "assistant",
        "session_id": session_id  # Return session ID to frontend
    }

@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest, db: Session = Depends(get_db)):
    """Stream chat with agent"""
    agent = db.query(Agent).filter(Agent.id == request.agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    async def generate():
        try:
            messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
            
            stream = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n"
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

# ==================== EXECUTIONS ====================

@app.get("/api/executions", response_model=List[ExecutionResponse])
async def list_executions(agent_id: Optional[str] = None, db: Session = Depends(get_db)):
    """List executions"""
    query = db.query(Execution)
    if agent_id:
        query = query.filter(Execution.agent_id == agent_id)
    
    executions = query.order_by(Execution.started_at.desc()).limit(100).all()
    
    return [
        ExecutionResponse(
            id=ex.id,
            agent_id=ex.agent_id,
            input_data=ex.input_data,
            output_data=ex.output_data,
            status=ex.status,
            started_at=ex.started_at,
            completed_at=ex.completed_at,
            duration_ms=ex.duration_ms,
        )
        for ex in executions
    ]

@app.get("/api/executions/{execution_id}", response_model=ExecutionResponse)
async def get_execution(execution_id: str, db: Session = Depends(get_db)):
    """Get execution by ID"""
    execution = db.query(Execution).filter(Execution.id == execution_id).first()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    return ExecutionResponse(
        id=execution.id,
        agent_id=execution.agent_id,
        input_data=execution.input_data,
        output_data=execution.output_data,
        status=execution.status,
        started_at=execution.started_at,
        completed_at=execution.completed_at,
        duration_ms=execution.duration_ms,
    )

# ==================== TOOLS CRUD ====================

@app.post("/api/tools", response_model=ToolResponse)
async def create_tool(tool: ToolCreate, db: Session = Depends(get_db)):
    """Create a new tool"""
    import uuid
    
    print(f"📝 Creating tool: {tool.name} (type: {tool.type})")
    
    db_tool = Tool(
        id=str(uuid.uuid4()),
        name=tool.name,
        description=tool.description,
        type=tool.type,
        config=tool.config,
        created_by="system",
    )
    db.add(db_tool)
    db.commit()
    db.refresh(db_tool)
    
    print(f"✅ Tool created: {db_tool.id}")
    
    return ToolResponse(
        id=db_tool.id,
        name=db_tool.name,
        description=db_tool.description,
        type=db_tool.type,
        config=db_tool.config,
        enabled=bool(db_tool.enabled),
        created_at=db_tool.created_at,
        updated_at=db_tool.updated_at,
    )

@app.get("/api/tools", response_model=List[ToolResponse])
async def list_tools(db: Session = Depends(get_db)):
    """List all tools"""
    print("📋 Listing all tools")
    
    tools = db.query(Tool).order_by(Tool.created_at.desc()).all()
    
    print(f"✅ Found {len(tools)} tools")
    
    return [
        ToolResponse(
            id=tool.id,
            name=tool.name,
            description=tool.description,
            type=tool.type,
            config=tool.config,
            enabled=bool(tool.enabled),
            created_at=tool.created_at,
            updated_at=tool.updated_at,
        )
        for tool in tools
    ]

@app.get("/api/tools/{tool_id}", response_model=ToolResponse)
async def get_tool(tool_id: str, db: Session = Depends(get_db)):
    """Get tool by ID"""
    print(f"🔍 Getting tool: {tool_id}")
    
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        print(f"❌ Tool not found: {tool_id}")
        raise HTTPException(status_code=404, detail="Tool not found")
    
    print(f"✅ Tool found: {tool.name}")
    
    return ToolResponse(
        id=tool.id,
        name=tool.name,
        description=tool.description,
        type=tool.type,
        config=tool.config,
        enabled=bool(tool.enabled),
        created_at=tool.created_at,
        updated_at=tool.updated_at,
    )

@app.put("/api/tools/{tool_id}", response_model=ToolResponse)
async def update_tool(tool_id: str, tool_update: ToolUpdate, db: Session = Depends(get_db)):
    """Update tool"""
    print(f"📝 Updating tool: {tool_id}")
    
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        print(f"❌ Tool not found: {tool_id}")
        raise HTTPException(status_code=404, detail="Tool not found")
    
    if tool_update.name is not None:
        tool.name = tool_update.name
    if tool_update.description is not None:
        tool.description = tool_update.description
    if tool_update.type is not None:
        tool.type = tool_update.type
    if tool_update.config is not None:
        tool.config = tool_update.config
    if tool_update.enabled is not None:
        tool.enabled = 1 if tool_update.enabled else 0
    
    tool.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(tool)
    
    print(f"✅ Tool updated: {tool.name}")
    
    return ToolResponse(
        id=tool.id,
        name=tool.name,
        description=tool.description,
        type=tool.type,
        config=tool.config,
        enabled=bool(tool.enabled),
        created_at=tool.created_at,
        updated_at=tool.updated_at,
    )

@app.delete("/api/tools/{tool_id}")
async def delete_tool(tool_id: str, db: Session = Depends(get_db)):
    """Delete tool"""
    print(f"🗑️ Deleting tool: {tool_id}")
    
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        print(f"❌ Tool not found: {tool_id}")
        raise HTTPException(status_code=404, detail="Tool not found")
    
    tool_name = tool.name
    db.delete(tool)
    db.commit()
    
    print(f"✅ Tool deleted: {tool_name}")
    
    return {"message": f"Tool '{tool_name}' deleted successfully"}

@app.post("/api/tools/{tool_id}/test")
async def test_tool(tool_id: str, test_request: ToolTestRequest, db: Session = Depends(get_db)):
    """Test tool execution"""
    import httpx
    
    print(f"🧪 Testing tool: {tool_id}")
    
    tool = db.query(Tool).filter(Tool.id == tool_id).first()
    if not tool:
        print(f"❌ Tool not found: {tool_id}")
        raise HTTPException(status_code=404, detail="Tool not found")
    
    if tool.type != 'http':
        print(f"❌ Only HTTP tools can be tested currently")
        raise HTTPException(status_code=400, detail="Only HTTP tools can be tested")
    
    config = tool.config
    url = config.get('url', '')
    method = config.get('method', 'GET').upper()
    headers_raw = config.get('headers', [])
    body = config.get('body', {})
    auth_type = config.get('authType', 'none')
    auth_value = config.get('authValue', '')
    
    # Convert headers from list format to dict
    headers = {}
    if isinstance(headers_raw, list):
        for header in headers_raw:
            if isinstance(header, dict) and 'key' in header and 'value' in header:
                headers[header['key']] = header['value']
    elif isinstance(headers_raw, dict):
        headers = headers_raw
    
    print(f"  📍 URL: {url}")
    print(f"  📋 Method: {method}")
    print(f"  🔑 Auth: {auth_type}")
    
    # Prepare query parameters
    params = {}
    
    # Add authentication
    if auth_type == 'bearer' and auth_value:
        headers['Authorization'] = f'Bearer {auth_value}'
    elif auth_type == 'apikey' and auth_value:
        # For API key, add to query params (common for weather APIs)
        params['appid'] = auth_value
    elif auth_type == 'basic' and auth_value:
        headers['Authorization'] = f'Basic {auth_value}'
    
    # Merge test parameters with params for GET, body for POST
    if test_request.parameters:
        if method == 'GET':
            params.update(test_request.parameters)
        else:
            body.update(test_request.parameters)
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if method == 'GET':
                response = await client.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = await client.post(url, headers=headers, json=body)
            elif method == 'PUT':
                response = await client.put(url, headers=headers, json=body)
            elif method == 'DELETE':
                response = await client.delete(url, headers=headers)
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported method: {method}")
            
            print(f"  ✅ Response: {response.status_code}")
            
            return {
                "success": True,
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "body": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text,
                "execution_time_ms": int(response.elapsed.total_seconds() * 1000)
            }
            
    except Exception as e:
        print(f"  ❌ Test failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

# ==================== HEALTH CHECK ====================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "iProcess Agentic Builder API",
        "version": "1.0.0",
        "docs": "/docs"
    }

# ==================== MODELS API ====================

@app.get("/api/models/providers")
async def get_providers():
    """Get configured LLM providers from frontend localStorage
    Note: This is a placeholder - in production, store in database"""
    return {
        "message": "Providers should be passed with agent execution request",
        "note": "Frontend will send provider config with each request"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
