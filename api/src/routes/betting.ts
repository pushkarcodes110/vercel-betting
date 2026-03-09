import { Hono } from 'hono'
import { Prisma } from '@prisma/client'
import { requireAuth } from '../middleware/auth'
import { prisma } from '../services/prisma'
import { asNumber, fail, ok, parseJsonBody } from '../utils/http'
import { formatDate, formatIstDateTime, parseDate } from '../utils/date'
import {
  ALL_COLUMN_DATA,
  ABR_CUT_NUMBERS,
  BAZAR_CHOICES,
  type BazarKey,
  JODI_PANEL_NUMBERS,
  JODI_VAGAR_NUMBERS
} from '@betting/shared'
import {
  buildGroupNumbers,
  findFamilyGroupByNumber,
  findSpDpNumbersWithDigit,
  findSpNumbersWithDigit,
  generateThreeDigitNumbers,
  resolveBulkNumbers
} from '../services/betting-engine'
import { verifyDjangoPassword } from '../utils/password'

const DEFAULT_BAZAR = 'SRIDEVI_OPEN'

const validBazar = new Set(BAZAR_CHOICES.map((item) => item.value))

const parseAmount = (value: unknown): Prisma.Decimal => {
  const number = asNumber(value)
  if (number === null || number <= 0) {
    throw new Error('Amount must be greater than 0')
  }
  return new Prisma.Decimal(number)
}

const inferColumnNumber = (betType: string, number: string, allColumns: number[]): number | null => {
  if (!allColumns.length) return null

  if (betType === 'SP' || betType === 'DP') {
    for (const col of allColumns) {
      if (col < 1 || col > 10) continue
      const columnData = ALL_COLUMN_DATA[col - 1]
      const pool = betType === 'SP' ? columnData.slice(0, 12) : columnData.slice(12, 22)
      if (pool.some((value) => String(value).padStart(3, '0') === number)) {
        return col
      }
    }
  }

  if (betType === 'JODI' || betType === 'ABR_CUT' || betType === 'JODI_PANEL') {
    const numberAsInt = Number(number)
    for (const col of allColumns) {
      const source = betType === 'JODI' ? JODI_VAGAR_NUMBERS[col] : betType === 'ABR_CUT' ? ABR_CUT_NUMBERS[col] : JODI_PANEL_NUMBERS[col]
      if (source?.includes(numberAsInt)) {
        return col
      }
    }
  }

  return null
}

const parseBazar = (bazar?: string): string => {
  const value = (bazar ?? DEFAULT_BAZAR).trim()
  if (!validBazar.has(value as BazarKey)) {
    throw new Error('Invalid bazar')
  }
  return value
}

const dateFilter = (date: Date): Date => parseDate(formatDate(date))

export const bettingRoutes = new Hono()

bettingRoutes.use('*', requireAuth)

bettingRoutes.get('/meta/options', (c) => {
  const today = new Date()
  const dateOptions: Array<{ value: string; label: string; is_today: boolean }> = []
  for (let i = 30; i >= -7; i -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const value = formatDate(date)
    const label = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    dateOptions.push({ value, label, is_today: i === 0 })
  }

  return ok(c, {
    bazar_choices: BAZAR_CHOICES,
    date_options: dateOptions,
    current_date: formatDate(today)
  })
})

bettingRoutes.get('/get-total-bet-count', async (c) => {
  try {
    const user = c.get('user')
    const total_count = await prisma.bet.count({ where: { user_id: user.id } })
    return ok(c, { total_count })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to fetch count', 500)
  }
})

