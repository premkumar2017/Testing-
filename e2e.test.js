import { test, expect } from '@playwright/test';

test.describe('End-to-End User Flow', () => {
    test('Register, Login & Buy Product', async ({ page }) => {
        // 1️⃣ Open Website
        await page.goto('https://fms.b-u.ac.in/department-login/');
        console.log('✅ Website Loaded');

        // 2️⃣ Register New User
        await page.click('text=Sign Up');
        await page.fill('#name', 'TestUser');
        await page.fill('#email', 'testuser@example.com');
        await page.fill('#password', 'SecurePass123');
        await page.click('button[type="submit"]');

        // Validate successful registration
        await expect(page.locator('text=Account Created')).toBeVisible();
        console.log('✅ User Registered');

        // 3️⃣ Login with New User
        await page.click('text=Login');
        await page.fill('#email', 'testuser@example.com');
        await page.fill('#password', 'SecurePass123');
        await page.click('button[type="submit"]');

        // Validate login success
        await expect(page.locator('text=Welcome, TestUser')).toBeVisible();
        console.log('✅ User Logged In');

        // 4️⃣ Add Product to Cart
        await page.click('text=Shop');
        await page.click('text=Add to Cart', { index: 0 });
        await page.click('text=View Cart');

        // Validate product is added
        await expect(page.locator('text=Product Name')).toBeVisible();
        console.log('✅ Product Added to Cart');

        // 5️⃣ Proceed to Checkout
        await page.click('text=Checkout');
        await page.fill('#address', '123 Street, City');
        await page.fill('#cardNumber', '4111111111111111');
        await page.fill('#expiry', '12/25');
        await page.fill('#cvv', '123');
        await page.click('button[type="submit"]');

        // Validate order confirmation
        await expect(page.locator('text=Order Confirmed')).toBeVisible();
        console.log('✅ Order Placed Successfully');
    });
});
