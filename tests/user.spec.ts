import { test, expect } from "playwright-test-coverage";
import { Page } from "@playwright/test";
import { User, Role } from "../src/service/pizzaService";

test("updateUser", async ({ page }) => {
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  let loggedInUser: User | undefined;

  // Mock user retrieval (must come before /api/user to match first)
  await page.route("*/**/api/user/me", async (route) => {
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: loggedInUser });
  });

  // Mock user update (must match /api/user and /api/user/*)
  await page.route(/\/api\/user($|\/.*|$)/, async (route) => {
    const method = route.request().method();
    if (method === "PUT") {
      const updateReq = await route.request().postDataJSON();
      if (loggedInUser && updateReq.name) {
        loggedInUser.name = updateReq.name;
      }
      await route.fulfill({ status: 200, json: loggedInUser });
    } else if (method === "GET") {
      await route.fulfill({ status: 200, json: loggedInUser });
    }
  });

  // Mock registration and login
  await page.route("*/**/api/auth", async (route) => {
    const method = route.request().method();

    if (method === "POST") {
      // Registration
      const registerReq = await route.request().postDataJSON();
      loggedInUser = {
        id: "999",
        name: registerReq.name,
        email: registerReq.email,
        password: registerReq.password,
        roles: [{ role: Role.Diner }],
      };
      const registerRes = {
        user: loggedInUser,
        token: "abcdef",
      };
      await route.fulfill({ json: registerRes });
    } else if (method === "PUT") {
      // Login
      const loginReq = await route.request().postDataJSON();
      // Check credentials against the registered user
      if (
        loggedInUser &&
        loginReq.email === loggedInUser.email &&
        loginReq.password === loggedInUser.password
      ) {
        const loginRes = {
          user: loggedInUser,
          token: "abcdef",
        };
        await route.fulfill({ json: loginRes });
      } else {
        await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
      }
    } else if (method === "DELETE") {
      // Logout - just return success, don't clear loggedInUser
      await route.fulfill({ json: { message: "logout successful" } });
    }
  });

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
  await page.waitForURL("/diner-dashboard", { timeout: 5000 }).catch(() => {});

  await expect(page.getByRole("main")).toContainText("pizza dinerx");

  await page.getByRole("link", { name: "Logout" }).click();
  await page.getByRole("link", { name: "Login" }).click();

  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("diner");
  await page.getByRole("button", { name: "Login" }).click();

  await page.getByRole("link", { name: "pd" }).click();

  await expect(page.getByRole("main")).toContainText("pizza dinerx");
});
