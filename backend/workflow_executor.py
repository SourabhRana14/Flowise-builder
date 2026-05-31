"""
LangGraph-based Workflow Execution Engine
Converts visual workflow (nodes + edges) to executable LangGraph
"""
from typing import Dict, Any, List, TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
import os
import json

# ==================== STATE DEFINITION ====================

class AgentState(TypedDict):
    """State that flows through the workflow"""
    messages: List[Dict[str, Any]]
    current_node: str
    variables: Dict[str, Any]
    trace: List[Dict[str, Any]]
    error: str | None


# ==================== NODE EXECUTORS ====================

def create_llm_node(node_config: Dict[str, Any]):
    """Create LLM node executor"""
    
    async def llm_node(state: AgentState) -> AgentState:
        """Execute LLM node"""
        print(f"🤖 Executing LLM Node: {node_config.get('label', 'LLM')}")
        
        # Get model configuration from node
        # Node structure: { id, type, position, values } - NO 'data' wrapper
        node_values = node_config.get('values', {})
        
        # Extract provider and model from node configuration
        provider_name = node_values.get('provider', 'OpenAI')
        model_name = node_values.get('model', 'gpt-4o-mini')
        temperature = float(node_values.get('temperature', 0.7))
        system_prompt = node_values.get('systemPrompt', '')
        
        print(f"  📋 Provider: {provider_name}")
        print(f"  🤖 Model: {model_name}")
        print(f"  🌡️ Temperature: {temperature}")
        
        # Get API key from node config (injected by main.py from Models Panel)
        api_key = node_values.get('apiKey', '')
        endpoint = node_values.get('endpoint', '')
        
        # If no provider configured in node, try to use first enabled provider from config
        if not provider_name and 'providers' in state.get('variables', {}):
            providers_list = state['variables'].get('providers', [])
            if providers_list:
                first_provider = providers_list[0]
                provider_name = first_provider.get('name', 'OpenAI')
                api_key = first_provider.get('apiKey', '')
                endpoint = first_provider.get('endpoint', '')
                model_name = first_provider.get('selectedModel', model_name)
                print(f"  ⚠️ No provider in node config, using first available: {provider_name}")
        
        if not api_key:
            error_msg = f"No API key configured for provider: {provider_name}. Please configure in Models Panel."
            print(f"  ❌ {error_msg}")
            state['error'] = error_msg
            state['trace'].append({
                'node_id': node_config['id'],
                'node_type': 'llm',
                'node_label': node_config.get('label', 'LLM'),
                'provider': provider_name,
                'model': model_name,
                'error': error_msg,
                'status': 'failed'
            })
            return state
        
        # Initialize LLM based on provider
        try:
            provider_lower = provider_name.lower()
            
            if 'openai' in provider_lower:
                llm = ChatOpenAI(
                    model=model_name,
                    temperature=temperature,
                    api_key=api_key
                )
            elif 'anthropic' in provider_lower:
                llm = ChatAnthropic(
                    model=model_name,
                    temperature=temperature,
                    api_key=api_key
                )
            elif 'google' in provider_lower:
                llm = ChatGoogleGenerativeAI(
                    model=model_name,
                    temperature=temperature,
                    google_api_key=api_key
                )
            elif 'groq' in provider_lower:
                # Groq uses OpenAI-compatible API
                llm = ChatOpenAI(
                    model=model_name,
                    temperature=temperature,
                    api_key=api_key,
                    base_url='https://api.groq.com/openai/v1'
                )
                print(f"  ⚡ Using Groq API")
            else:
                # Generic OpenAI-compatible endpoint
                llm = ChatOpenAI(
                    model=model_name,
                    temperature=temperature,
                    api_key=api_key,
                    base_url=endpoint if endpoint and endpoint != 'Custom' else None
                )
                print(f"  🔧 Using custom endpoint: {endpoint}")
                
        except Exception as e:
            print(f"  ❌ Error initializing LLM: {str(e)}")
            state['error'] = str(e)
            state['trace'].append({
                'node_id': node_config['id'],
                'node_type': 'llm',
                'node_label': node_config.get('label', 'LLM'),
                'provider': provider_name,
                'model': model_name,
                'error': str(e),
                'status': 'failed'
            })
            return state
        
        # Build messages
        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        
        # Add conversation history
        for msg in state['messages']:
            if msg['role'] == 'user':
                messages.append(HumanMessage(content=msg['content']))
            elif msg['role'] == 'assistant':
                messages.append(AIMessage(content=msg['content']))
        
        # Call LLM
        try:
            response = await llm.ainvoke(messages)
            output = response.content
            
            # Update state
            state['messages'].append({
                'role': 'assistant',
                'content': output,
                'node': node_config['id']
            })
            
            state['trace'].append({
                'node_id': node_config['id'],
                'node_type': 'llm',
                'node_label': node_config.get('label', 'LLM'),
                'provider': provider_name,
                'model': model_name,
                'input': messages[-1].content if messages else '',
                'output': output,
                'status': 'success'
            })
            
            print(f"✅ LLM Response: {output[:100]}...")
            
        except Exception as e:
            print(f"❌ LLM Error: {str(e)}")
            state['error'] = str(e)
            state['trace'].append({
                'node_id': node_config['id'],
                'node_type': 'llm',
                'node_label': node_config.get('label', 'LLM'),
                'provider': provider_name,
                'model': model_name,
                'error': str(e),
                'status': 'failed'
            })
        
        return state
    
    return llm_node


