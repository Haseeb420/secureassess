import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const inviteTokenSchema = z.object({
  token: z.string().min(1, 'Invite token is required'),
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type InviteTokenFormValues = z.infer<typeof inviteTokenSchema>
