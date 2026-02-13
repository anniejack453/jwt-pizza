import { test, expect } from "playwright-test-coverage";
import { Page } from "@playwright/test";
import { User, Role } from "../src/service/pizzaService";

async function basicInit(page: Page) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = {
    "d@jwt.com": {
      id: "3",
      name: "Kai Chen",
      email: "d@jwt.com",
      password: "a",
      roles: [{ role: Role.Diner }],
    },
  };

  // Authorize login for the given user
  await page.route("*/**/api/auth", async (route) => {
    const loginReq = route.request().postDataJSON();
    const user = validUsers[loginReq.email];
    if (!user || user.password !== loginReq.password) {
      await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
      return;
    }
    loggedInUser = validUsers[loginReq.email];
    const loginRes = {
      user: loggedInUser,
      token: "abcdef",
    };
    expect(route.request().method()).toBe("PUT");
    await route.fulfill({ json: loginRes });
  });

  // Return the currently logged in user
  await page.route("*/**/api/user/me", async (route) => {
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: loggedInUser });
  });

  // A standard menu
  await page.route("*/**/api/order/menu", async (route) => {
    const menuRes = [
      {
        id: 1,
        title: "Veggie",
        image: "pizza1.png",
        price: 0.0038,
        description: "A garden of delight",
      },
      {
        id: 2,
        title: "Pepperoni",
        image: "pizza2.png",
        price: 0.0042,
        description: "Spicy treat",
      },
    ];
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: menuRes });
  });

  // Standard franchises and stores
  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    const franchiseRes = {
      franchises: [
        {
          id: 2,
          name: "LotaPizza",
          stores: [
            { id: 4, name: "Lehi" },
            { id: 5, name: "Springville" },
            { id: 6, name: "American Fork" },
          ],
        },
        { id: 3, name: "PizzaCorp", stores: [{ id: 7, name: "Spanish Fork" }] },
        { id: 4, name: "topSpot", stores: [] },
      ],
    };
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: franchiseRes });
  });

  // Order a pizza.
  await page.route("*/**/api/order", async (route) => {
    const method = route.request().method();

    if (method === "POST") {
      // Create order
      const orderReq = route.request().postDataJSON();
      const orderRes = {
        order: { ...orderReq, id: 23 },
        jwt: "eyJpYXQ",
      };
      await route.fulfill({ json: orderRes });
    } else if (method === "GET") {
      // Get order history for diner dashboard
      const orderHistory = {
        dinerId: 3,
        orders: [
          {
            id: 1,
            franchiseId: 2,
            storeId: 4,
            date: "2024-06-05T05:14:40.000Z",
            items: [
              { id: 1, menuId: 1, description: "Veggie", price: 0.0038 },
              { id: 2, menuId: 2, description: "Pepperoni", price: 0.0042 },
            ],
          },
        ],
        page: 1,
      };
      await route.fulfill({ json: orderHistory });
    }
  });

  await page.goto("/");
}

test("view about page", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "About" }).click();
  await expect(page.getByRole("img").nth(3)).toBeVisible();
  await expect(page.getByText("The secret sauce")).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Employee stock photo" }).nth(1),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "History" })).toBeVisible();
  await expect(
    page.getByRole("contentinfo").getByRole("link", { name: "Franchise" }),
  ).toBeVisible();
});

test("view history page", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "History" }).click();

  await expect(page.getByText("Mama Rucci, my my")).toBeVisible();
  await expect(page.getByRole("main").getByRole("img")).toBeVisible();
});

test("view franchise page while not logged in", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Franchise" })
    .click();
  await expect(page.getByText("So you want a piece of the")).toBeVisible();
  await expect(
    page
      .locator("div")
      .filter({
        hasText:
          /^If you are already a franchisee, pleaseloginusing your franchise account$/,
      })
      .nth(2),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "-555-5555" })).toBeVisible();
});

test("view diner dashboard as logged in diner", async ({ page }) => {
  await basicInit(page);

  // Log in as diner
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("d@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("a");
  await page.getByRole("button", { name: "Login" }).click();

  // Navigate to diner dashboard
  await page.getByRole("link", { name: "KC" }).click();

  // Verify dashboard content
  await expect(page.getByText("Your pizza kitchen")).toBeVisible();
  await expect(page.getByText("Kai Chen")).toBeVisible();
  await expect(page.getByText("d@jwt.com")).toBeVisible();
});
