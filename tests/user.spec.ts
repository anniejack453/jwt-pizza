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
      // Skip requests with query parameters (those are for listing users)
      const url = new URL(route.request().url());
      if (!url.search) {
        await route.fulfill({ status: 200, json: loggedInUser.value });
      } else {
        route.continue();
      }
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

test("updateUser - change password", async ({ page }) => {
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

  // Update password
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");

  await page.locator("#password").click();
  await page.locator("#password").fill("");
  await page.locator("#password").fill("newpassword");
  await page.getByRole("button", { name: "Update" }).click();
  await page.waitForURL(/.*dashboard/, { timeout: 5000 }).catch(() => {});

  // Verify old password no longer works
  await page.getByRole("link", { name: "Logout" }).click();
  await page.getByRole("link", { name: "Login" }).click();

  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("diner");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByText("401")).toBeVisible();

  // Verify new password works
  await page.getByRole("textbox", { name: "Password" }).clear();
  await page.getByRole("textbox", { name: "Password" }).fill("newpassword");
  await page.getByRole("button", { name: "Login" }).click();

  await page.getByRole("link", { name: "pd" }).click();
  await expect(page.getByRole("main")).toContainText("pizza diner");
});

test("updateUser - admin role", async ({ page }) => {
  const email = "admin@jwt.com";
  const loggedInUser = {
    value: {
      id: "1",
      name: "Admin User",
      email,
      password: "admin",
      roles: [{ role: Role.Admin }],
    } as User,
  };

  await setupMocks(page, loggedInUser);

  // Similarly set up auth route for admin
  await page.route("*/**/api/auth", async (route) => {
    const method = route.request().method();
    if (method === "PUT") {
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
      await route.fulfill({ json: { message: "logout successful" } });
    }
  });

  await page.goto("/");
  await page.getByRole("link", { name: "Login" }).click();

  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("admin");
  await page.getByRole("button", { name: "Login" }).click();

  await page.getByRole("link", { name: "AU" }).click();

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.getByRole("textbox").first().fill("Super Admin");
  await page.getByRole("button", { name: "Update" }).click();
  await page.waitForURL(/.*dashboard/, { timeout: 5000 }).catch(() => {});

  await expect(page.getByRole("main")).toContainText("Super Admin");
  await page.getByRole("link", { name: "Logout" }).click();
  await page.getByRole("link", { name: "Login" }).click();

  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("admin");
  await page.getByRole("button", { name: "Login" }).click();

  await page.getByRole("link", { name: "SA" }).click();
  await expect(page.getByRole("main")).toContainText("Super Admin");
});

test("updateUser - franchisee role", async ({ page }) => {
  const email = "franchisee@jwt.com";
  const loggedInUser = {
    value: {
      id: "2",
      name: "Franchisee User",
      email,
      password: "franchisee",
      roles: [{ role: Role.Franchisee }],
    } as User,
  };

  await setupMocks(page, loggedInUser);

  await page.route("*/**/api/auth", async (route) => {
    const method = route.request().method();
    if (method === "PUT") {
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
      await route.fulfill({ json: { message: "logout successful" } });
    }
  });

  await page.goto("/");
  await page.getByRole("link", { name: "Login" }).click();

  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("franchisee");
  await page.getByRole("button", { name: "Login" }).click();

  await page.getByRole("link", { name: "FU" }).click();

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.getByRole("textbox").first().fill("Franchisee Manager");
  await page.getByRole("button", { name: "Update" }).click();
  await page.waitForURL(/.*dashboard/, { timeout: 5000 }).catch(() => {});

  await expect(page.getByRole("main")).toContainText("Franchisee Manager");

  await page.getByRole("link", { name: "Logout" }).click();
  await page.getByRole("link", { name: "Login" }).click();

  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("franchisee");
  await page.getByRole("button", { name: "Login" }).click();

  await page.getByRole("link", { name: "FM" }).click();
  await expect(page.getByRole("main")).toContainText("Franchisee Manager");
});

