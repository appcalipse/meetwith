import {
  PaymentChannel,
  PaymentType,
  PlanType,
  SessionType,
} from '@utils/constants/meeting-types'
import { z } from 'zod'

import { AcceptedToken } from '@/types/chains'

import { isValidEVMAddress } from './validations'

// Meeting Types

export const baseMeetingSchema = z.object({
  availability_ids: z.array(z.string()).min(1, {
    message: 'At least one availability block must be selected.',
  }),

  calendars: z.array(z.number()).optional(), // Array of calendar IDs
  custom_link: z.preprocess(
    val => (val === '' ? undefined : val),
    z.string().url('Invalid custom link URL').optional()
  ), // Optional custom link URL
  description: z
    .string()
    .max(500, 'Description must be under 500 characters')
    .optional(), // Optional with limit
  duration_minutes: z.number().min(15, 'Duration must be at least 15 minutes'), // Minimum 15 minutes
  fixed_link: z.boolean().optional(), // Optional boolean for fixed link
  meeting_platforms: z.array(z.string()).min(1, {
    message: 'At least one meeting platform must be selected.',
  }),
  min_notice_minutes: z.number().min(60, 'Minimum notice must be 1 hour'), // Minimum notice 1 hour

  plan: z
    .object({
      crypto_network: z.number().int().positive('Crypto network must be valid'), // Positive integer
      default_token: z.nativeEnum(AcceptedToken, {
        errorMap: () => ({ message: 'Invalid default token' }),
      }),

      no_of_slot: z
        .number({ message: 'Number of slots is required.' })
        .int()
        .min(1, 'At least 1 slot is required'), // At least 1 slot
      payment_address: z
        .string()
        .min(1, 'Payment address is required')
        .refine(
          val => isValidEVMAddress(val), // Example validation for Ethereum address
          'Invalid payment address. Must be a valid Ethereum address (e.g., 0x742d...)'
        ),
      payment_channel: z.nativeEnum(PaymentChannel, {
        errorMap: () => ({ message: 'Invalid payment channel' }),
      }), // PaymentChannel enum
      payment_methods: z
        .array(
          z.nativeEnum(PaymentType, {
            errorMap: () => ({ message: 'Invalid payment method' }),
          })
        )
        .optional(),
      price_per_slot: z
        .number({ message: 'Price per slot is required.' })
        .min(0.05, 'Price per slot must be greater than 0.05'), // Positive price
      type: z.nativeEnum(PlanType, {
        errorMap: () => ({ message: 'Invalid plan type' }),
      }), // PlanType enum
    })
    .optional(), // Plan object is optional

  scheduleGate: z.string().url('Invalid schedule gate URL').optional(), // Optional valid URL
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/, // Regex for alphanumeric with dashes
      'Slug must be alphanumeric with dashes'
    )
    .optional(), // Optional slug
  title: z.string().min(1, 'Title is required'), // Required string
  type: z.nativeEnum(SessionType, {
    errorMap: () => ({ message: 'Invalid session type' }),
  }), // SessionType enum
})

export const createMeetingSchema = baseMeetingSchema.superRefine(
  (data, ctx) => {
    if (data.fixed_link && !data.custom_link) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Custom link is required when fixed link is enabled',
        path: ['custom_link'], // Attach error to custom_link field
      })
    }
  }
)
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

      const planSchema = baseMeetingSchema.shape[topField]
        .unwrap()
        .pick({ [subField]: true } as { [K in keyof PlanKeys]?: true })

      planSchema.parse({ [subField]: value })
    } else {
      baseMeetingSchema
        .pick({ [field]: true } as Partial<Record<SchemaKeys, true>>)
        .parse({ [field]: value })
    }
    return { error: null, isValid: true }
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { error: e.errors[0].message, isValid: false }
    }
    return { error: 'Validation failed', isValid: false }
  }
}

// Payment Info Schema
export const paymentInfoSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
})
export type PaymentInfo = z.infer<typeof paymentInfoSchema>

export const validatePaymentInfo = (key: keyof PaymentInfo, data: unknown) => {
  try {
    paymentInfoSchema
      .pick({ [key]: true } as Partial<Record<keyof PaymentInfo, true>>)
      .parse({ [key]: data })
    return { error: null, isValid: true }
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { error: e.errors[0].message, isValid: false }
    }
    return { error: 'Validation failed', isValid: false }
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

export const quickPollSchema = z
  .object({
    description: z.string().optional(),
    duration: z.number().min(1, 'Duration must be at least 1 minute'),
    endDate: z.date(),
    expiryDate: z.date().optional(),
    expiryTime: z.date().optional(),
    participants: z.array(z.any()),
    removeExpiryDate: z.boolean().optional(),
    startDate: z.date(),
    title: z.string().min(1, 'Title is required'),
  })
  .refine(data => data.startDate < data.endDate, {
    message: 'Start date must be before end date',
    path: ['endDate'],
  })
  .refine(
    data => {
      if (data.removeExpiryDate) {
        return true
      }
      if (!data.expiryDate || !data.expiryTime) {
        return false
      }
      const year = data.expiryDate.getFullYear()
      const month = data.expiryDate.getMonth()
      const day = data.expiryDate.getDate()
      const hours = data.expiryTime.getHours()
      const minutes = data.expiryTime.getMinutes()
      const seconds = data.expiryTime.getSeconds()

      const expiryDateTime = new Date(year, month, day, hours, minutes, seconds)
      return expiryDateTime > new Date()
    },
    {
      message: 'Expiry date must be in the future',
      path: ['expiryDate'],
    }
  )

export type QuickPollFormData = z.infer<typeof quickPollSchema>
