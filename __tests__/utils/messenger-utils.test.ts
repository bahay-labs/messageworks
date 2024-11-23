import { asArray, asString, normalize, areEqual, isUpstream } from '../../src/utils/messenger-utils'
import { Messenger } from '../../src/types/messenger'

describe('Messenger Utils', () => {
  describe('asArray', () => {
    it('should convert string to array', () => {
      expect(asArray('earth/continent/country')).toEqual(['earth', 'continent', 'country'])
    })

    it('should return array as is', () => {
      expect(asArray(['earth', 'continent', 'country'])).toEqual(['earth', 'continent', 'country'])
    })

    it('should normalize and return a clean array from string', () => {
      expect(asArray('  /earth///continent/country// ')).toEqual(['earth', 'continent', 'country'])
    })

    it('should handle empty string input', () => {
      expect(asArray('')).toEqual([])
    })

    it('should handle null input gracefully', () => {
      expect(() => asArray(null as any)).toThrow()
    })

    it('should handle undefined input gracefully', () => {
      expect(() => asArray(undefined as any)).toThrow()
    })
  })

  describe('asString', () => {
    it('should convert array to string', () => {
      expect(asString(['earth', 'continent', 'country'])).toBe('/earth/continent/country')
    })

    it('should return string as is', () => {
      expect(asString('/earth/continent/country')).toBe('/earth/continent/country')
    })

    it('should normalize and return a clean string from array', () => {
      expect(asString(['  earth', 'continent  ', ' country '])).toBe('/earth/continent/country')
    })

    it('should handle empty array input', () => {
      expect(asString([])).toBe('/')
    })

    it('should handle null input gracefully', () => {
      expect(() => asString(null as any)).toThrow()
    })

    it('should handle undefined input gracefully', () => {
      expect(() => asString(undefined as any)).toThrow()
    })
  })

  describe('normalize', () => {
    it('should normalize string paths', () => {
      expect(normalize('  /earth///continent/country// ')).toBe('earth/continent/country')
    })

    it('should normalize array paths', () => {
      expect(normalize(['  earth', 'continent  ', ' country '])).toEqual([
        'earth',
        'continent',
        'country',
      ])
    })

    it('should remove leading/trailing slashes from strings', () => {
      expect(normalize('/earth/continent/')).toBe('earth/continent')
    })

    it('should collapse multiple slashes into one', () => {
      expect(normalize('///earth///continent///country///')).toBe('earth/continent/country')
    })

    it('should handle empty segments in strings', () => {
      expect(normalize('/earth//continent///country')).toBe('earth/continent/country')
    })

    it('should handle empty segments in arrays', () => {
      expect(normalize(['earth', '', 'continent', '', 'country'])).toEqual([
        'earth',
        'continent',
        'country',
      ])
    })

    it('should handle null input gracefully', () => {
      expect(() => normalize(null as any)).toThrow()
    })

    it('should handle undefined input gracefully', () => {
      expect(() => normalize(undefined as any)).toThrow()
    })

    it('should not throw an error for valid messengers (including empty strings or arrays)', () => {
      expect(normalize('')).toBe('');  // Empty string is valid
      expect(normalize([])).toEqual([]);  // Empty array is valid
      expect(normalize('some valid value')).toBe('some valid value');  // Regular string is valid
      expect(normalize(['workflow1', 'step1'])).toEqual(['workflow1', 'step1']);  // Regular array is valid
    });
  })

  describe('areEqual', () => {
    it('should return true if both messengers are equal', () => {
      const messenger1: Messenger = ['workflow1', 'step1']
      const messenger2: Messenger = ['workflow1', 'step1']

      expect(areEqual(messenger1, messenger2)).toBe(true)
    })

    it('should return false if messengers are different in length', () => {
      const messenger1: Messenger = ['workflow1', 'step1']
      const messenger2: Messenger = ['workflow1']

      expect(areEqual(messenger1, messenger2)).toBe(false)
    })

    it('should return false if messengers are different in name', () => {
      const messenger1: Messenger = ['workflow1', 'step1']
      const messenger2: Messenger = ['workflow1', 'step2']

      expect(areEqual(messenger1, messenger2)).toBe(false)
    })
  })

  describe('isUpstream', () => {
    it('should return true if "there" is upstream from "here"', () => {
      const here: Messenger = ['workflow1', 'step1']
      const there: Messenger = ['workflow1']

      expect(isUpstream(here, there)).toBe(true)
    })

    it('should return false if "there" is not upstream from "here"', () => {
      const here: Messenger = ['workflow1']
      const there: Messenger = ['workflow1', 'step1']

      expect(isUpstream(here, there)).toBe(false)
    })

    it('should return true if "there" is at the same level as "here" but has a different name', () => {
      const here: Messenger = ['workflow1', 'step1']
      const there: Messenger = ['workflow1', 'step2']

      expect(isUpstream(here, there)).toBe(true)
    })

    it('should return false if "there" and "here" are the same', () => {
      const here: Messenger = ['workflow1', 'step1']
      const there: Messenger = ['workflow1', 'step1']

      expect(isUpstream(here, there)).toBe(false)
    })
  })
})
