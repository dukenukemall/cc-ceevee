# Next.js and React Patterns

## Next.js App Router

### Server Components (default)

Use for: data fetching, SEO content, static layouts.

```tsx
// app/products/page.tsx -- Server Component (no "use client")
import { getProducts } from "@/actions/products";
import { ProductList } from "@/components/products/ProductList";

export default async function ProductsPage() {
  const products = await getProducts();
  return <ProductList products={products} />;
}
```

### Client Components

Use for: interactivity, hooks, browser APIs, event handlers.

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <Button onClick={() => setCount((c) => c + 1)}>
      Count: {count}
    </Button>
  );
}
```

### Server Actions

Preferred over API routes for mutations. Always validate input with Zod.

```typescript
// actions/users.ts
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
});

export async function createUser(formData: FormData) {
  console.log("[createUser] Starting");

  const parsed = CreateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    console.log("[createUser] Validation failed:", parsed.error.flatten());
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .insert(parsed.data)
    .select()
    .single();

  console.log("[createUser] Result:", { data, error });

  if (error) return { error: error.message };

  revalidatePath("/users");
  return { data };
}
```

### Route Groups and Layouts

```
app/
  (auth)/              # Grouped auth routes (no URL prefix)
    layout.tsx         # Auth-specific layout
    login/page.tsx
    register/page.tsx
  (dashboard)/         # Grouped dashboard routes
    layout.tsx         # Dashboard layout with sidebar
    settings/page.tsx
  layout.tsx           # Root layout
  page.tsx             # Home page
```

### Loading and Error States

```tsx
// app/products/loading.tsx -- Automatic loading UI
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-48 w-full rounded-lg" />
      ))}
    </div>
  );
}
```

```tsx
// app/products/error.tsx -- Automatic error boundary
"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="text-center py-10">
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={reset} className="mt-4">Try again</Button>
    </div>
  );
}
```

### Metadata and SEO

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products | MyApp",
  description: "Browse our product catalog",
  openGraph: { title: "Products", description: "Browse our catalog" },
};
```

## React Patterns

### Custom Hooks (one per file, under 50 lines)

```typescript
// hooks/useProducts.ts
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/actions/products";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
    staleTime: 5 * 60 * 1000,
  });
}
```

### TanStack Query Configuration

```typescript
// Always use object format
const { data, isLoading, error } = useQuery({
  queryKey: ["users", userId],
  queryFn: () => fetchUser(userId),
  enabled: !!userId,
});

// Mutations with toast feedback
const mutation = useMutation({
  mutationFn: createUser,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    toast.success("User created");
  },
  meta: {
    onError: (error: Error) => {
      toast.error(error.message);
    },
  },
});
```

### Forms with react-hook-form and Zod

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const FormSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

type FormValues = z.infer<typeof FormSchema>;

export function UserForm({ onSubmit }: { onSubmit: (data: FormValues) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input {...register("name")} placeholder="Name" />
      {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
      <Input {...register("email")} placeholder="Email" />
      {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit"}
      </Button>
    </form>
  );
}
```

### Redux Toolkit Slices

```typescript
// store/slices/cartSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
}

const initialState: CartState = { items: [] };

export const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      state.items.push(action.payload);
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    clearCart: (state) => {
      state.items = [];
    },
  },
});

export const { addItem, removeItem, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
```

## Performance Patterns

### Dynamic Imports

```tsx
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const HeavyChart = dynamic(() => import("@/components/charts/HeavyChart"), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false,
});
```

### Image Optimization

```tsx
import Image from "next/image";

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority
  className="object-cover"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### Memoization (only when profiler confirms re-render issues)

```tsx
import { memo, useMemo, useCallback } from "react";

const MemoizedList = memo(ProductList);
const expensiveValue = useMemo(() => computeExpensive(data), [data]);
const stableCallback = useCallback((id: string) => handleClick(id), []);
```
