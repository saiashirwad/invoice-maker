import { z } from 'zod'

export const lineItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'Description is required'),
  unitCost: z.string().min(1, 'Required'),
  quantity: z.string().min(1, 'Required'),
})

export type LineItemFormValues = z.infer<typeof lineItemSchema>
