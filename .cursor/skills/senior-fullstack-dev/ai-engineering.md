# AI Engineering Patterns

## Architecture Overview

```
Client → Server Action → Edge Function → AI Provider
                              ↕
                        Supabase DB (context, history, embeddings)
```

## LLM Integration via Edge Functions

### Streaming Response Pattern

```typescript
// supabase/functions/ai-chat/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  const { messages, model = "gpt-4o" } = await req.json();

  console.log("[ai-chat] Request:", { messageCount: messages.length, model });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });

  // Forward the stream directly to the client
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
```

### Client-Side Stream Consumption

```typescript
// hooks/useAIChat.ts
export function useAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async (content: string) => {
    setIsStreaming(true);
    const userMessage = { role: "user" as const, content };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantContent += parseSSEChunk(chunk);
        
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: assistantContent },
        ]);
      }
    } finally {
      setIsStreaming(false);
    }
  };

  return { messages, sendMessage, isStreaming };
}
```

## RAG (Retrieval-Augmented Generation)

### Vector Storage with pgvector

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table with embeddings
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536),  -- OpenAI ada-002 dimension
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast similarity search
CREATE INDEX idx_documents_embedding
  ON documents USING hnsw (embedding vector_cosine_ops);

-- Similarity search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (id UUID, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### Embedding Generation

```typescript
// lib/ai/embeddings.ts
export async function generateEmbedding(text: string): Promise<number[]> {
  console.log("[embeddings] Generating for text length:", text.length);

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-ada-002",
      input: text,
    }),
  });

  const { data } = await response.json();
  return data[0].embedding;
}
```

### RAG Query Flow

```typescript
// actions/ai-search.ts
"use server";

export async function searchWithContext(query: string) {
  console.log("[ai-search] Query:", query);

  // 1. Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // 2. Find relevant documents
  const supabase = await createClient();
  const { data: docs } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 5,
  });

  console.log("[ai-search] Found documents:", docs?.length);

  // 3. Build context-enriched prompt
  const context = docs?.map((d) => d.content).join("\n\n") || "";
  
  const messages = [
    {
      role: "system",
      content: `Answer based on this context:\n\n${context}`,
    },
    { role: "user", content: query },
  ];

  // 4. Call LLM with context
  return callLLM(messages);
}
```

## Prompt Engineering

### System Prompt Template

```typescript
const systemPrompt = `You are a helpful assistant for [APP_NAME].

## Role
[Specific role and expertise]

## Rules
- Always respond in the user's language
- Be concise and direct
- Cite sources when available
- Say "I don't know" when uncertain

## Context
{dynamic_context_here}

## Output Format
[Specify expected format: markdown, JSON, etc.]`;
```

### Structured Output with Zod

```typescript
import { z } from "zod";

const AIResponseSchema = z.object({
  answer: z.string(),
  confidence: z.number().min(0).max(1),
  sources: z.array(z.string()),
  followUpQuestions: z.array(z.string()).max(3),
});

type AIResponse = z.infer<typeof AIResponseSchema>;

export async function getStructuredResponse(query: string): Promise<AIResponse> {
  const raw = await callLLM([
    { role: "system", content: "Respond in JSON matching this schema: " + JSON.stringify(AIResponseSchema.shape) },
    { role: "user", content: query },
  ]);

  return AIResponseSchema.parse(JSON.parse(raw));
}
```

## Cost & Performance Optimization

### Token Management

1. **Trim conversation history** -- keep last N messages + system prompt
2. **Summarize old context** -- compress long histories into summaries
3. **Cache embeddings** -- don't regenerate for unchanged content
4. **Use cheaper models** for simple tasks (gpt-4o-mini for classification)

### Rate Limiting

```sql
-- Usage tracking table
CREATE TABLE user_usage (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  requests_today INT NOT NULL DEFAULT 0,
  tokens_used_today INT NOT NULL DEFAULT 0,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Reset daily usage function
CREATE OR REPLACE FUNCTION reset_daily_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_reset_date < CURRENT_DATE THEN
    NEW.requests_today = 0;
    NEW.tokens_used_today = 0;
    NEW.last_reset_date = CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Model Selection Guide

| Task | Recommended Model | Why |
|------|-------------------|-----|
| Chat / complex reasoning | gpt-4o / claude-3.5-sonnet | Best quality |
| Simple classification | gpt-4o-mini | Fast, cheap |
| Embeddings | text-embedding-ada-002 | Standard |
| Code generation | gpt-4o / claude-3.5-sonnet | Best for code |
| Summarization | gpt-4o-mini | Good enough, cheaper |

## Error Handling for AI Calls

```typescript
export async function callLLMWithRetry(
  messages: Message[],
  maxRetries = 3
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[llm] Attempt ${attempt}/${maxRetries}`);
      const result = await callLLM(messages);
      console.log("[llm] Success, tokens:", result.usage);
      return result.content;
    } catch (error) {
      console.error(`[llm] Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) throw error;
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}
```
