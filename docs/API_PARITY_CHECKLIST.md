# API Parity Checklist

## Auth

- [ ] `POST /api/auth/login`
- [ ] `POST /api/auth/logout`
- [ ] `GET /api/auth/me`

## Betting Operations

- [ ] `POST /api/place-bet`
- [ ] `POST /api/place-bulk-bet`
- [ ] `GET /api/load-bets`
- [ ] `POST /api/delete-bet`
- [ ] `POST /api/place-quick-bets`

## Bulk Action Operations

- [ ] `POST /api/undo-bulk-action`
- [ ] `GET /api/get-last-bulk-action`
- [ ] `GET /api/get-bulk-action-history`

## Totals and Statistics

- [ ] `GET /api/get-bet-total`
- [ ] `GET /api/get-all-bet-totals`
- [ ] `GET /api/get-bet-summary`
- [ ] `GET /api/get-column-totals`
- [ ] `GET /api/get-total-bet-count`

## Special Bet Types

- [ ] `POST /api/generate-motar-numbers`
- [ ] `POST /api/find-comman-pana-numbers`
- [ ] `POST /api/place-motar-bet`
- [ ] `POST /api/place-comman-pana-bet`
- [ ] `POST /api/place-set-pana-bet`
- [ ] `POST /api/place-group-bet`
- [ ] `POST /api/place-column-bet`

## System and Delete Flows

- [ ] `GET /api/get-database-storage`
- [ ] `POST /api/delete-bazar-bets`
- [ ] `POST /api/master-delete-all-bets`

## Admin

- [ ] `GET /api/admin/users`
- [ ] `GET /api/admin/bets`
- [ ] `PATCH /api/admin/bets/:id`
- [ ] `POST /api/admin/bets/:id/soft-delete`
- [ ] `GET /api/admin/bulk-actions`
- [ ] `POST /api/admin/bulk-actions/:id/undo`
