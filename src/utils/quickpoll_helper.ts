import { QUICKPOLL_SLUG_MAX_LENGTH } from './constants'

// Generate a unique slug for a poll based on title and random characters
export const generatePollSlug = (title: string): string => {
  // Create base slug from title
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
    .substring(0, QUICKPOLL_SLUG_MAX_LENGTH) // Limit length

  // Add random characters for uniqueness
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  return `${baseSlug}-${randomSuffix}`
}
