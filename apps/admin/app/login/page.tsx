"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Mail, Lock } from "lucide-react"
import { toast } from "sonner"
import { signIn } from "@/lib/auth-client"
import { FormField, Input, Alert, Button } from "@secureassess/ui"

const schema = z.object({
  email:    z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
  })

  const onSubmit = async (data: FormValues) => {
    setServerError("")
    const result = await signIn.email({
      email: data.email,
      password: data.password,
      callbackURL: "/dashboard",
    })
    if (result.error) {
      setServerError(result.error.message ?? "Invalid email or password")
    } else {
      toast.success("Signed in successfully")
      router.push("/dashboard")
    }
  }

  return (
    <div className="min-h-screen bg-brand-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">SecureAssess</h1>
          <p className="mt-1 text-sm text-brand-navy/60">Admin Portal</p>
        </div>

        <div className="rounded-xl border border-brand-border bg-white shadow-sm p-8">
          <h2 className="mb-6 text-base font-semibold text-brand-navy">Sign in to your account</h2>

          {serverError && (
            <Alert variant="error" className="mb-4">{serverError}</Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <FormField label="Email" required error={errors.email?.message}>
              <Input
                type="email"
                placeholder="admin@example.com"
                leftIcon={Mail}
                disabled={isSubmitting}
                error={!!errors.email}
                aria-required="true"
                {...register("email")}
              />
            </FormField>

            <FormField label="Password" required error={errors.password?.message}>
              <Input
                type="password"
                placeholder="••••••••"
                leftIcon={Lock}
                disabled={isSubmitting}
                error={!!errors.password}
                aria-required="true"
                {...register("password")}
              />
            </FormField>

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="w-full mt-2"
            >
              {isSubmitting ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
