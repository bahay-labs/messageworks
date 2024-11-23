import { v4 } from 'uuid'

/**
 * Generates a new UUID
 * @returns {UUIDTypes} The generated UUID
 */
export function generateUUID(): string {
  return v4()
}