def create_tool_node(node_config: Dict[str, Any]):
    """Create Tool node executor"""
    
    async def tool_node(state: AgentState) -> AgentState:
        """Execute Tool node"""
        print(f"🔧 Executing Tool Node: {node_config.get('label', 'Tool')}")
        
        # Node structure: { id, type, position, values }
        node_values = node_config.get('values', {})
        tool_name = node_values.get('toolName', 'unknown')
        
        # TODO: Implement actual tool execution
        # For now, just log
        state['trace'].append({
            'node_id': node_config['id'],
            'node_type': 'tool',
            'node_label': node_config.get('label', 'Tool'),
            'tool_name': tool_name,
            'status': 'success',
            'output': f'Tool {tool_name} executed (placeholder)'
        })
        
        print(f"✅ Tool {tool_name} executed")
        
        return state
    
    return tool_node


def create_conditional_node(node_config: Dict[str, Any]):
    """Create Conditional node executor"""
    
    async def conditional_node(state: AgentState) -> AgentState:
        """Execute Conditional node"""
        print(f"🔀 Executing Conditional Node: {node_config.get('label', 'Condition')}")
        
        # Node structure: { id, type, position, values }
        node_values = node_config.get('values', {})
        condition = node_values.get('condition', '')
        
        # TODO: Implement actual condition evaluation
        # For now, just log
        state['trace'].append({
            'node_id': node_config['id'],
            'node_type': 'conditional',
            'node_label': node_config.get('label', 'Condition'),
            'condition': condition,
            'status': 'success'
        })
        
        print(f"✅ Condition evaluated")
        
        return state
    
    return conditional_node


def create_start_node():
    """Create Start node executor"""
    
    async def start_node(state: AgentState) -> AgentState:
        """Execute Start node"""
        print(f"🚀 Starting workflow execution")
        
        state['trace'].append({
            'node_id': 'start',
            'node_type': 'start',
            'node_label': 'Start',
            'status': 'success'
        })
        
        return state
    
    return start_node


def create_end_node():
    """Create End node executor"""
    
    async def end_node(state: AgentState) -> AgentState:
        """Execute End node"""
        print(f"🏁 Workflow execution completed")
        
        state['trace'].append({
            'node_id': 'end',
            'node_type': 'end',
            'node_label': 'End',
            'status': 'success'
        })
        
        return state
    
    return end_node


# ==================== WORKFLOW BUILDER ====================

