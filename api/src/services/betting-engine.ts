import {
  ABR_CUT_NUMBERS,
  ALL_COLUMN_DATA,
  DADAR_NUMBERS,
  EKI_BEKI_NUMBERS,
  FAMILY_PANA_NUMBERS,
  JODI_PANEL_NUMBERS,
  JODI_VAGAR_NUMBERS,
  getDpNumbers,
  getSpNumbers
} from '@betting/shared'

export const getDadarNumbers = (): string[] => {
  const values: string[] = []
  for (const nums of Object.values(DADAR_NUMBERS)) {
    values.push(...nums.map((num) => String(num).padStart(3, '0')))
  }
  return values
}

export const getEkiBekiNumbers = (betType: 'EKI' | 'BEKI'): string[] => {
  return EKI_BEKI_NUMBERS[betType].map((num) => String(num).padStart(3, '0'))
}

export const getAbrCutNumbers = (column: number): string[] => {
  return (ABR_CUT_NUMBERS[column] ?? []).map((num) => String(num).padStart(3, '0'))
}

export const getJodiPanelNumbers = (column: number, panelType: number): string[] => {
  const values = JODI_PANEL_NUMBERS[column] ?? []
  const sliced = panelType === 6 ? values.slice(0, 6) : panelType === 7 ? values.slice(0, 7) : values
  return sliced.map((num) => String(num).padStart(3, '0'))
}

export const generateThreeDigitNumbers = (digitsString: string): string[] => {
  const orderMap: Record<string, number> = {
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '0': 10
  }

  const availableDigits = [...new Set(digitsString.split(''))]
  const validNumbers: string[] = []

  for (const a of availableDigits) {
    for (const b of availableDigits) {
      for (const c of availableDigits) {
        if (a === '0' || b === '0') continue
        if (orderMap[a] < orderMap[b] && orderMap[b] < orderMap[c]) {
          validNumbers.push(`${a}${b}${c}`)
        }
      }
    }
  }

  return validNumbers.sort()
}

export const findSpNumbersWithDigit = (digit: string | number): string[] => {
  const digitStr = String(digit)
  if (!/^\d$/.test(digitStr)) return []

  const values = new Set<string>()
  for (const col of ALL_COLUMN_DATA) {
    for (const num of col.slice(0, 12)) {
      const str = String(num).padStart(3, '0')
      if (str.includes(digitStr)) {
        values.add(str)
      }
    }
  }
  return [...values].sort()
}

export const findSpDpNumbersWithDigit = (digit: string | number): string[] => {
  const digitStr = String(digit)
  if (!/^\d$/.test(digitStr)) return []

  const values = new Set<string>()
  for (const col of ALL_COLUMN_DATA) {
    for (const num of col.slice(0, 22)) {
      const str = String(num).padStart(3, '0')
      if (str.includes(digitStr)) {
        values.add(str)
      }
    }
  }
  return [...values].sort()
}

export const findFamilyGroupByNumber = (number: string | number): { familyName: string; familyNumbers: number[] } | null => {
  const numberInt = Number.parseInt(String(number), 10)
  if (Number.isNaN(numberInt)) return null

  for (const [familyName, familyNumbers] of Object.entries(FAMILY_PANA_NUMBERS)) {
    if (familyNumbers.includes(numberInt)) {
      return { familyName, familyNumbers }
    }
  }

  return null
}

export const resolveBulkNumbers = (betType: string, payload: Record<string, unknown>): string[] => {
  if (betType === 'SP') {
    const columns = payload.columns
    if (Array.isArray(columns) && columns.length > 0) {
      const numbers = new Set<string>()
      for (const col of columns) {
        const colNum = Number(col)
        if (colNum >= 1 && colNum <= 10) {
          for (const num of ALL_COLUMN_DATA[colNum - 1].slice(0, 12)) {
            numbers.add(String(num).padStart(3, '0'))
          }
        }
      }
      return [...numbers]
    }
    return getSpNumbers()
  }

  if (betType === 'DP') {
    const columns = payload.columns
    if (Array.isArray(columns) && columns.length > 0) {
      const numbers = new Set<string>()
      for (const col of columns) {
        const colNum = Number(col)
        if (colNum >= 1 && colNum <= 10) {
          for (const num of ALL_COLUMN_DATA[colNum - 1].slice(12, 22)) {
            numbers.add(String(num).padStart(3, '0'))
          }
        }
      }
      return [...numbers]
    }
    return getDpNumbers()
  }

  if (betType === 'JODI') {
    const columns = Array.isArray(payload.columns) ? payload.columns.map(Number) : [Number(payload.columns)]
    const jodiType = Number(payload.jodi_type)

    if (!columns.length || ![5, 7, 12].includes(jodiType)) {
      throw new Error('Missing or invalid columns/jodi_type')
    }

    const numbers = new Set<string>()
    for (const col of columns) {
      const all = JODI_VAGAR_NUMBERS[col]
      if (!all) throw new Error(`Invalid column ${col}`)

      const scoped = jodiType === 5 ? all.slice(0, 5) : jodiType === 7 ? all.slice(-7) : all
      scoped.forEach((num) => numbers.add(String(num).padStart(3, '0')))
    }
    return [...numbers]
  }

  if (betType === 'DADAR') {
    return getDadarNumbers()
  }

  if (betType === 'EKI' || betType === 'BEKI') {
    return getEkiBekiNumbers(betType)
  }

  if (betType === 'ABR_CUT') {
    const columns = Array.isArray(payload.columns) ? payload.columns.map(Number) : [Number(payload.columns)]
    if (!columns.length) throw new Error('Missing columns for ABR Cut')

    const numbers = new Set<string>()
    for (const col of columns) {
      const values = ABR_CUT_NUMBERS[col]
      if (!values) throw new Error(`Invalid column ${col} for ABR Cut`)
      values.forEach((num) => numbers.add(String(num).padStart(3, '0')))
    }
    return [...numbers]
  }

  if (betType === 'JODI_PANEL') {
    const columns = Array.isArray(payload.columns) ? payload.columns.map(Number) : [Number(payload.columns)]
    const panelType = Number(payload.panel_type)
    if (!columns.length || ![6, 7, 9].includes(panelType)) {
      throw new Error('Missing columns or invalid panel_type')
    }

    const numbers = new Set<string>()
    for (const col of columns) {
      if (!JODI_PANEL_NUMBERS[col]) throw new Error(`Invalid column ${col} for Jodi Panel`)
      for (const number of getJodiPanelNumbers(col, panelType)) {
        numbers.add(number)
      }
    }
    return [...numbers]
  }

  throw new Error('Invalid bet type')
}

export const buildGroupNumbers = (digit1: number, digit2: number): string[] => {
  const all = new Set<string>()
  for (const col of ALL_COLUMN_DATA) {
    for (const value of col) {
      all.add(String(value).padStart(3, '0'))
    }
  }

  return [...all]
    .filter((num) => num.includes(String(digit1)) && num.includes(String(digit2)))
    .sort()
}
