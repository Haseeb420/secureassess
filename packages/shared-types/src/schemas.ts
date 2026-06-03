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

export const createAssessmentScheduleSchema = z
  .object({
    type:        z.enum(['open', 'deadline', 'window']),
    deadlineAt:  z.string().optional(),
    windowStart: z.string().optional(),
    windowEnd:   z.string().optional(),
    timezone:    z.string().default('Asia/Karachi'),
  })
  .refine(
    (d) => {
      if (d.type !== 'deadline') return true
      if (!d.deadlineAt) return false
      return new Date(d.deadlineAt) > new Date()
    },
    { message: 'Deadline must be set and in the future', path: ['deadlineAt'] },
  )
  .refine(
    (d) => {
      if (d.type !== 'window') return true
      if (!d.windowStart || !d.windowEnd) return false
      return new Date(d.windowEnd) > new Date(d.windowStart)
    },
    { message: 'Window end must be after window start', path: ['windowEnd'] },
  )

export type CreateAssessmentScheduleValues = z.infer<typeof createAssessmentScheduleSchema>
