import { z } from "zod";

// Common reusable schemas
export const emailSchema = z.string().email("Please enter a valid email");
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters");
export const nameSchema = z.string().min(1, "Name is required").max(100);

// Auth schemas
export const LoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const SignupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Inferred types
export type LoginInput = z.infer<typeof LoginSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;
