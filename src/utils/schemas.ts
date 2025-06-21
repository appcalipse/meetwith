import {
  PaymentChannel,
  PlanType,
  SessionType,
} from '@utils/constants/meeting-types'
import { z } from 'zod'

// Meeting Types

export const createMeetingSchema = z.object({
  title: z.string().min(1, 'Title is required'), // Required string
  description: z
    .string()
    .max(500, 'Description must be under 500 characters')
    .optional(), // Optional with limit
  type: z.nativeEnum(SessionType, {
    errorMap: () => ({ message: 'Invalid session type' }),
  }), // SessionType enum
  duration_minutes: z.number().min(15, 'Duration must be at least 15 minutes'), // Minimum 15 minutes
  min_notice_minutes: z.number().min(60, 'Minimum notice must be 1 hour'), // Minimum notice 1 hour

  scheduleGate: z.string().url('Invalid schedule gate URL').optional(), // Optional valid URL
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/, // Regex for alphanumeric with dashes
      'Slug must be alphanumeric with dashes'
    )
    .optional(), // Optional slug
  availability_ids: z.array(z.string()).min(1, {
    message: 'At least one availability block must be selected.',
  }),

  calendars: z
    .array(z.number())
    .min(1, 'At least one calendar must be selected')
    .optional(), // Array of calendar IDs

  plan: z
    .object({
      type: z.nativeEnum(PlanType, {
        errorMap: () => ({ message: 'Invalid plan type' }),
      }), // PlanType enum
      price_per_slot: z
        .number({ message: 'Price per slot is required.' })
        .min(0.1, 'Price per slot must be greater than 0.'), // Positive price

      no_of_slot: z
        .number({ message: 'Number of slots is required.' })
        .int()
        .min(1, 'At least 1 slot is required'), // At least 1 slot
      payment_channel: z.nativeEnum(PaymentChannel, {
        errorMap: () => ({ message: 'Invalid payment channel' }),
      }), // PaymentChannel enum
      payment_address: z
        .string()
        .min(1, 'Payment address is required')
        .refine(
          val => !!val.match(/^0x[a-fA-F0-9]{40}$/), // Example validation for Ethereum address
          'Invalid payment address (must be a valid address)'
        ),
      crypto_network: z.number().int().positive('Crypto network must be valid'), // Positive integer
    })
    .optional(), // Plan object is optional
})

export type SchemaKeys = keyof z.infer<typeof createMeetingSchema>
export type PlanKeys = NonNullable<z.infer<typeof createMeetingSchema>['plan']>

export type ErrorState<T extends string, J extends string, P> = {
  [K in T]?: K extends J ? Partial<Record<keyof P, string>> : string
}
export type PlanFieldKey = `plan.${keyof PlanKeys}`
export type fieldKey = SchemaKeys | PlanFieldKey
const isPlanFieldKey = (field: fieldKey): field is PlanFieldKey => {
  return field.startsWith('plan.')
}
export type ErrorAction<T> =
  | { type: 'SET_ERROR'; field: T; message: string } // Set error for a specific field
  | { type: 'CLEAR_ERROR'; field: T } // Clear error for a specific field
  | { type: 'CLEAR_ALL' } // Clear all errors at once

// TODO: Make this generic so it can be used across all instances required without re-writing

export const errorReducer = (
  state: ErrorState<SchemaKeys, 'plan', PlanKeys>,
  action: ErrorAction<fieldKey>
): ErrorState<SchemaKeys, 'plan', PlanKeys> => {
  switch (action.type) {
    case 'SET_ERROR':
      if (isPlanFieldKey(action.field)) {
        const [field, subField] = action.field.split('.') as [
          SchemaKeys,
          string
        ]
        const existingField = state[field] as Record<string, string> | undefined
        return {
          ...state,
          [field]: {
            ...(existingField || {}),
            [subField]: action.message,
          },
        }
      }
      return {
        ...state,
        [action.field]: action.message,
      }
    case 'CLEAR_ERROR':
      if (isPlanFieldKey(action.field)) {
        const [localField, subField] = action.field.split('.') as [
          SchemaKeys,
          string
        ]
        const existingField = state[localField] as
          | Record<string, string>
          | undefined
        return {
          ...state,
          [localField]: {
            ...(existingField || {}),
            [subField]: undefined,
          },
        }
      } else {
        const { [action.field]: _, ...rest } = state // Clear error for a specific field
        return rest
      }
    case 'CLEAR_ALL':
      return {} // Clear all errors
    default:
      return state
  }
}
export const validateField = /*<T, J>*/ (
  field: fieldKey,
  value: unknown
  // schema: z.Schema
) => {
  try {
    if (isPlanFieldKey(field)) {
      const [topField, subField] = field.split('.') as ['plan', keyof PlanKeys]

      const planSchema = createMeetingSchema.shape[topField]
        .unwrap()
        .pick({ [subField]: true } as { [K in keyof PlanKeys]?: true })

      planSchema.parse({ [subField]: value })
    } else {
      createMeetingSchema
        .pick({ [field]: true } as Partial<Record<SchemaKeys, true>>)
        .parse({ [field]: value })
    }
    return { isValid: true, error: null }
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { isValid: false, error: e.errors[0].message }
    }
    return { isValid: false, error: 'Validation failed' }
  }
}

// Payment Info Schema
export const paymentInfoSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
})
export type PaymentInfo = z.infer<typeof paymentInfoSchema>

export const validatePaymentInfo = (key: keyof PaymentInfo, data: unknown) => {
  try {
    paymentInfoSchema
      .pick({ [key]: true } as Partial<Record<keyof PaymentInfo, true>>)
      .parse({ [key]: data })
    return { isValid: true, error: null }
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { isValid: false, error: e.errors[0].message }
    }
    return { isValid: false, error: 'Validation failed' }
  }
}

export const errorReducerSingle = (
  state: ErrorState<keyof PaymentInfo, '', never>,
  action: ErrorAction<keyof PaymentInfo>
): ErrorState<keyof PaymentInfo, '', never> => {
  switch (action.type) {
    case 'SET_ERROR':
      return {
        ...state,
        [action.field]: action.message,
      }
    case 'CLEAR_ERROR':
      const { [action.field]: _, ...rest } = state // Clear error for a specific field
      return rest
    case 'CLEAR_ALL':
      return {} // Clear all errors
    default:
      return state
  }
}
