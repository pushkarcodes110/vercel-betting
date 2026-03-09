# Cutover Checklist

## Before cutover

- [ ] `legacy-django` remains unchanged and deployable.
- [ ] API auth login works for existing users without password reset.
- [ ] All betting flows pass manual QA:
  - [ ] single bet
  - [ ] bulk bet
  - [ ] motar
  - [ ] comman pana (36/56)
  - [ ] set pana
  - [ ] group
  - [ ] column
- [ ] Delete flows pass:
  - [ ] delete bet
  - [ ] delete bazar bets
  - [ ] master delete with password
  - [ ] undo bulk
- [ ] Admin dashboard checks pass:
  - [ ] users list/search
  - [ ] bets list/search/soft-delete
  - [ ] bulk action list/undo
- [ ] Polling and totals refresh stable at 15-second interval.

## Cutover day

- [ ] Deploy API to Vercel.
- [ ] Deploy web frontend to Vercel.
- [ ] Set production env vars.
- [ ] Run smoke tests from real browser.
- [ ] Monitor API error rates and DB connection saturation.

## Rollback

- [ ] Keep legacy Django ingress/domain mapping available.
- [ ] If severe issue occurs, route traffic back to legacy deployment.
- [ ] Keep incident notes and data diff reports.
