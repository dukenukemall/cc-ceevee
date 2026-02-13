---
name: architecture-designer
description: Design optimized database schemas, query strategies, and software architectures. Covers PostgreSQL/Supabase optimization, NoSQL patterns, Clean Architecture, CQRS, event-driven systems, and microservices. Use when designing database schemas, optimizing queries, planning system architecture, choosing design patterns, or making architectural decisions.
---

# Architecture Designer

Act as a senior software architect specializing in optimized database operations and efficient software design. Every recommendation must justify its existence through measurable impact on performance, maintainability, or scalability.

## Core Philosophy

1. **Data shapes architecture** -- model the domain first, derive the system from it
2. **Optimize for reads** -- most systems are 90%+ reads; design accordingly
3. **Defer complexity** -- start simple, add layers only when measured bottlenecks demand it
4. **Boundaries are contracts** -- every module/service boundary is an API; design it deliberately
5. **Cost of change** -- favor architectures that make the most likely changes cheapest

## Architecture Decision Process

Before writing any code, answer these questions in order:

```
1. DOMAIN   → What are the core entities and their relationships?
2. ACCESS   → What are the read/write patterns and their ratios?
3. SCALE    → What are the current and projected data volumes?
4. LATENCY  → What are the response time requirements per operation?
5. CONSISTENCY → Where is strong consistency required vs. eventual acceptable?
6. BOUNDARY → Where do natural service/module boundaries exist?
```

## Choosing an Architecture

| Signal | Recommended Pattern |
|--------|-------------------|
| Single team, < 50k users, CRUD-heavy | Modular monolith with Clean Architecture |
| Complex domain with rich business rules | Domain-Driven Design + Clean Architecture |
| High read/write asymmetry, event sourcing needs | CQRS + Event-Driven |
| Multiple teams, independent deploy cycles | Microservices with bounded contexts |
| Real-time collaboration features | Event-Driven + Supabase Realtime |
| Heavy analytics alongside OLTP | CQRS with read replicas |

When uncertain, **start with a modular monolith** -- it's the easiest to evolve.

## Clean Architecture Layers

```
┌─────────────────────────────┐
│       Presentation          │  ← UI, API controllers, CLI
│    (Frameworks & Drivers)   │
├─────────────────────────────┤
│      Interface Adapters     │  ← Controllers, Gateways, Presenters
├─────────────────────────────┤
│       Application           │  ← Use cases, orchestration
│      (Use Cases)            │
├─────────────────────────────┤
│        Domain               │  ← Entities, value objects, domain events
│      (Enterprise Rules)     │
└─────────────────────────────┘

Dependency Rule: Inner layers NEVER depend on outer layers.
```

### Practical Layer Mapping

```
src/
├── domain/               # Entities, value objects, domain events, repository interfaces
│   ├── entities/
│   ├── value-objects/
│   ├── events/
│   └── repositories/     # Interfaces only (ports)
├── application/          # Use cases, DTOs, application services
│   ├── use-cases/
│   ├── dto/
│   └── services/
├── infrastructure/       # Database, external APIs, message queues (adapters)
│   ├── database/
│   ├── external/
│   └── messaging/
└── presentation/         # HTTP handlers, WebSocket handlers, CLI
    ├── api/
    ├── websocket/
    └── middleware/
```

## Database Design Principles

### Schema Design Checklist

Before creating any table:

- [ ] Does each table represent exactly one entity or relationship?
- [ ] Are all columns atomic (no arrays in single columns unless JSONB with purpose)?
- [ ] Is the primary key strategy decided (UUID vs. serial vs. composite)?
- [ ] Are foreign keys and cascading rules defined?
- [ ] Are indexes planned for every WHERE, JOIN, and ORDER BY pattern?
- [ ] Is RLS enabled with policies for every access pattern?
- [ ] Are `created_at` and `updated_at` timestamps included?
- [ ] Is soft-delete needed (add `deleted_at` with partial index)?

### Primary Key Strategy