bettingRoutes.post('/place-bet', async (c) => {
  try {
    const user = c.get('user')
    const body = await parseJsonBody<{ number?: string; amount?: number; bazar?: string; date?: string }>(c)

    if (!body.number || body.amount == null) {
      return fail(c, 'Missing number or amount', 400)
    }

    const amount = parseAmount(body.amount)
    const bet = await prisma.bet.create({
      data: {
        user_id: user.id,
        number: String(body.number).padStart(3, '0'),
        amount,
        bet_type: 'SINGLE',
        bazar: parseBazar(body.bazar),
        bet_date: parseDate(body.date),
        status: 'ACTIVE'
      }
    })

    return ok(c, {
      message: 'Bet saved successfully',
      bet_id: bet.id,
      number: bet.number,
      amount: String(bet.amount)
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to place bet', 500)
  }
})

bettingRoutes.post('/place-bulk-bet', async (c) => {
  try {
    const user = c.get('user')
    const body = await parseJsonBody<Record<string, unknown>>(c)
    const betType = String(body.type ?? '')
    if (!betType || body.amount == null) {
      return fail(c, 'Missing type or amount', 400)
    }

    const amount = parseAmount(body.amount)
    const bazar = parseBazar(String(body.bazar ?? DEFAULT_BAZAR))
    const betDate = parseDate(body.date ? String(body.date) : undefined)

    let numbers: string[]
    try {
      numbers = resolveBulkNumbers(betType, body)
    } catch (error) {
      return fail(c, error instanceof Error ? error.message : 'Invalid bulk payload', 400)
    }

    const allColumns = Array.isArray(body.columns) ? body.columns.map((col) => Number(col)).filter((col) => Number.isFinite(col)) : []

    const subType =
      betType === 'JODI'
        ? String(body.jodi_type)
        : betType === 'JODI_PANEL'
          ? String(body.panel_type)
          : ['EKI', 'BEKI', 'DADAR'].includes(betType)
            ? betType
            : null

    const result = await prisma.$transaction(async (tx) => {
      const bulkAction = await tx.bulkBetAction.create({
        data: {
          user_id: user.id,
          action_type: betType,
          amount,
          total_bets: numbers.length,
          jodi_column: allColumns[0] ?? null,
          jodi_type:
            betType === 'JODI' || betType === 'JODI_PANEL'
              ? Number(body.jodi_type ?? body.panel_type ?? null)
              : null,
          bazar,
          action_date: betDate,
          status: 'ACTIVE'
        }
      })

      await tx.bet.createMany({
        data: numbers.map((number) => ({
          user_id: user.id,
          number,
          amount,
          bulk_action_id: bulkAction.id,
          bet_type: betType,
          column_number: inferColumnNumber(betType, number, allColumns),
          sub_type: subType,
          bazar,
          bet_date: betDate,
          status: 'ACTIVE'
        }))
      })

      const created = await tx.bet.findMany({
        where: { bulk_action_id: bulkAction.id },
        orderBy: { id: 'desc' }
      })

      return { bulkAction, created }
    })

    return ok(c, {
      message: `${numbers.length} bets placed successfully`,
      bulk_action_id: result.bulkAction.id,
      total_bets: numbers.length,
      bets: result.created.map((bet) => ({
        id: bet.id,
        number: bet.number,
        amount: String(bet.amount),
        bet_type: bet.bet_type,
        column: bet.column_number,
        created_at: formatIstDateTime(bet.created_at)
      }))
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to place bulk bet', 500)
  }
})

bettingRoutes.get('/load-bets', async (c) => {
  try {
    const user = c.get('user')
    const bazar = parseBazar(c.req.query('bazar') ?? DEFAULT_BAZAR)
    const betDate = parseDate(c.req.query('date') ?? undefined)

    const userBets = await prisma.bet.findMany({
      where: {
        user_id: user.id,
        bazar,
        bet_date: dateFilter(betDate)
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        number: true,
        amount: true,
        created_at: true,
        bet_type: true,
        column_number: true,
        sub_type: true
      }
    })

    const bets: Record<string, { total: number; history: Array<Record<string, unknown>> }> = {}

    for (const bet of userBets) {
      if (!bets[bet.number]) {
        bets[bet.number] = { total: 0, history: [] }
      }

      bets[bet.number].total += Number(bet.amount)
      bets[bet.number].history.push({
        id: bet.id,
        amount: Number(bet.amount),
        created_at: formatIstDateTime(bet.created_at),
        bet_type: bet.bet_type,
        column: bet.column_number,
        sub_type: bet.sub_type
      })
    }

    return ok(c, { bets })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to load bets', 500)
  }
})

bettingRoutes.post('/delete-bet', async (c) => {
  try {
    const user = c.get('user')
    const body = await parseJsonBody<{ bet_id?: number }>(c)
    if (!body.bet_id) {
      return fail(c, 'Missing bet_id', 400)
    }

    const bet = await prisma.bet.findFirst({ where: { id: Number(body.bet_id), user_id: user.id } })
    if (!bet) {
      return fail(c, 'Bet not found or unauthorized', 404)
    }

    await prisma.bet.delete({ where: { id: bet.id } })
    return ok(c, { message: 'Bet deleted successfully' })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to delete bet', 500)
  }
})

bettingRoutes.post('/undo-bulk-action', async (c) => {
  try {
    const user = c.get('user')
    const body = await parseJsonBody<{ bulk_action_id?: number }>(c)
    if (!body.bulk_action_id) {
      return c.json({ success: false, message: 'Missing bulk_action_id' }, 400)
    }

    const action = await prisma.bulkBetAction.findFirst({
      where: { id: Number(body.bulk_action_id), user_id: user.id }
    })

    if (!action) {
      return c.json({ success: false, message: 'Bulk action not found or does not belong to you' }, 404)
    }

    if (action.is_undone) {
      return c.json({ success: false, message: 'This bulk action has already been deleted' }, 400)
    }

    const count = await prisma.bet.count({ where: { bulk_action_id: action.id } })

    await prisma.$transaction([
      prisma.bet.deleteMany({ where: { bulk_action_id: action.id } }),
      prisma.bulkBetAction.update({
        where: { id: action.id },
        data: {
          is_undone: true,
          status: 'UNDONE',
          undone_at: new Date(),
          undone_by_id: user.id
        }
      })
    ])

    return c.json({ success: true, message: `Successfully deleted bulk action with ${count} bets` })
  } catch (error) {
    return c.json({ success: false, message: error instanceof Error ? error.message : 'Server error' }, 500)
  }
})

bettingRoutes.get('/get-last-bulk-action', async (c) => {
  try {
    const user = c.get('user')
    const bazar = parseBazar(c.req.query('bazar') ?? DEFAULT_BAZAR)
    const actionDate = parseDate(c.req.query('date') ?? undefined)

    const action = await prisma.bulkBetAction.findFirst({
      where: {
        user_id: user.id,
        is_undone: false,
        bazar,
        action_date: dateFilter(actionDate)
      },
      orderBy: { created_at: 'desc' }
    })

    if (!action) {
      return ok(c, { has_action: false })
    }

    return ok(c, {
      has_action: true,
      action: {
        id: action.id,
        type: action.action_type,
        amount: String(action.amount),
        total_bets: action.total_bets,
        jodi_column: action.jodi_column,
        jodi_type: action.jodi_type,
        created_at: formatIstDateTime(action.created_at)
      }
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to fetch action', 500)
  }
})

bettingRoutes.get('/get-bet-summary', async (c) => {
  try {
    const user = c.get('user')
    const [summary, uniqueNumbers] = await Promise.all([
      prisma.bet.aggregate({
        where: { user_id: user.id },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.bet.findMany({
        where: { user_id: user.id },
        distinct: ['number'],
        select: { number: true }
      })
    ])

    return ok(c, {
      summary: {
        total_amount: String(summary._sum.amount ?? 0),
        total_bets: summary._count.id ?? 0,
        unique_numbers: uniqueNumbers.length
      }
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to fetch summary', 500)
  }
})

bettingRoutes.get('/get-bet-total', async (c) => {
  try {
    const user = c.get('user')
    const bazar = parseBazar(c.req.query('bazar') ?? DEFAULT_BAZAR)
    const betDate = parseDate(c.req.query('date') ?? undefined)

    const result = await prisma.bet.aggregate({
      where: {
        user_id: user.id,
        bazar,
        bet_date: dateFilter(betDate)
      },
      _sum: { amount: true }
    })

    return ok(c, { total_amount: Number(result._sum.amount ?? 0) })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to fetch total', 500)
  }
})

bettingRoutes.get('/get-all-bet-totals', async (c) => {
  try {
    const user = c.get('user')
    const bazar = parseBazar(c.req.query('bazar') ?? DEFAULT_BAZAR)
    const betDate = parseDate(c.req.query('date') ?? undefined)

    const totals = await prisma.bet.groupBy({
      by: ['number'],
      where: {
        user_id: user.id,
        bazar,
        bet_date: dateFilter(betDate)
      },
      _sum: { amount: true },
      orderBy: { number: 'asc' }
    })

    const bet_totals = totals.reduce<Record<string, number>>((acc, item) => {
      acc[item.number] = Number(item._sum.amount ?? 0)
      return acc
    }, {})

    return ok(c, { bet_totals })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to fetch totals', 500)
  }
})

bettingRoutes.get('/get-bulk-action-history', async (c) => {
  try {
    const user = c.get('user')
    const bazar = c.req.query('bazar')
    const dateStr = c.req.query('date')

    const where: Prisma.BulkBetActionWhereInput = {
      user_id: user.id
    }

    if (bazar) {
      where.bazar = parseBazar(bazar)
    }
    if (dateStr) {
      where.action_date = parseDate(dateStr)
    }

    const history = await prisma.bulkBetAction.findMany({ where, orderBy: { created_at: 'desc' } })

    return ok(c, {
      history: history.map((record) => ({
        id: record.id,
        action_type: record.action_type,
        amount: String(record.amount),
        total_bets: record.total_bets,
        jodi_column: record.jodi_column,
        jodi_type: record.jodi_type,
        created_at: formatIstDateTime(record.created_at),
        is_undone: record.is_undone,
        bazar: record.bazar,
        action_date: formatDate(record.action_date)
      })),
      count: history.length
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to fetch history', 500)
  }
})

bettingRoutes.post('/generate-motar-numbers', async (c) => {
  try {
    const body = await parseJsonBody<{ digits?: string }>(c)
    const digits = String(body.digits ?? '')

    if (!/^\d+$/.test(digits)) {
      return fail(c, 'Invalid digits input', 400)
    }
    if (digits.length < 4 || digits.length > 10) {
      return fail(c, 'Digits must be 4-10 characters long', 400)
    }

    const numbers = generateThreeDigitNumbers(digits)
    return ok(c, { numbers, count: numbers.length })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to generate', 500)
  }
})

bettingRoutes.post('/find-comman-pana-numbers', async (c) => {
  try {
    const body = await parseJsonBody<{ digit?: string | number; type?: '36' | '56' }>(c)
    if (body.digit == null) {
      return fail(c, 'Missing digit parameter', 400)
    }

    const digit = String(body.digit)
    if (!/^\d$/.test(digit)) {
      return fail(c, 'Digit must be a single digit (0-9)', 400)
    }

    const type = body.type === '56' ? '56' : '36'
    const numbers = type === '56' ? findSpDpNumbersWithDigit(digit) : findSpNumbersWithDigit(digit)

    return ok(c, {
      numbers,
      count: numbers.length,
      digit,
      type,
      bet_name: type === '56' ? 'Common Pana 56' : 'Common Pana 36'
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to find numbers', 500)
  }
})

bettingRoutes.post('/place-motar-bet', async (c) => {
  try {
    const user = c.get('user')
    const body = await parseJsonBody<{ digits?: string; amount?: number; bazar?: string; date?: string }>(c)
    const digits = String(body.digits ?? '')

    if (!/^\d+$/.test(digits)) {
      return fail(c, 'Invalid digits input', 400)
    }
    if (digits.length < 4 || digits.length > 10) {
      return fail(c, 'Digits must be 4-10 characters long', 400)
    }

    const amount = parseAmount(body.amount)
    const bazar = parseBazar(body.bazar)
    const betDate = parseDate(body.date)
    const numbers = generateThreeDigitNumbers(digits)

    if (!numbers.length) {
      return fail(c, 'No valid numbers generated', 400)
    }

    const result = await prisma.$transaction(async (tx) => {
      const bulkAction = await tx.bulkBetAction.create({
        data: {
          user_id: user.id,
          action_type: 'MOTAR',
          amount,
          total_bets: numbers.length,
          bazar,
          action_date: betDate,
          status: 'ACTIVE'
        }
      })

      await tx.bet.createMany({
        data: numbers.map((number) => ({
          user_id: user.id,
          number,
          amount,
          bet_type: 'MOTAR',
          bulk_action_id: bulkAction.id,
          bazar,
          bet_date: betDate,
          status: 'ACTIVE'
        }))
      })

      const created = await tx.bet.findMany({
        where: { bulk_action_id: bulkAction.id },
        orderBy: { id: 'desc' }
      })

      return { bulkAction, created }
    })

    return ok(c, {
      message: `${numbers.length} Motar bets placed successfully`,
      total_bets: numbers.length,
      bet_ids: result.created.map((item) => item.id),
      bets: result.created.map((item) => ({
        bet_id: item.id,
        number: item.number,
        amount: String(item.amount)
      })),
      digits,
      bulk_action_id: result.bulkAction.id
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to place Motar bets', 500)
  }
})

bettingRoutes.post('/place-comman-pana-bet', async (c) => {
  try {
    const user = c.get('user')
    const body = await parseJsonBody<{ digit?: string | number; amount?: number; type?: '36' | '56'; bazar?: string; date?: string }>(c)

    if (body.digit == null) {
      return fail(c, 'Missing digit parameter', 400)
    }

    const digit = String(body.digit)
    if (!/^\d$/.test(digit)) {
      return fail(c, 'Digit must be a single digit (0-9)', 400)
    }

    const amount = parseAmount(body.amount)
    const bazar = parseBazar(body.bazar)
    const betDate = parseDate(body.date)
    const type = body.type === '56' ? '56' : '36'

    const numbers = type === '56' ? findSpDpNumbersWithDigit(digit) : findSpNumbersWithDigit(digit)
    if (!numbers.length) {
      return fail(c, `No numbers contain digit ${digit}`, 400)
    }

    const actionType = type === '56' ? 'COMMAN_PANA_56' : 'COMMAN_PANA_36'

    const result = await prisma.$transaction(async (tx) => {
      const bulkAction = await tx.bulkBetAction.create({
        data: {
          user_id: user.id,
          action_type: actionType,
          amount,
          total_bets: numbers.length,
          jodi_type: Number(digit),
          bazar,
          action_date: betDate,
          status: 'ACTIVE'
        }
      })

      await tx.bet.createMany({
        data: numbers.map((number) => ({
          user_id: user.id,
          number,
          amount,
          bet_type: actionType,
          bulk_action_id: bulkAction.id,
          bazar,
          bet_date: betDate,
          status: 'ACTIVE'
        }))
      })

      const created = await tx.bet.findMany({
        where: { bulk_action_id: bulkAction.id },
        orderBy: { id: 'desc' }
      })

      return { bulkAction, created }
    })

    return ok(c, {
      message: `${numbers.length} ${type === '56' ? 'Common Pana 56' : 'Common Pana 36'} bets placed for digit ${digit}`,
      total_bets: numbers.length,
      bet_ids: result.created.map((item) => item.id),
      bets: result.created.map((item) => ({ bet_id: item.id, number: item.number, amount: String(item.amount) })),
      digit,
      type,
      bulk_action_id: result.bulkAction.id
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to place Comman Pana bets', 500)
  }
})

bettingRoutes.post('/place-set-pana-bet', async (c) => {
  try {
    const user = c.get('user')
    const body = await parseJsonBody<{ number?: string; amount?: number; bazar?: string; date?: string }>(c)
    const number = String(body.number ?? '').trim()

    if (!/^\d{3}$/.test(number)) {
      return fail(c, 'Number must be exactly 3 digits', 400)
    }

    const amount = parseAmount(body.amount)
    const bazar = parseBazar(body.bazar)
    const betDate = parseDate(body.date)

    const family = findFamilyGroupByNumber(number)
    if (!family) {
      return fail(c, `Number ${number} not found in any family group`, 400)
    }

    const result = await prisma.$transaction(async (tx) => {
      const bulkAction = await tx.bulkBetAction.create({
        data: {
          user_id: user.id,
          action_type: 'SET_PANA',
          amount,
          total_bets: family.familyNumbers.length,
          bazar,
          action_date: betDate,
          status: 'ACTIVE',
          family_group: family.familyName,
          family_numbers: JSON.stringify(family.familyNumbers)
        }
      })

      await tx.bet.createMany({
        data: family.familyNumbers.map((item) => ({
          user_id: user.id,
          number: String(item).padStart(3, '0'),
          amount,
          bet_type: 'SET_PANA',
          bulk_action_id: bulkAction.id,
          bazar,
          bet_date: betDate,
          status: 'ACTIVE',
          family_group: family.familyName
        }))
      })

      const created = await tx.bet.findMany({
        where: { bulk_action_id: bulkAction.id },
        orderBy: { id: 'desc' }
      })

      return { bulkAction, created }
    })

    return ok(c, {
      message: `${family.familyNumbers.length} Set Pana bets placed for family ${family.familyName}`,
      total_bets: family.familyNumbers.length,
      bet_ids: result.created.map((item) => item.id),
      bets: result.created.map((item) => ({ bet_id: item.id, number: item.number, amount: String(item.amount) })),
      family_name: family.familyName,
      family_numbers: family.familyNumbers.map((item) => String(item).padStart(3, '0')),
      bulk_action_id: result.bulkAction.id
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to place Set Pana bets', 500)
  }
})

bettingRoutes.post('/place-group-bet', async (c) => {
  try {
    const user = c.get('user')
    const body = await parseJsonBody<{ digit1?: number; digit2?: number; amount?: number; bazar?: string; date?: string }>(c)

    const digit1 = asNumber(body.digit1)
    const digit2 = asNumber(body.digit2)
    if (digit1 == null || digit2 == null || digit1 < 0 || digit1 > 9 || digit2 < 0 || digit2 > 9) {
      return fail(c, 'Digits must be between 0 and 9', 400)
    }

    const amount = parseAmount(body.amount)
    const bazar = parseBazar(body.bazar)
    const betDate = parseDate(body.date)
    const matchingNumbers = buildGroupNumbers(digit1, digit2)

    if (!matchingNumbers.length) {
      return fail(c, `No valid numbers found containing digits ${digit1} and ${digit2}`, 400)
    }

    const result = await prisma.$transaction(async (tx) => {
      const bulkAction = await tx.bulkBetAction.create({
        data: {
          user_id: user.id,
          action_type: 'GROUP',
          amount,
          total_bets: matchingNumbers.length,
          bazar,
          action_date: betDate,
          status: 'ACTIVE'
        }
      })

      await tx.bet.createMany({
        data: matchingNumbers.map((number) => ({
          user_id: user.id,
          number,
          amount,
          bet_type: 'GROUP',
          bulk_action_id: bulkAction.id,
          bazar,
          bet_date: betDate,
          status: 'ACTIVE'
        }))
      })

      const created = await tx.bet.findMany({
        where: { bulk_action_id: bulkAction.id },
        orderBy: { id: 'desc' }
      })

      return { bulkAction, created }
    })

    return ok(c, {
      message: `${matchingNumbers.length} Group bets placed for digits ${digit1} and ${digit2}`,
      total_bets: matchingNumbers.length,
      bet_ids: result.created.map((item) => item.id),
      bets: result.created.map((item) => ({ bet_id: item.id, number: item.number, amount: String(item.amount) })),
      matching_numbers: matchingNumbers,
      bulk_action_id: result.bulkAction.id
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to place Group bets', 500)
  }
})

bettingRoutes.get('/get-database-storage', async (c) => {
  try {
    const rows = await prisma.$queryRaw<Array<{ size_bytes: bigint }>>`
      SELECT pg_database_size(current_database()) as size_bytes
    `

    const sizeBytes = Number(rows[0]?.size_bytes ?? 0n)
    const sizeMb = sizeBytes / (1024 * 1024)
    const maxStorageMb = 1024

    return ok(c, {
      storage_used_mb: Number(sizeMb.toFixed(2)),
      storage_total_mb: maxStorageMb,
      percentage: Number(((sizeMb / maxStorageMb) * 100).toFixed(2)),
      database_type: 'PostgreSQL'
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to fetch storage', 500)
  }
})

bettingRoutes.post('/place-column-bet', async (c) => {
  try {
    const user = c.get('user')
    const body = await parseJsonBody<{ column?: number; amount?: number; bazar?: string; date?: string }>(c)
    const column = Number(body.column)

    if (!Number.isFinite(column) || column < 1 || column > 10) {
      return fail(c, 'Invalid column number. Must be between 1 and 10.', 400)
    }

    const amount = parseAmount(body.amount)
    const bazar = parseBazar(body.bazar)
    const betDate = parseDate(body.date)

    const bet = await prisma.bet.create({
      data: {
        user_id: user.id,
        number: String(column),
        amount,
        bet_type: 'COLUMN',
        column_number: column,
        bazar,
        bet_date: betDate,
        status: 'ACTIVE'
      }
    })

    return ok(c, {
      message: `Bet placed on Column ${column}`,
      bet_id: bet.id,
      amount: Number(amount),
      column
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to place column bet', 500)
  }
})

bettingRoutes.get('/get-column-totals', async (c) => {
  try {
    const user = c.get('user')
    const bazar = parseBazar(c.req.query('bazar') ?? DEFAULT_BAZAR)
    const betDate = parseDate(c.req.query('date') ?? undefined)

    const totals = await prisma.bet.groupBy({
      by: ['column_number'],
      where: {
        user_id: user.id,
        bet_type: 'COLUMN',
        bazar,
        bet_date: betDate,
        is_deleted: false
      },
      _sum: { amount: true }
    })

    const column_totals: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 }
    for (const row of totals) {
      if (row.column_number && row.column_number in column_totals) {
        column_totals[row.column_number] = Number(row._sum.amount ?? 0)
      }
    }

    return ok(c, { column_totals })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to fetch column totals', 500)
  }
})

bettingRoutes.post('/place-quick-bets', async (c) => {
  try {
    const user = c.get('user')
    const body = await parseJsonBody<{ bets?: Array<{ number?: string | number; amount?: number }>; bazar?: string; date?: string }>(c)

    if (!Array.isArray(body.bets) || body.bets.length === 0) {
      return fail(c, 'Missing or invalid bets array', 400)
    }

    const bazar = parseBazar(body.bazar)
    const betDate = parseDate(body.date)

    const validBets: Array<Prisma.BetCreateManyInput> = []
    const errors: Array<{ number: string | number | undefined; error: string }> = []

    for (const item of body.bets) {
      if (!item.number || item.amount == null) {
        errors.push({ number: item.number, error: 'Missing number or amount' })
        continue
      }

      const parsedAmount = asNumber(item.amount)
      if (parsedAmount == null || parsedAmount <= 0) {
        errors.push({ number: item.number, error: 'Amount must be greater than 0' })
        continue
      }

      validBets.push({
        user_id: user.id,
        number: String(item.number).padStart(3, '0'),
        amount: new Prisma.Decimal(parsedAmount),
        bet_type: 'SINGLE',
        bazar,
        bet_date: betDate,
        status: 'ACTIVE'
      })
    }

    const created = validBets.length
      ? await prisma.$transaction(async (tx) => {
          await tx.bet.createMany({ data: validBets })
          return tx.bet.findMany({
            where: {
              user_id: user.id,
              bazar,
              bet_date: betDate
            },
            orderBy: { id: 'desc' },
            take: validBets.length
          })
        })
      : []

    return ok(c, {
      message: `${created.length} bet(s) placed successfully`,
      bets_placed: created.length,
      created_bets: created.map((item) => ({ id: item.id, number: item.number, amount: String(item.amount) })),
      errors
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to place quick bets', 500)
  }
})

bettingRoutes.post('/delete-bazar-bets', async (c) => {
  try {
    const user = c.get('user')
    const body = await parseJsonBody<{ bazar?: string; date?: string }>(c)

    if (!body.bazar || !body.date) {
      return fail(c, 'Bazar and date are required', 400)
    }

    const bazar = parseBazar(body.bazar)
    const betDate = parseDate(body.date)

    const deleted = await prisma.$transaction(async (tx) => {
      const bets = await tx.bet.deleteMany({
        where: {
          user_id: user.id,
          bazar,
          bet_date: betDate
        }
      })

      await tx.bulkBetAction.deleteMany({
        where: {
          user_id: user.id,
          bazar,
          action_date: betDate
        }
      })

      return bets.count
    })

    return ok(c, {
      message: `Successfully deleted ${deleted} bets for ${bazar} on ${body.date}`,
      deleted_count: deleted
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to delete bazar bets', 500)
  }
})

bettingRoutes.post('/master-delete-all-bets', async (c) => {
  try {
    const user = c.get('user')
    const body = await parseJsonBody<{ password?: string }>(c)

    if (!body.password) {
      return fail(c, 'Password is required for verification', 400)
    }

    const fullUser = await prisma.customUser.findUnique({ where: { id: user.id } })
    if (!fullUser || !verifyDjangoPassword(body.password, fullUser.password)) {
      return fail(c, 'Incorrect password. Master delete cancelled.', 403)
    }

    const deletedCount = await prisma.$transaction(async (tx) => {
      const deletedBets = await tx.bet.deleteMany({ where: { user_id: user.id } })
      await tx.bulkBetAction.deleteMany({ where: { user_id: user.id } })
      return deletedBets.count
    })

    return ok(c, {
      message: `Successfully deleted ${deletedCount} bets from database`,
      deleted_count: deletedCount
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to run master delete', 500)
  }
})
