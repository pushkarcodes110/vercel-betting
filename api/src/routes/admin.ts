import { Hono } from 'hono'
import { Prisma } from '@prisma/client'
import { requireAdmin } from '../middleware/auth'
import { prisma } from '../services/prisma'
import { fail, ok, parseJsonBody } from '../utils/http'
import { formatDate, formatIstDateTime } from '../utils/date'

export const adminRoutes = new Hono()

adminRoutes.use('*', requireAdmin)

adminRoutes.get('/admin/users', async (c) => {
  try {
    const search = (c.req.query('search') ?? '').trim()

    const where: Prisma.CustomUserWhereInput | undefined = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { first_name: { contains: search, mode: 'insensitive' } },
            { last_name: { contains: search, mode: 'insensitive' } }
          ]
        }
      : undefined

    const users = await prisma.customUser.findMany({
      where,
      orderBy: { date_joined: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        is_staff: true,
        is_superuser: true,
        is_active: true,
        date_joined: true,
        last_login: true
      }
    })

    return ok(c, {
      users: users.map((user) => ({
        ...user,
        date_joined: formatIstDateTime(user.date_joined),
        last_login: user.last_login ? formatIstDateTime(user.last_login) : null
      }))
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to fetch users', 500)
  }
})

adminRoutes.get('/admin/bets', async (c) => {
  try {
    const search = (c.req.query('search') ?? '').trim()
    const betType = c.req.query('bet_type')
    const bazar = c.req.query('bazar')

    const where: Prisma.BetWhereInput = {}

    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ]
    }

    if (betType) where.bet_type = betType
    if (bazar) where.bazar = bazar

    const bets = await prisma.bet.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, email: true }
        },
        bulk_action: {
          select: { id: true, action_type: true }
        }
      },
      take: 500
    })

    return ok(c, {
      bets: bets.map((bet) => ({
        id: bet.id,
        user: bet.user,
        number: bet.number,
        amount: String(bet.amount),
        bet_type: bet.bet_type,
        bazar: bet.bazar,
        bet_date: formatDate(bet.bet_date),
        status: bet.status,
        is_deleted: bet.is_deleted,
        created_at: formatIstDateTime(bet.created_at),
        column_number: bet.column_number,
        sub_type: bet.sub_type,
        bulk_action: bet.bulk_action
      }))
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to fetch bets', 500)
  }
})

adminRoutes.patch('/admin/bets/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    if (!Number.isFinite(id)) {
      return fail(c, 'Invalid bet id', 400)
    }

    const body = await parseJsonBody<{ amount?: number; status?: string; notes?: string; is_deleted?: boolean }>(c)

    const data: Prisma.BetUpdateInput = {}
    if (body.amount != null) {
      data.amount = new Prisma.Decimal(body.amount)
    }
    if (body.status) data.status = body.status
    if (body.notes != null) data.notes = body.notes
    if (body.is_deleted != null) {
      data.is_deleted = Boolean(body.is_deleted)
      data.deleted_at = body.is_deleted ? new Date() : null
      if (body.is_deleted) {
        const actor = c.get('user')
        data.deleted_by = { connect: { id: actor.id } }
      }
    }

    const updated = await prisma.bet.update({ where: { id }, data })
    return ok(c, {
      bet: {
        id: updated.id,
        amount: String(updated.amount),
        status: updated.status,
        is_deleted: updated.is_deleted,
        deleted_at: updated.deleted_at ? formatIstDateTime(updated.deleted_at) : null
      }
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to update bet', 500)
  }
})

adminRoutes.post('/admin/bets/:id/soft-delete', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    if (!Number.isFinite(id)) {
      return fail(c, 'Invalid bet id', 400)
    }

    const actor = c.get('user')

    await prisma.bet.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by_id: actor.id,
        status: 'CANCELLED'
      }
    })

    return ok(c, { message: 'Bet soft deleted' })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to soft delete bet', 500)
  }
})

adminRoutes.get('/admin/bulk-actions', async (c) => {
  try {
    const search = (c.req.query('search') ?? '').trim()

    const where: Prisma.BulkBetActionWhereInput | undefined = search
      ? {
          OR: [
            { action_type: { contains: search, mode: 'insensitive' } },
            { user: { username: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } }
          ]
        }
      : undefined

    const actions = await prisma.bulkBetAction.findMany({
      where,
      include: {
        user: {
          select: { id: true, username: true, email: true }
        }
      },
      orderBy: { created_at: 'desc' },
      take: 500
    })

    return ok(c, {
      actions: actions.map((action) => ({
        id: action.id,
        user: action.user,
        action_type: action.action_type,
        amount: String(action.amount),
        total_bets: action.total_bets,
        total_amount: String(action.total_amount),
        bazar: action.bazar,
        action_date: formatDate(action.action_date),
        status: action.status,
        is_undone: action.is_undone,
        created_at: formatIstDateTime(action.created_at)
      }))
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to fetch bulk actions', 500)
  }
})

adminRoutes.post('/admin/bulk-actions/:id/undo', async (c) => {
  try {
    const id = Number(c.req.param('id'))
    if (!Number.isFinite(id)) {
      return fail(c, 'Invalid bulk action id', 400)
    }

    const actor = c.get('user')

    const action = await prisma.bulkBetAction.findUnique({ where: { id } })
    if (!action) {
      return fail(c, 'Bulk action not found', 404)
    }
    if (action.is_undone) {
      return fail(c, 'Bulk action is already undone', 400)
    }

    await prisma.$transaction([
      prisma.bet.deleteMany({ where: { bulk_action_id: action.id } }),
      prisma.bulkBetAction.update({
        where: { id: action.id },
        data: {
          is_undone: true,
          status: 'UNDONE',
          undone_at: new Date(),
          undone_by_id: actor.id
        }
      })
    ])

    return ok(c, { message: 'Bulk action undone successfully' })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Failed to undo bulk action', 500)
  }
})
