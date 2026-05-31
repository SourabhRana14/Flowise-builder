# UI upgrade patch

Apply these files to your existing UI project only if the components/methods are missing. They keep the existing look-and-feel but add API wiring for:
- LLM provider/model/alias list + CRUD calls
- memory config list + CRUD calls
- RAG collection/query/ingest calls
- tool and MCP list + CRUD/test calls
- chat/test agent via runtime SSE

Important: EventSource uses direct runtime URL `http://localhost:8084` to avoid auth-header limitations.
