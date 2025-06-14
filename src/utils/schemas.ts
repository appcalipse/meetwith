import {
  PaymentChannel,
  PlanType,
  SessionType,
} from '@utils/constants/meeting-types'
import { z } from 'zod'

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