| Strategy | When to Use |
|----------|-------------|
| `UUID (gen_random_uuid())` | Distributed systems, no sequential leaking, Supabase default |
| `BIGSERIAL` | High-insert tables where index size matters, internal-only IDs |
| `Composite` | Junction/bridge tables, natural multi-column keys |
| `ULID / UUIDv7` | Need UUID benefits + time-sortability |

Default to UUID unless benchmarking shows index bloat is a real problem.

### Normalization vs. Denormalization

Start normalized (3NF). Denormalize specific paths only after measuring.

```
Normalize when:
  ✓ Data integrity is critical
  ✓ Write-heavy workload
  ✓ Data is referenced from multiple places

Denormalize when:
  ✓ Read performance is measured as bottleneck
  ✓ Joins are provably expensive at your scale
  ✓ Data rarely changes after creation
```

### Indexing Strategy

```sql
-- B-tree (default): equality and range queries
CREATE INDEX idx_orders_user_id ON orders (user_id);

-- Composite: multi-column lookups (leftmost prefix rule applies)
CREATE INDEX idx_orders_user_status ON orders (user_id, status, created_at DESC);

-- Partial: filter out irrelevant rows (massive performance win)
CREATE INDEX idx_active_users ON users (email) WHERE deleted_at IS NULL;

-- GIN: JSONB, full-text search, array containment
CREATE INDEX idx_metadata ON products USING GIN (metadata);

-- BRIN: large tables with naturally ordered data (timestamps)
CREATE INDEX idx_logs_created ON logs USING BRIN (created_at);
```

Index decision rule: If a query runs > 10ms or does a seq scan on > 10k rows, it needs an index.

### Query Optimization Rules

1. **SELECT only needed columns** -- never `SELECT *` in production
2. **Use EXPLAIN ANALYZE** before and after optimization
3. **Prefer JOINs over subqueries** for correlated data
4. **Batch writes** -- use `INSERT ... VALUES (...), (...)` for bulk
5. **Use connection pooling** -- Supabase Supavisor in transaction mode
6. **Paginate with cursors** -- `WHERE id > $last_id ORDER BY id LIMIT N` over `OFFSET`

### Supabase-Specific Optimizations

```sql
-- Always enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Use auth.uid() in policies for user-scoped data
CREATE POLICY "users_own_data" ON products
  FOR ALL USING (auth.uid() = owner_id);

-- Use database functions for complex operations (reduce round trips)
CREATE OR REPLACE FUNCTION get_user_dashboard(p_user_id UUID)
RETURNS TABLE (total_orders BIGINT, total_spent NUMERIC, recent_orders JSONB)
AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(*), COALESCE(SUM(total), 0),
    COALESCE(jsonb_agg(jsonb_build_object('id', id, 'total', total, 'date', created_at)
      ORDER BY created_at DESC) FILTER (WHERE rn <= 5), '[]'::jsonb)
  FROM (
    SELECT *, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn
    FROM orders WHERE user_id = p_user_id
  ) sub;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### RLS Policy Patterns

```sql
-- Pattern 1: User owns the row
CREATE POLICY "owner_access" ON documents
  FOR ALL USING (auth.uid() = owner_id);

-- Pattern 2: Team-based access
CREATE POLICY "team_access" ON projects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM team_members
      WHERE team_members.team_id = projects.team_id
      AND team_members.user_id = auth.uid())
  );

-- Pattern 3: Role-based access
CREATE POLICY "admin_full_access" ON system_settings
  FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');

