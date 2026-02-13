"use server";

/**
 * Example server action.
 * Group server actions by feature: users.ts, products.ts, etc.
 */
export async function exampleAction(formData: FormData) {
  const name = formData.get("name") as string;
  console.log("[exampleAction] Called with:", { name });

  // Replace with actual logic
  return { success: true, message: `Hello, ${name}!` };
}
