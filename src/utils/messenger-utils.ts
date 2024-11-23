import { Messenger } from '../types/messenger'

/**
 * Convert a Messenger object into an array of strings.
 * If the Messenger is already an array, return it as is.
 * If it's a string, split it into an array of strings using '/' as the separator.
 * @param messenger The Messenger object
 * @returns An array of strings
 */
export function asArray(messenger: Messenger): string[] {
  if (Array.isArray(messenger)) {
    // If it's already an array, return it
    return normalize(messenger) as string[]
  } else {
    // If it's a string, split it into an array of strings
    return (normalize(messenger) as string)
      .split('/')
      .map((item) => item.trim())
      .filter(Boolean)
  }
}

/**
 * Convert a Messenger object into a string.
 * If the Messenger is already a string, return it as is.
 * If it's an array, join the elements into a single string using '/' as the separator.
 * @param messenger The Messenger object
 * @returns A string representation of the Messenger object
 */
export function asString(messenger: Messenger): string {
  if (typeof messenger === 'string') {
    // If it's already a string, return it
    return '/' + (normalize(messenger) as string)
  } else {
    // If it's an array, join the elements into a single string using '/' separator
    return (
      '/' +
      (normalize(messenger) as string[])
        .map((item) => item.trim())
        .filter(Boolean)
        .join('/')
    )
  }
}

/**
 * Normalize a Messenger object by applying path normalization techniques:
 * - Trim leading/trailing slashes
 * - Remove redundant slashes (multiple consecutive slashes)
 * - Remove empty segments
 * @param messenger The Messenger object (string or array)
 * @returns A normalized Messenger object (string or array)
 */
export function normalize(messenger: Messenger): Messenger {
  if (messenger === null || messenger === undefined) {
    throw new Error(`Invalid Messenger: ${messenger}`)
  }
  
  if (Array.isArray(messenger)) {
    return messenger
      .map((item) => item.trim()) // Trim each element in the array
      .filter(Boolean) // Remove any empty elements (e.g., "")
      .join('/') // Join into a string using '/'
      .split('/') // Split back into array to handle redundant slashes
      .filter(Boolean) // Remove any potential empty segments
  } else {
    // Normalize the string:
    // 1. Trim leading/trailing spaces first
    // 2. Trim leading/trailing slashes
    // 3. Replace multiple consecutive slashes with a single slash
    // 4. Remove any empty segments
    return messenger
      .trim() // Trim leading/trailing spaces
      .replace(/^\/+|\/+$/g, '') // Trim leading/trailing slashes
      .replace(/\/+/g, '/') // Replace multiple consecutive slashes with a single slash
      .split('/') // Split into segments
      .filter(Boolean) // Remove empty segments
      .join('/') // Rejoin into a normalized string with single slashes
  }
}

/**
 * Compares two Messenger objects to check if they are equivalent.
 * This function ensures both `messenger1` and `messenger2` are valid (not null or undefined)
 * and compares them as arrays.
 *
 * @param {Messenger} messenger1 The first Messenger to compare.
 * @param {Messenger} messenger2 The second Messenger to compare.
 * @returns {boolean} Returns `true` if both messengers are equal after converting them to strings,
 * otherwise returns `false`.
 */
export function areEqual(messenger1: Messenger, messenger2: Messenger): boolean {
  if (!messenger1 || !messenger2) {
    console.log(`[UTILS] areEqual (${messenger1}) (${messenger2}) NOT TRUTHFUL: returning false`)
    return false
  }

  console.log(`[UTILS] areEqual (${messenger1}) (${messenger2}) returning:`, asString(messenger1) === asString(messenger2))
  return asString(messenger1) === asString(messenger2)
}

/**
 * Determines if one Messenger (`there`) is upstream from another (`here`), based on their relative levels
 * in a hierarchical messenger structure.
 *
 * This function compares two Messenger objects and returns `true` if the second Messenger (`there`)
 * is upstream from the first Messenger (`here`), according to their hierarchical levels and names.
 * The comparison is made based on the level and name of the destination in each Messenger.
 *
 * A "higher" or "upstream" Messenger is considered to be a "parent" or "ancestor"
 * in the hierarchical structure, whereas a "lower" or "downstream" Messenger is a "child"
 * or "descendant".
 *
 * @param {Messenger} here The first Messenger to compare (the one that is the starting point).
 * @param {Messenger} there The second Messenger to compare (the one being checked to see if it is upstream or downstream).
 * @returns {boolean} Returns `true` if `there` is upstream from `here`, otherwise returns `false`.
 */
export function isUpstream(here: Messenger, there: Messenger): boolean {
  const from = asArray(here)
  const fromLevel = from.length

  const to = asArray(there)
  const toLevel = to.length
  
  if (toLevel < fromLevel) {
    return true
  }

  for (let i = 0; i < fromLevel; i++) {
    if (from[i] !== to[i]) {
      return true
    }
  }

  return false
}
