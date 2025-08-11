The two uploaded documents, **NEON_QUERY_AGENT_PLAN.md** and **NL2SQL_RESEARCH_AND_FRAMEWORKS.md**, should be combined into a single, comprehensive plan. This is because the research document provides best practices and critiques that directly improve upon the initial development plan. The new, combined plan will be more robust, efficient, and secure.

***

### Updated Development Plan: AI Agent for Neon Database Querying

#### Overview
This plan outlines the development of an AI agent that enables users to query the FibreFlow Neon database using natural language. The agent will convert natural language questions into secure SQL queries, execute them, and return insightful answers. The architecture will be built on production-ready frameworks and best practices to ensure a reliable and scalable solution.

#### Architecture & Core Components
1.  **Framework:** LangChain, specifically its `create_sql_agent` toolkit. This toolkit handles query generation, execution, error recovery, and security checks out-of-the-box.
2.  **Database:** Neon Postgres, leveraging its serverless architecture, vector support via `pgvector`, and branching for safe testing.
3.  **LLM:** OpenAI GPT-4 is the primary choice, with options for other models like Claude or Grok.
4.  **Additional Tools:**
    * **LangGraph:** For complex workflow orchestration.
    * **FastAPI & Streamlit:** For API endpoints and a UI prototype.
    * **pgvector:** For semantic search and embedding support.
    * **Redis:** For query result caching to reduce costs and latency.

#### Development Phases

**Phase 1: Foundation & Agent Setup (Days 1-5)**
* **Environment Setup:** Create a Python virtual environment and install dependencies like `langchain`, `psycopg2-binary`, and `langchain-openai`.
* **Configuration:** Set up the project structure with a `.env.local` file for secrets and organized source directories.
* **Agent Implementation (using best practices):**
    * Instead of a custom agent, use LangChain's built-in `create_sql_agent`. This simplifies development and provides pre-built features.
    * Connect to the Neon database using a **dedicated read-only user** (`ai_agent`) to enforce security at the database level.
    * Configure the agent with a list of specific, whitelisted tables to limit its scope (e.g., `projects`, `tasks`, `contractors`).
    * Add a Redis caching layer for the LLM to store common query results, improving performance and reducing costs.

**Phase 2: Security & Advanced Features (Days 6-11)**
* **Robust Security Layer:**
    * Implement **database-level security** by creating a read-only user for the agent.
    * Apply **Row-Level Security (RLS)** to restrict the agent's data access based on user roles.
    * Use **Neon's branching** to create an isolated sandbox for query execution, ensuring that even a malicious or erroneous query cannot affect the main database.
* **Vector Search Integration:**
    * Enable the `pgvector` extension in the Neon database.
    * Use the `langchain-community` PGVector store to embed and store past questions and their generated SQL queries.
    * During a new query, perform a **semantic search** to retrieve similar past queries, providing the LLM with context to improve accuracy.
* **Context-Aware Responses:** Use LangChain's built-in memory management, such as `ConversationBufferMemory`, to maintain conversational context across multiple turns.

**Phase 3: Testing, Optimization, & Deployment (Days 12-16)**
* **Test Scenarios:** Execute the test cases outlined in the original plan, including basic, complex, and edge-case queries. Verify that the `create_sql_agent`'s built-in error recovery works as expected.
* **Performance Optimization:** Ensure the Redis cache is working, and consider connection pooling.
* **API & UI Implementation:**
    * Use FastAPI to create a `/query` endpoint that accepts a user's question.
    * The endpoint will initialize the `FibreFlowQueryAgent`, which will handle the entire process from natural language to a formatted response.
    * Build a simple Streamlit UI to interact with the API.
* **Deployment:** Containerize the API using Docker and deploy the solution.

***

### Integration, Security, and Cost

| Aspect | Plan | Rationale |
| :--- | :--- | :--- |
| **Database Tables** | Include core tables (`projects`, `tasks`), financial tables (`boq_items`), and operational tables (`pole_tracker`). | This provides the necessary context for the agent to answer a wide range of questions. |
| **Security** | Implement database-level security (read-only users, RLS) and leverage Neon branching. Use LangChain's built-in query checker for validation. | This is the most secure and robust approach, preventing SQL injection and destructive operations while sandboxing the agent's actions. |
| **Cost** | Use Neon's scale-to-zero feature and Redis caching to manage database and LLM costs. | This ensures the solution remains cost-effective during idle periods and for repetitive queries. |
