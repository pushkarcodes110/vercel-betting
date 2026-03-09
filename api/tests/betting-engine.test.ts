import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGroupNumbers,
  findFamilyGroupByNumber,
  findSpDpNumbersWithDigit,
  findSpNumbersWithDigit,
  generateThreeDigitNumbers,
  resolveBulkNumbers
} from '../src/services/betting-engine'

test('generateThreeDigitNumbers enforces custom ordering and zero rule', () => {
  const output = generateThreeDigitNumbers('4789')
  assert.ok(output.includes('478'))
  assert.ok(output.includes('479'))
  assert.ok(!output.includes('047'))
  assert.ok(!output.includes('740'))
})

test('findSpNumbersWithDigit returns unique 3-digit strings', () => {
  const output = findSpNumbersWithDigit('1')
  assert.ok(output.length > 0)
  assert.ok(output.every((value) => /^\d{3}$/.test(value)))
})

test('findSpDpNumbersWithDigit includes dp candidates', () => {
  const sp = findSpNumbersWithDigit('8')
  const spDp = findSpDpNumbersWithDigit('8')
  assert.ok(spDp.length >= sp.length)
})

test('resolveBulkNumbers for SP with selected columns returns deduplicated values', () => {
  const output = resolveBulkNumbers('SP', { columns: [1, 2] })
  assert.ok(output.length > 0)
  assert.equal(new Set(output).size, output.length)
})

test('resolveBulkNumbers validates jodi payload', () => {
  assert.throws(() => resolveBulkNumbers('JODI', { columns: [1], jodi_type: 4 }))
  const output = resolveBulkNumbers('JODI', { columns: [1], jodi_type: 5 })
  assert.equal(output.length, 5)
})

test('findFamilyGroupByNumber returns family mapping', () => {
  const family = findFamilyGroupByNumber('115')
  assert.ok(family)
  assert.equal(family?.familyName, 'G17')
})

test('buildGroupNumbers returns numbers containing both digits', () => {
  const numbers = buildGroupNumbers(3, 5)
  assert.ok(numbers.length > 0)
  assert.ok(numbers.every((value) => value.includes('3') && value.includes('5')))
})