test("admin lists all users with pagination", async ({ page }) => {
  const adminEmail = "admin@jwt.com";
  const adminPassword = "admin";
  const loggedInUser = {
    value: {
      id: "1",
      name: "Admin User",
      email: adminEmail,
      password: adminPassword,
      roles: [{ role: Role.Admin }],
    } as User,
  };

  await setupMocks(page, loggedInUser);

  await page.route("*/**/api/auth", async (route) => {
    const method = route.request().method();
    if (method === "PUT") {
      const loginReq = await route.request().postDataJSON();
      if (
        loggedInUser.value &&
        loginReq.email === loggedInUser.value.email &&
        loginReq.password === loggedInUser.value.password
      ) {
        await route.fulfill({
          json: { user: loggedInUser.value, token: "admin-token" },
        });
      } else {
        await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
      }
    } else if (method === "DELETE") {
      await route.fulfill({ json: { message: "logout successful" } });
    }
  });

  // Mock the /api/user endpoint for listing users and deleting users
  await page.route(/\/api\/user(\/.*)?(\?.*)?$/, async (route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());

    if (method === "GET") {
      const pageParam = url.searchParams.get("page") || "0";
      const limit = url.searchParams.get("limit") || "10";
      const name = url.searchParams.get("name") || "*";

      // Simulate a list of users from the backend
      const allUsers = [
        {
          id: 3,
          name: "Kai Chen",
          email: "d@jwt.com",
          roles: [{ role: Role.Diner }],
        },
        {
          id: 5,
          name: "Buddy",
          email: "b@jwt.com",
          roles: [{ role: Role.Admin }],
        },
        {
          id: 1,
          name: "Admin User",
          email: "admin@jwt.com",
          roles: [{ role: Role.Admin }],
        },
      ];

      // Filter users by name if not wildcard
      let filteredUsers = allUsers;
      if (name !== "*") {
        const searchTerm = name.replace(/\*/g, "").toLowerCase();
        filteredUsers = allUsers.filter((u) =>
          u.name.toLowerCase().includes(searchTerm),
        );
      }

      const startIdx = parseInt(pageParam) * parseInt(limit);
      const endIdx = startIdx + parseInt(limit);
      const paginatedUsers = filteredUsers.slice(startIdx, endIdx);
      const more = endIdx < filteredUsers.length;

      await route.fulfill({
        json: { users: paginatedUsers, more },
      });
    } else if (method === "DELETE") {
      // Handle user deletion
      const userId = url.pathname.split("/").pop();
      await route.fulfill({ json: { message: "User deleted" } });
    }
  });

  // Mock franchise endpoint
  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    await route.fulfill({ json: { franchises: [], more: false } });
  });

  await page.goto("/");
  await page.getByRole("link", { name: "Login" }).click();

  await page.getByRole("textbox", { name: "Email address" }).fill(adminEmail);
  await page.getByRole("textbox", { name: "Password" }).fill(adminPassword);
  await page.getByRole("button", { name: "Login" }).click();

  // Navigate to admin dashboard
  await page.getByRole("link", { name: "Admin" }).click();

  // Verify users table is displayed with user data
  await expect(page.getByText("Kai Chen")).toBeVisible();
  await expect(page.getByText("d@jwt.com")).toBeVisible();
  await expect(page.getByText("Buddy")).toBeVisible();
  await expect(page.getByText("b@jwt.com")).toBeVisible();
});

test("admin deletes a user", async ({ page }) => {
  const adminEmail = "admin@jwt.com";
  const adminPassword = "admin";
  let loggedInUser: User | undefined;
  let allUsers = [
    {
      id: "3",
      name: "Kai Chen",
      email: "d@jwt.com",
      roles: [{ role: Role.Diner }],
    },
    {
      id: "5",
      name: "Buddy",
      email: "b@jwt.com",
      roles: [{ role: Role.Admin }],
    },
    {
      id: "1",
      name: "Admin User",
      email: adminEmail,
      password: adminPassword,
      roles: [{ role: Role.Admin }],
    },
  ];

  // Mock auth endpoint
  await page.route("*/**/api/auth", async (route) => {
    const method = route.request().method();
    if (method === "PUT") {
      const loginReq = await route.request().postDataJSON();
      if (
        loginReq.email === adminEmail &&
        loginReq.password === adminPassword
      ) {
        loggedInUser = allUsers.find((u) => u.email === adminEmail) as User;
        await route.fulfill({
          json: { user: loggedInUser, token: "admin-token" },
        });
      } else {
        await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
      }
    } else if (method === "DELETE") {
      await route.fulfill({ json: { message: "logout successful" } });
    }
  });

  // Mock user/me endpoint
  await page.route("*/**/api/user/me", async (route) => {
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: loggedInUser });
  });

  // Mock the /api/user endpoint for listing users and deleting users
  await page.route(/\/api\/user(\/.*)?(\?.*)?$/, async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      const url = new URL(route.request().url());
      const pageParam = url.searchParams.get("page") || "0";
      const limit = url.searchParams.get("limit") || "10";
      const name = url.searchParams.get("name") || "*";

      // Filter users by name if not wildcard
      let filteredUsers = allUsers;
      if (name !== "*") {
        const searchTerm = name.replace(/\*/g, "").toLowerCase();
        filteredUsers = allUsers.filter((u) =>
          u.name.toLowerCase().includes(searchTerm),
        );
      }

      const startIdx = parseInt(pageParam) * parseInt(limit);
      const endIdx = startIdx + parseInt(limit);
      const paginatedUsers = filteredUsers.slice(startIdx, endIdx);
      const more = endIdx < filteredUsers.length;

      await route.fulfill({
        json: { users: paginatedUsers, more },
      });
    } else if (method === "DELETE") {
      // Handle user deletion
      const url = new URL(route.request().url());
      const userId = url.pathname.split("/").pop();
      allUsers = allUsers.filter((u) => u.id !== userId);
      await route.fulfill({ json: { message: "User deleted" } });
    }
  });

  // Mock franchise endpoint
  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    await route.fulfill({ json: { franchises: [], more: false } });
  });

  await page.goto("/");

  // Log in as admin
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill(adminEmail);
  await page.getByRole("textbox", { name: "Password" }).fill(adminPassword);
  await page.getByRole("button", { name: "Login" }).click();

  // Navigate to admin dashboard
  await page.getByRole("link", { name: "Admin" }).click();

  // Verify Kai Chen is visible
  await expect(page.getByText("Kai Chen")).toBeVisible();

  // Delete the user (first click navigates to confirmation page)
  const deleteButtons = await page
    .getByRole("button", { name: /Delete/ })
    .all();
  // Click the first delete button (for Kai Chen)
  await deleteButtons[0].click();

  // Verify confirmation page is shown
  await expect(
    page.getByText(/Are you sure you want to delete the user/),
  ).toBeVisible();

  // Click Delete again to confirm
  await page
    .getByRole("button", { name: /Delete/ })
    .first()
    .click();

  // Wait for navigation back to admin dashboard
  await expect(
    page.getByRole("heading", { name: "Mama Ricci's kitchen" }),
  ).toBeVisible();

  // Verify Kai Chen is no longer visible
  await expect(page.getByText("Kai Chen")).not.toBeVisible();
});
