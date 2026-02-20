import { test, expect } from "playwright-test-coverage";
import { Page } from "@playwright/test";
import { User, Role } from "../src/service/pizzaService";

async function setupMocks(
  page: Page,
  loggedInUser: { value: User | undefined },
) {
  // Mock user retrieval
  await page.route("*/**/api/user/me", async (route) => {
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: loggedInUser.value });
  });

  // Mock user update
  await page.route(/\/api\/user($|\/.*|$)/, async (route) => {
    const method = route.request().method();
    if (method === "PUT") {
      const updateReq = await route.request().postDataJSON();
      if (loggedInUser.value) {
        if (updateReq.name) loggedInUser.value.name = updateReq.name;
        if (updateReq.email) loggedInUser.value.email = updateReq.email;
        if (updateReq.password)
          loggedInUser.value.password = updateReq.password;
      }
      await route.fulfill({ status: 200, json: loggedInUser.value });
    } else if (method === "GET") {
      await route.fulfill({ status: 200, json: loggedInUser.value });
    }
  });

  // Mock registration and login
  await page.route("*/**/api/auth", async (route) => {
    const method = route.request().method();

    if (method === "POST") {
      // Registration
      const registerReq = await route.request().postDataJSON();
      loggedInUser.value = {
        id: "999",
        name: registerReq.name,
        email: registerReq.email,
        password: registerReq.password,
        roles: [{ role: Role.Diner }],
      };
      await route.fulfill({
        json: { user: loggedInUser.value, token: "abcdef" },
      });
    } else if (method === "PUT") {
      // Login
      const loginReq = await route.request().postDataJSON();
      if (
        loggedInUser.value &&
        loginReq.email === loggedInUser.value.email &&
        loginReq.password === loggedInUser.value.password
      ) {
        await route.fulfill({
          json: { user: loggedInUser.value, token: "abcdef" },
        });
      } else {
        await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
      }
    } else if (method === "DELETE") {
      // Logout
      await route.fulfill({ json: { message: "logout successful" } });
    }
  });
}

test("updateUser - change name", async ({ page }) => {
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  const loggedInUser = { value: undefined as User | undefined };

  await setupMocks(page, loggedInUser);

  await page.goto("/");
  await page.getByRole("link", { name: "Register" }).click();
  await page.getByRole("textbox", { name: "Full name" }).fill("pizza diner");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("diner");
  await page.getByRole("button", { name: "Register" }).click();

  await page.getByRole("link", { name: "pd" }).click();
  await expect(page.getByRole("main")).toContainText("pizza diner");

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.getByRole("textbox").first().fill("pizza dinerx");
  await page.getByRole("button", { name: "Update" }).click();
  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });
  await page.waitForURL(/.*dashboard/, { timeout: 5000 }).catch(() => {});

  await expect(page.getByRole("main")).toContainText("pizza dinerx");

  // Verify name persists after logout/login
  await page.getByRole("link", { name: "Logout" }).click();
  await page.getByRole("link", { name: "Login" }).click();

  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("diner");
  await page.getByRole("button", { name: "Login" }).click();

  await page.getByRole("link", { name: "pd" }).click();
  await expect(page.getByRole("main")).toContainText("pizza dinerx");
});

test("updateUser - change email", async ({ page }) => {
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  const newEmail = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  const loggedInUser = { value: undefined as User | undefined };

  await setupMocks(page, loggedInUser);

  await page.goto("/");
  await page.getByRole("link", { name: "Register" }).click();
  await page.getByRole("textbox", { name: "Full name" }).fill("pizza diner");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("diner");
  await page.getByRole("button", { name: "Register" }).click();

  await page.getByRole("link", { name: "pd" }).click();
  await expect(page.getByRole("main")).toContainText("pizza diner");

  // Update email
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.locator('input[type="email"]').click();
  await page.locator('input[type="email"]').fill("");
  await page.locator('input[type="email"]').fill(newEmail);
  await page.getByRole("button", { name: "Update" }).click();
  await page.waitForURL(/.*dashboard/, { timeout: 5000 }).catch(() => {});

  // Verify email changed and old email no longer works for login
  await page.getByRole("link", { name: "Logout" }).click();
  await page.getByRole("link", { name: "Login" }).click();

  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("diner");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByText("401")).toBeVisible();

  // Verify login with new email works
  await page.getByRole("textbox", { name: "Email address" }).clear();
  await page.getByRole("textbox", { name: "Email address" }).fill(newEmail);
  await page.getByRole("button", { name: "Login" }).click();

  await page.getByRole("link", { name: "pd" }).click();
  await expect(page.getByRole("main")).toContainText("pizza diner");
});
