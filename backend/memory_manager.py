"""
Conversation Memory Manager
Handles session-based memory with sliding window context
"""
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid
from typing import List, Dict, Any, Optional


class MemoryManager:
    """Manages conversation sessions and message history"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_session(self, agent_id: str, user_id: Optional[str] = None) -> str:
        """
        Create new conversation session
        
        Args:
            agent_id: Agent ID
            user_id: Optional user identifier
            
        Returns:
            session_id: New session ID
        """
        from main import ConversationSession
        
        session_id = str(uuid.uuid4())
        session = ConversationSession(
            id=session_id,
            agent_id=agent_id,
            user_id=user_id,
            created_at=datetime.utcnow(),
            last_active=datetime.utcnow(),
            metadata={}
        )
        
        self.db.add(session)
        self.db.commit()
        
        print(f"✅ Created conversation session: {session_id}")
        return session_id
    
    def get_or_create_session(self, agent_id: str, session_id: Optional[str] = None, user_id: Optional[str] = None) -> str:
        """
        Get existing session or create new one
        
        Args:
            agent_id: Agent ID
            session_id: Optional existing session ID
            user_id: Optional user identifier
            
        Returns:
            session_id: Session ID (existing or new)
        """
        from main import ConversationSession
        
        if session_id:
            # Check if session exists
            session = self.db.query(ConversationSession).filter(
                ConversationSession.id == session_id
            ).first()
            
            if session:
                # Update last active
                session.last_active = datetime.utcnow()
                self.db.commit()
                print(f"📝 Using existing session: {session_id}")
                return session_id
        
        # Create new session
        return self.create_session(agent_id, user_id)
    
    def add_message(self, session_id: str, role: str, content: str, metadata: Optional[Dict] = None) -> str:
        """
        Add message to session
        
        Args:
            session_id: Session ID
            role: 'user' or 'assistant'
            content: Message content
            metadata: Optional metadata
            
        Returns:
            message_id: New message ID
        """
        from main import ConversationMessage, ConversationSession
        
        message_id = str(uuid.uuid4())
        message = ConversationMessage(
            id=message_id,
            session_id=session_id,
            role=role,
            content=content,
            timestamp=datetime.utcnow(),
            metadata=metadata or {}
        )
        
        self.db.add(message)
        
        # Update session last_active
        session = self.db.query(ConversationSession).filter(
            ConversationSession.id == session_id
        ).first()
        
        if session:
            session.last_active = datetime.utcnow()
        
        self.db.commit()
        
        print(f"💬 Added {role} message to session {session_id[:8]}...")
        return message_id
    
    def get_context(self, session_id: str, window_size: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent messages for context (sliding window)
        
        Args:
            session_id: Session ID
            window_size: Number of recent messages to retrieve
            
        Returns:
            List of messages in chronological order
        """
        from main import ConversationMessage
        
        messages = self.db.query(ConversationMessage)\
            .filter(ConversationMessage.session_id == session_id)\
            .order_by(ConversationMessage.timestamp.desc())\
            .limit(window_size)\
            .all()
        
        # Reverse to get chronological order
        messages = list(reversed(messages))
        
        result = [
            {
                'role': msg.role,
                'content': msg.content,
                'timestamp': msg.timestamp.isoformat() if msg.timestamp else None
            }
            for msg in messages
        ]
        
        print(f"📚 Retrieved {len(result)} messages from session {session_id[:8]}...")
        return result
    
    def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session information"""
        from main import ConversationSession
        
        session = self.db.query(ConversationSession).filter(
            ConversationSession.id == session_id
        ).first()
        
        if not session:
            return None
        
        return {
            'id': session.id,
            'agent_id': session.agent_id,
            'user_id': session.user_id,
            'created_at': session.created_at.isoformat() if session.created_at else None,
            'last_active': session.last_active.isoformat() if session.last_active else None,
            'metadata': session.metadata
        }
    
    def cleanup_old_sessions(self, ttl_minutes: int = 45):
        """
        Clean up old inactive sessions (TTL-based)
        
        Args:
            ttl_minutes: Time-to-live in minutes
        """
        from main import ConversationSession, ConversationMessage
        
        cutoff_time = datetime.utcnow() - timedelta(minutes=ttl_minutes)
        
        # Find old sessions
        old_sessions = self.db.query(ConversationSession).filter(
            ConversationSession.last_active < cutoff_time
        ).all()
        
        if not old_sessions:
            print(f"🧹 No sessions to clean up (TTL: {ttl_minutes} minutes)")
            return
        
        # Delete messages and sessions
        for session in old_sessions:
            # Delete messages
            self.db.query(ConversationMessage).filter(
                ConversationMessage.session_id == session.id
            ).delete()
            
            # Delete session
            self.db.delete(session)
        
        self.db.commit()
        
        print(f"🧹 Cleaned up {len(old_sessions)} old sessions (TTL: {ttl_minutes} minutes)")
    
    def delete_session(self, session_id: str):
        """Delete a specific session and its messages"""
        from main import ConversationSession, ConversationMessage
        
        # Delete messages
        self.db.query(ConversationMessage).filter(
            ConversationMessage.session_id == session_id
        ).delete()
        
        # Delete session
        self.db.query(ConversationSession).filter(
            ConversationSession.id == session_id
        ).delete()
        
        self.db.commit()
        
        print(f"🗑️ Deleted session: {session_id}")
