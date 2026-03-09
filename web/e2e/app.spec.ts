import { test, expect } from '@playwright/test'

test('login page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Sign In to Your Account')).toBeVisible()
})

test('home is protected', async ({ page }) => {
  await page.goto('/home')
  await expect(page).toHaveURL('/')
})