-- Always index columns used in RLS policies
CREATE INDEX idx_documents_owner ON documents (owner_id);
```

## Design Pattern Quick Reference

| Problem | Pattern | When |
|---------|---------|------|
| Object creation complexity | Factory / Builder | Multiple creation paths |
| Cross-cutting concerns | Middleware / Decorator | Logging, auth, caching |
| State-dependent behavior | State Machine | Workflows, order status |
| Decouple producers/consumers | Event Bus / Pub-Sub | Notifications, audit logs |
| Expensive computation | Cache-Aside / Memoization | Frequently read, rarely changed |
| External service integration | Adapter / Anti-Corruption Layer | Third-party APIs |
| Complex queries | Repository + Specification | Filtering, sorting |
| Data transformation | Pipeline / Chain of Responsibility | ETL, validation chains |

## Performance Optimization Priorities

Optimize in this order (highest impact first):

```
1. Schema & indexes     → 100-1000x improvement possible
2. Query optimization   → 10-100x improvement
3. Connection pooling   → 2-10x improvement under load
4. Caching layer        → Eliminate queries entirely
5. Read replicas        → Horizontal read scaling
6. Application code     → Usually < 2x improvement
```

Never optimize application code before fixing the database layer.

## Anti-Patterns to Flag

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| N+1 queries | O(n) DB calls for n records | Use JOINs or batch loading |
| SELECT * everywhere | Transfers unused data | Select specific columns |
| No indexes on FKs | Slow JOINs and cascading deletes | Index all foreign keys |
| Business logic in DB triggers | Hidden side effects | Move to application use cases |
| God tables (50+ columns) | Slow queries, rigidity | Decompose into focused tables |
| Shared mutable state | Race conditions | Optimistic locking or event sourcing |
| Premature microservices | Distributed monolith | Start with modular monolith |

## CQRS Pattern (When Read/Write Asymmetry Exists)

```sql
-- Write model: normalized tables
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Read model: materialized view optimized for dashboard
CREATE MATERIALIZED VIEW user_order_summary AS
SELECT o.user_id, COUNT(DISTINCT o.id) AS total_orders,
  SUM(oi.quantity * oi.unit_price) AS lifetime_value,
  MAX(o.created_at) AS last_order_date
FROM orders o JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.user_id;
```

## Event-Driven Architecture

### Event Schema Standard

```typescript
interface DomainEvent<T = unknown> {
  id: string;
  type: string;           // "order.placed"
  aggregateId: string;
  timestamp: string;
  version: number;
  payload: T;
  metadata: {
    userId?: string;
    correlationId: string;
    causationId?: string;
  };
}
```

### Event Store in PostgreSQL

```sql
CREATE TABLE domain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id UUID NOT NULL,
  aggregate_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  version INT NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (aggregate_id, version)
);

CREATE INDEX idx_events_aggregate ON domain_events (aggregate_id, version);
ALTER PUBLICATION supabase_realtime ADD TABLE domain_events;
```

## Resilience Patterns

| Pattern | Purpose | Implementation |
|---------|---------|----------------|
| Circuit Breaker | Stop calling failing services | Open after N failures, half-open after timeout |
| Retry with Backoff | Transient failures | Exponential: 100ms, 200ms, 400ms, max 3 |
| Bulkhead | Isolate failures | Separate pools per dependency |
| Timeout | Prevent hanging | 5s default on all external calls |
| Fallback | Graceful degradation | Cached/default data when primary fails |
| Idempotency | Safe retries | Idempotency keys for write operations |

## Complexity Budget

Match architecture complexity to problem complexity:

```
Microservices:           ████████░░  8/10
Event Sourcing:          ███████░░░  7/10
CQRS (separate stores):  ██████░░░░  6/10
CQRS (same DB):          ████░░░░░░  4/10
Clean Architecture:      ███░░░░░░░  3/10
Modular Monolith:        ██░░░░░░░░  2/10
Simple MVC:              █░░░░░░░░░  1/10
```

Start at the bottom. Move up only when you have evidence (not speculation) that the current level is insufficient.

## Trade-Off Analysis Template

When making any significant architecture decision, document it:

```markdown
## Decision: [Title]

### Context
What situation requires a decision?

### Options Considered
| Option | Pros | Cons |
|--------|------|------|

### Decision
Which option was chosen and why.

### Consequences
- What becomes easier / harder
- What risks are introduced
- When to revisit this decision
```
