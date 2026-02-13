import { test, expect } from "playwright-test-coverage";
import { Page } from "@playwright/test";
import { User, Role } from "../src/service/pizzaService";

test("create franchise as admin", async ({ page }) => {
  let loggedInUser: User | undefined;
  let franchises: any[] = [
    {
      id: 2,
      name: "LotaPizza",
      admins: [{ id: 5, name: "Frank", email: "f@jwt.com" }],
      stores: [],
    },
  ];

  const adminUsers: Record<string, User> = {
    "admin@jwt.com": {
      id: "1",
      name: "Admin User",
      email: "admin@jwt.com",
      password: "admin",
      roles: [{ role: Role.Admin }],
    },
  };

  // Mock auth endpoint
  await page.route("*/**/api/auth", async (route) => {
    const loginReq = route.request().postDataJSON();
    const user = adminUsers[loginReq.email];
    if (!user || user.password !== loginReq.password) {
      await route.fulfill({ status: 401, json: { message: "Unauthorized" } });
      return;
    }
    loggedInUser = adminUsers[loginReq.email];
    await route.fulfill({ json: { user: loggedInUser, token: "admin-token" } });
  });

  // Mock user/me endpoint
  await page.route("*/**/api/user/me", async (route) => {
    await route.fulfill({ json: loggedInUser });
  });

  // Mock franchise endpoints
  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    const method = route.request().method();

    if (method === "GET") {
      // Return current franchises from state
      const franchiseRes = { franchises };
      await route.fulfill({ json: franchiseRes });
    } else if (method === "POST") {
      // Create new franchise and add to state
      const createReq = route.request().postDataJSON();
      const newFranchise = {
        id: 999,
        name: createReq.name,
        admins: [
          {
            id: createReq.admins[0].id || 10,
            name: createReq.admins[0].name || "Franchisee",
            email: createReq.admins[0].email,
          },
        ],
        stores: [],
      };
      franchises.push(newFranchise);
      await route.fulfill({ json: newFranchise });
    }
  });

  await page.goto("/");

  // Log in as admin
  await page.getByRole("link", { name: "Login" }).click();
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("admin@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("admin");
  await page.getByRole("button", { name: "Login" }).click();

  // Navigate to admin dashboard
  await page.getByRole("link", { name: "Admin" }).click();

  // Click Add Franchise button
  await page.getByRole("button", { name: "Add Franchise" }).click();

  // Fill in franchise creation form
  await page.getByPlaceholder("franchise name").fill("New Pizza Place");
  await page
    .getByPlaceholder("franchisee admin email")
    .fill("franchisee@jwt.com");
  await page.getByRole("button", { name: "Create" }).click();

  // Verify franchise was created
  await expect(page.getByText("New Pizza Place")).toBeVisible();
});

test("close franchise as admin", async ({ page }) => {
  let loggedInUser: User | undefined;
  let franchises: any[] = [
    {
      id: 999,
      name: "Franchise to Close",
      admins: [{ id: 1, name: "Admin", email: "admin@jwt.com" }],
      stores: [],
    },
  ];

  const adminUsers: Record<string, User> = {
    "admin@jwt.com": {
      id: "1",
      name: "Admin User",
      email: "admin@jwt.com",
      password: "admin",
      roles: [{ role: Role.Admin }],
    },
  };

  // Mock auth endpoint
  await page.route("*/**/api/auth", async (route) => {
    const loginReq = route.request().postDataJSON();
    const user = adminUsers[loginReq.email];
    if (!user || user.password !== loginReq.password) {
      await route.fulfill({ status: 401, json: { message: "Unauthorized" } });
      return;
    }
    loggedInUser = adminUsers[loginReq.email];
    await route.fulfill({ json: { user: loggedInUser, token: "admin-token" } });
  });

  // Mock user/me endpoint
  await page.route("*/**/api/user/me", async (route) => {
    await route.fulfill({ json: loggedInUser });
  });

  // Mock franchise endpoints
  await page.route(/\/api\/franchise(\/.*)?(\?.*)?$/, async (route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());
    const pathParts = url.pathname.split("/");
    const franchiseId = pathParts[pathParts.length - 1];

    if (method === "GET") {
      // Return current franchises from state
      const franchiseRes = { franchises };
      await route.fulfill({ json: franchiseRes });
    } else if (method === "DELETE") {
      // Close franchise - remove from franchises array
      franchises = franchises.filter(
        (f) =>
          f.id.toString() !== franchiseId && f.id !== parseInt(franchiseId),
      );
      await route.fulfill({ json: { message: "Franchise closed" } });
    }
  });

  await page.goto("/");

  // Admin logs in
  await page.getByRole("link", { name: "Login" }).click();
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("admin@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("admin");
  await page.getByRole("button", { name: "Login" }).click();

  // Navigate to admin dashboard
  await page.getByRole("link", { name: "Admin" }).click();

  // Verify franchise is visible
  await expect(page.getByText("Franchise to Close")).toBeVisible();

  // Close the franchise (first click navigates to confirmation page)
  await page.getByRole("button", { name: "Close" }).click();

  // Verify confirmation page is shown
  await expect(
    page.getByText(
      /Are you sure you want to close the Franchise to Close franchise/,
    ),
  ).toBeVisible();

  // Click Close again to confirm
  await page.getByRole("button", { name: "Close" }).click();

  // Wait for navigation back to admin dashboard
  await expect(
    page.getByRole("heading", { name: "Mama Ricci's kitchen" }),
  ).toBeVisible();

  // Verify franchise is no longer visible
  await expect(page.getByText("Franchise to Close")).not.toBeVisible();
});
