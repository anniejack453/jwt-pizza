import { test, expect } from "playwright-test-coverage";

test("test", async ({ page }) => {
  await page.goto("http://localhost:5173/");

  await page.getByRole("link", { name: "Register" }).click();
  await page.getByRole("textbox", { name: "Full name" }).fill("a");
  await page.getByRole("textbox", { name: "Email address" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("b@c");
  await page.getByRole("textbox", { name: "Password" }).click();
  await page.getByRole("textbox", { name: "Password" }).fill("d");
  await page.getByRole("button", { name: "Register" }).click();
  await page.getByRole("link", { name: "a", exact: true }).click();
  await expect(page.getByText("b@c")).toBeVisible();
});
