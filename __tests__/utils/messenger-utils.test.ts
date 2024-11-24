import { messengerAsArray, messengerAsString, normalizeMessenger, messengersAreEqual, messengerIsUpstream } from '../../src/utils/messenger-utils'
import { Messenger } from '../../src/types/messenger'

describe('Messenger Utils', () => {
  describe('asArray', () => {
    it('should convert string to array', () => {
      expect(messengerAsArray('earth/continent/country')).toEqual(['earth', 'continent', 'country'])
    })

    it('should return array as is', () => {
      expect(messengerAsArray(['earth', 'continent', 'country'])).toEqual(['earth', 'continent', 'country'])
    })

    it('should normalize and return a clean array from string', () => {
      expect(messengerAsArray('  /earth///continent/country// ')).toEqual(['earth', 'continent', 'country'])
    })

    it('should handle empty string input', () => {
      expect(messengerAsArray('')).toEqual([])
    })

    it('should handle null input gracefully', () => {
      expect(() => messengerAsArray(null as any)).toThrow()
    })

    it('should handle undefined input gracefully', () => {
      expect(() => messengerAsArray(undefined as any)).toThrow()
    })
  })

  describe('asString', () => {
    it('should convert array to string', () => {
      expect(messengerAsString(['earth', 'continent', 'country'])).toBe('/earth/continent/country')
    })

    it('should return string as is', () => {
      expect(messengerAsString('/earth/continent/country')).toBe('/earth/continent/country')
    })

    it('should normalize and return a clean string from array', () => {
      expect(messengerAsString(['  earth', 'continent  ', ' country '])).toBe('/earth/continent/country')
    })

    it('should handle empty array input', () => {
      expect(messengerAsString([])).toBe('/')
    })

    it('should handle null input gracefully', () => {
      expect(() => messengerAsString(null as any)).toThrow()
    })

    it('should handle undefined input gracefully', () => {
      expect(() => messengerAsString(undefined as any)).toThrow()
    })
  })

  describe('normalize', () => {
    it('should normalize string paths', () => {
      expect(normalizeMessenger('  /earth///continent/country// ')).toBe('earth/continent/country')
    })

    it('should normalize array paths', () => {
      expect(normalizeMessenger(['  earth', 'continent  ', ' country '])).toEqual([
        'earth',
        'continent',
        'country',
      ])
    })

    it('should remove leading/trailing slashes from strings', () => {
      expect(normalizeMessenger('/earth/continent/')).toBe('earth/continent')
    })

    it('should collapse multiple slashes into one', () => {
      expect(normalizeMessenger('///earth///continent///country///')).toBe('earth/continent/country')
    })

    it('should handle empty segments in strings', () => {
      expect(normalizeMessenger('/earth//continent///country')).toBe('earth/continent/country')
    })

    it('should handle empty segments in arrays', () => {
      expect(normalizeMessenger(['earth', '', 'continent', '', 'country'])).toEqual([
        'earth',
        'continent',
        'country',
      ])
    })

    it('should handle null input gracefully', () => {
      expect(() => normalizeMessenger(null as any)).toThrow()
    })

    it('should handle undefined input gracefully', () => {
      expect(() => normalizeMessenger(undefined as any)).toThrow()
    })

    it('should not throw an error for valid messengers (including empty strings or arrays)', () => {
      expect(normalizeMessenger('')).toBe('');  // Empty string is valid
      expect(normalizeMessenger([])).toEqual([]);  // Empty array is valid
      expect(normalizeMessenger('some valid value')).toBe('some valid value');  // Regular string is valid
      expect(normalizeMessenger(['workflow1', 'step1'])).toEqual(['workflow1', 'step1']);  // Regular array is valid
    });
  })

  describe('areEqual', () => {
    it('should return true if both messengers are equal', () => {
      const messenger1: Messenger = ['workflow1', 'step1']
      const messenger2: Messenger = ['workflow1', 'step1']

      expect(messengersAreEqual(messenger1, messenger2)).toBe(true)
    })

    it('should return false if messengers are different in length', () => {
      const messenger1: Messenger = ['workflow1', 'step1']
      const messenger2: Messenger = ['workflow1']

      expect(messengersAreEqual(messenger1, messenger2)).toBe(false)
    })

    it('should return false if messengers are different in name', () => {
      const messenger1: Messenger = ['workflow1', 'step1']
      const messenger2: Messenger = ['workflow1', 'step2']

      expect(messengersAreEqual(messenger1, messenger2)).toBe(false)
    })
  })

  describe('isUpstream', () => {
    it('should return true if "there" is upstream from "here"', () => {
      const here: Messenger = ['workflow1', 'step1']
      const there: Messenger = ['workflow1']

      expect(messengerIsUpstream(here, there)).toBe(true)
    })

    it('should return false if "there" is not upstream from "here"', () => {
      const here: Messenger = ['workflow1']
      const there: Messenger = ['workflow1', 'step1']

      expect(messengerIsUpstream(here, there)).toBe(false)
    })

    it('should return true if "there" is at the same level as "here" but has a different name', () => {
      const here: Messenger = ['workflow1', 'step1']
      const there: Messenger = ['workflow1', 'step2']

      expect(messengerIsUpstream(here, there)).toBe(true)
    })

    it('should return false if "there" and "here" are the same', () => {
      const here: Messenger = ['workflow1', 'step1']
      const there: Messenger = ['workflow1', 'step1']

      expect(messengerIsUpstream(here, there)).toBe(false)
    })
  })
})
