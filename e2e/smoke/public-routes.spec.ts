import { expect, test } from "@playwright/test";

const publicPages = [
  "/",
  "/login",
  "/join",
  "/about",
  "/methodology",
  "/contact",
  "/legal/terms-of-service",
  "/legal/privacy-policy",
];

for (const path of publicPages) {
  test(`${path} 페이지를 정상적으로 표시한다`, async ({ page }) => {
    const response = await page.goto(path);

    expect(response?.ok()).toBe(true);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    await expect(page.locator("body")).not.toContainText("Application Error");
  });
}

test("비로그인 사용자의 대시보드 접근을 로그인 화면으로 보낸다", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

for (const path of ["/robots.txt", "/sitemap.xml"]) {
  test(`${path} 정적 리소스를 제공한다`, async ({ request }) => {
    const response = await request.get(path);

    expect(response.ok()).toBe(true);
    expect((await response.text()).trim().length).toBeGreaterThan(0);
  });
}