class WorkflowExecutor:
    """Builds and executes LangGraph workflows from visual definitions"""
    
    def __init__(self, workflow_definition: Dict[str, Any]):
        """
        Initialize executor with workflow definition
        
        Args:
            workflow_definition: {
                'nodes': [...],
                'edges': [...]
            }
        """
        self.nodes = workflow_definition.get('nodes', [])
        self.edges = workflow_definition.get('edges', [])
        self.graph = None
    
    def build_graph(self) -> StateGraph:
        """Build LangGraph from workflow definition"""
        print(f"🏗️ Building workflow graph with {len(self.nodes)} nodes and {len(self.edges)} edges")
        
        # Create graph
        workflow = StateGraph(AgentState)
        
        # Add nodes
        for node in self.nodes:
            node_type = node.get('type', '')
            node_id = node['id']
            
            print(f"  📍 Adding node: {node_id} ({node_type})")
            
            if node_type == 'llm' or node_type == 'n02_llm_manager':
                workflow.add_node(node_id, create_llm_node(node))
            elif node_type == 'tool':
                workflow.add_node(node_id, create_tool_node(node))
            elif node_type == 'conditional':
                workflow.add_node(node_id, create_conditional_node(node))
            elif node_type == 'start':
                workflow.add_node(node_id, create_start_node())
            elif node_type == 'end':
                workflow.add_node(node_id, create_end_node())
            else:
                # Default node - treat as LLM if it's n02_llm_manager
                workflow.add_node(node_id, create_llm_node(node))
        
        # If no edges and only one node, create simple flow: START → NODE → END
        if len(self.edges) == 0 and len(self.nodes) == 1:
            print(f"  ⚠️ No edges found, creating simple flow for single node")
            node_id = self.nodes[0]['id']
            workflow.set_entry_point(node_id)
            workflow.add_edge(node_id, END)
            print(f"  🔗 Auto-added edge: {node_id} → END")
        else:
            # Add edges normally
            start_node_id = None
            for edge in self.edges:
                source = edge['source']
                target = edge['target']
                
                print(f"  🔗 Adding edge: {source} → {target}")
                
                # Track start node
                source_node = next((n for n in self.nodes if n['id'] == source), None)
                if source_node and source_node.get('type') == 'start':
                    start_node_id = source
                
                # Check if target is end node
                target_node = next((n for n in self.nodes if n['id'] == target), None)
                if target_node and target_node.get('type') == 'end':
                    workflow.add_edge(source, END)
                else:
                    workflow.add_edge(source, target)
            
            # Set entry point
            if start_node_id:
                workflow.set_entry_point(start_node_id)
                print(f"  🚪 Entry point: {start_node_id}")
            elif self.nodes:
                # Fallback to first node
                workflow.set_entry_point(self.nodes[0]['id'])
                print(f"  🚪 Entry point (fallback): {self.nodes[0]['id']}")
        
        self.graph = workflow.compile()
        print(f"✅ Workflow graph built successfully")
        
        return self.graph
    
    async def execute(self, input_message: str) -> Dict[str, Any]:
        """
        Execute the workflow
        
        Args:
            input_message: User input message
            
        Returns:
            {
                'output': str,
                'trace': List[Dict],
                'messages': List[Dict]
            }
        """
        if not self.graph:
            self.build_graph()
        
        print(f"\n{'='*60}")
        print(f"🎬 EXECUTING WORKFLOW")
        print(f"{'='*60}")
        print(f"📥 Input: {input_message}\n")
        
        # Initialize state
        initial_state: AgentState = {
            'messages': [{'role': 'user', 'content': input_message}],
            'current_node': '',
            'variables': {},
            'trace': [],
            'error': None
        }
        
        try:
            # Execute workflow
            final_state = await self.graph.ainvoke(initial_state)
            
            # Extract output
            assistant_messages = [
                msg for msg in final_state['messages'] 
                if msg['role'] == 'assistant'
            ]
            
            output = assistant_messages[-1]['content'] if assistant_messages else "No response generated"
            
            print(f"\n📤 Output: {output}")
            print(f"{'='*60}\n")
            
            return {
                'output': output,
                'trace': final_state['trace'],
                'messages': final_state['messages'],
                'error': final_state.get('error')
            }
            
        except Exception as e:
            print(f"\n❌ Workflow execution failed: {str(e)}")
            print(f"{'='*60}\n")
            
            return {
                'output': f"Error: {str(e)}",
                'trace': initial_state['trace'],
                'messages': initial_state['messages'],
                'error': str(e)
            }


# ==================== HELPER FUNCTIONS ====================

async def execute_workflow(workflow_definition: Dict[str, Any], input_message: str) -> Dict[str, Any]:
    """
    Convenience function to execute a workflow
    
    Args:
        workflow_definition: Workflow definition with nodes and edges
        input_message: User input
        
    Returns:
        Execution result
    """
    executor = WorkflowExecutor(workflow_definition)
    return await executor.execute(input_message)
