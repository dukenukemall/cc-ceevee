# Supabase, Database & Migration Guide

## Supabase Client Setup

### Browser Client

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Server Client

```typescript
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

### Middleware (Auth)

```typescript
// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

## Database Design

### Table Creation Checklist

Every table must have:
1. `id` -- UUID primary key with `gen_random_uuid()`
2. `created_at` -- timestamptz with `NOW()` default
3. `updated_at` -- timestamptz with auto-update trigger
4. RLS enabled with appropriate policies
5. Indexes on foreign keys and frequently queried columns

### Standard Table Template

```sql
CREATE TABLE table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- domain columns here --
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Auto-update timestamp
CREATE TRIGGER update_table_name_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index on foreign key
CREATE INDEX idx_table_name_user_id ON table_name(user_id);
```

### Common Auto-Update Trigger

```sql
-- Create once, reuse across all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Row Level Security (RLS)

### Always enable RLS on user data tables.

```sql
-- Users can CRUD their own data
CREATE POLICY "Users manage own data"
  ON table_name FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public read, authenticated write
CREATE POLICY "Public read" ON posts
  FOR SELECT USING (published = true);

CREATE POLICY "Authors manage own posts" ON posts
  FOR ALL
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Role-based access
CREATE POLICY "Admin full access" ON table_name
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

## Migrations

### Naming Convention

```
YYYYMMDDHHMMSS_descriptive_snake_case_name.sql
```

Examples:
- `20250213120000_create_profiles_table.sql`
- `20250213120100_add_rls_to_profiles.sql`
- `20250213120200_create_products_table.sql`

### Migration Best Practices

1. **One concern per migration** -- don't mix table creation with data migration
2. **Always include rollback** -- add `DOWN` migration or document reversal
3. **Test locally first** -- use `supabase db reset` to verify
4. **Never modify existing migrations** -- create new ones instead
5. **Use transactions** -- wrap multi-statement migrations in `BEGIN/COMMIT`

### Migration Template

```sql
-- Migration: create_products_table
-- Description: Creates the products table with RLS policies

BEGIN;

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active products" ON products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Creators manage own products" ON products
  FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_created_by ON products(created_by);

COMMIT;
```

## Edge Functions

```typescript
// supabase/functions/my-function/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  // Validate JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Business logic here
  const body = await req.json();
  console.log("[my-function] Processing:", { userId: user.id, body });

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

## Realtime Subscriptions

```typescript
// hooks/useRealtimeMessages.ts
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeMessages(channelId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          console.log("[realtime] New message:", payload.new);
          queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient, supabase]);
}
```

## Performance Indexes

```sql
-- Always index foreign keys
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- Composite index for common queries
CREATE INDEX idx_messages_conversation_created
  ON messages(conversation_id, created_at DESC);

-- Partial index for active records
CREATE INDEX idx_products_active ON products(category)
  WHERE is_active = true;

-- JSONB index for metadata queries
CREATE INDEX idx_messages_metadata ON messages USING GIN(metadata);

-- Full-text search
ALTER TABLE products ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', name || ' ' || coalesce(description, ''))) STORED;
CREATE INDEX idx_products_fts ON products USING GIN(fts);
```

## Security Checklist

- [ ] RLS enabled on all user-data tables
- [ ] JWT validated in Edge Functions
- [ ] API keys in environment variables only
- [ ] Rate limiting on expensive operations
- [ ] Input validated with Zod before DB operations
- [ ] No sensitive data in client-accessible columns
- [ ] Audit logging on critical operations
- [ ] Service role key NEVER exposed to client
