import { z } from 'zod'

export const structuredJDSchema = z.object({
  title: z.string().optional(),
  department: z.string().optional(),
  locations: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  preferred: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  education: z.string().optional(),
  graduationRequirement: z.string().optional(),
  other: z.array(z.string()).optional().default([]),
})
