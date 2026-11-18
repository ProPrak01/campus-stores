// End-to-end run of the Film Society story in a real browser.
// Usage: npm run e2e            (builds the web app first)
//        E2E_SCREENSHOTS=1 npm run e2e   (also writes docs/after/*.png)
// Needs Google Chrome installed. Starts its own API on a temporary state file and a spare port.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shots = process.env.E2E_SCREENSHOTS ? join(root, "docs/after") : null;
const port = 3100 + Math.floor(Math.random() * 800);
const base = `http://127.0.0.1:${port}`;
const tmp = mkdtempSync(join(tmpdir(), "campus-e2e-"));

const api = spawn("npx", ["tsx", "apps/api/src/server.ts"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), STATE_FILE: join(tmp, "state.json") },
  stdio: ["ignore", "ignore", "inherit"],
});

let browser;
let failed = false;
const cleanup = async () => {
  await browser?.close().catch(() => {});
  api.kill();
  rmSync(tmp, { recursive: true, force: true });
};

try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) break;
    } catch {}
    if (i > 60) throw new Error("API did not start");
    await new Promise((r) => setTimeout(r, 250));
  }

  browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  page.setDefaultTimeout(5000);
  const problems = [];
  page.on("pageerror", (e) => problems.push(String(e)));
  page.on("response", (r) => r.status() >= 400 && !r.url().includes("/api/") && problems.push(`HTTP ${r.status()} ${r.url()}`));
  // Chrome logs the automatic /favicon.ico request as "Failed to load resource"; real asset failures are caught above.
  page.on("console", (m) => m.type() === "error" && !m.text().startsWith("Failed to load resource") && problems.push(m.text()));

  const shot = (name) => shots && page.screenshot({ path: join(shots, `${name}.png`) });
  const kitRow = (text) => page.locator(".kit-line", { hasText: text });
  const step = async (name, fn) => {
    try {
      await fn();
      console.log("ok  ", name);
    } catch (e) {
      console.log("FAIL", name, "-", String(e.message).split("\n")[0]);
      await page.screenshot({ path: join(tmp, "..", `campus-e2e-fail.png`) }).catch(() => {});
      throw e;
    }
  };
  const advance = async (label) => {
    await page.getByRole("button", { name: label }).click();
    const confirm = page.getByRole("button", { name: "Advance", exact: true });
    if (await confirm.isVisible().catch(() => false)) await confirm.click();
  };
  const returnUnit = async (scope, unit, returnedBy) => {
    await scope.click();
    await page.getByLabel(/Which unit is in your hand/).selectOption(unit);
    if (returnedBy) await page.getByLabel("Returned by").selectOption(returnedBy);
    await page.getByRole("button", { name: "Confirm return" }).click();
  };

  await page.goto(base);
  await page.getByRole("button", { name: "Restart sample shift" }).click();

  await step("3:45 pm · open RQ-214", async () => {
    await page.locator(".row", { hasText: "RQ-214" }).getByRole("button", { name: "View form" }).click();
    await page.getByText("Courtyard screening").waitFor();
  });

  await step("3:45 pm · issue the whole kit to Kabir in one confirm", async () => {
    await page.getByRole("button", { name: "Issue kit" }).click();
    await page.getByLabel("Collected by").selectOption("Kabir Sen");
    await page.getByRole("button", { name: "Confirm — issue all" }).click();
    for (const [line, unit] of [["HDMI projector", "PR-04"], ["Portable speaker", "SP-02"], ["USB-C", "AD-12"]])
      await kitRow(line).getByText(unit).waitFor();
    await shot("1-kit-issued");
  });

  await step("7:30 pm · move time forward", async () => {
    await advance("Move to return time");
    await page.getByText("Friday · 7:30 pm").first().waitFor();
  });

  for (const [line, unit] of [["HDMI projector", "PR-04"], ["Portable speaker", "SP-02"]])
    await step(`7:30 pm · return ${unit} by unit ID`, async () => {
      await returnUnit(kitRow(line).getByRole("button", { name: "Return" }), unit);
      await kitRow(line).getByText("Returned", { exact: true }).waitFor();
    });

  await step("7:30 pm · record that Leela now holds AD-12", async () => {
    await kitRow("USB-C").getByRole("button", { name: "Pass on" }).click();
    await page.getByLabel("Pass to").selectOption("Leela Das");
    await page.getByRole("button", { name: "Confirm pass-on" }).click();
    await kitRow("USB-C").getByText(/Leela Das/).first().waitFor();
    await shot("2-partial-return");
  });

  await step("7:30 pm · Desk book shows the generated handover", async () => {
    await page.getByRole("button", { name: "Desk book" }).click();
    await page.getByText(/Expect AD-12/).waitFor();
    await shot("3-desk-book-handover");
  });

  await step("9:00 am · advancing with open loans and no note asks first", async () => {
    await page.getByRole("button", { name: "Move to next morning" }).click();
    await page.getByRole("button", { name: "Advance", exact: true }).click();
    await page.getByText("Saturday · 9:00 am").first().waitFor();
  });

  await step("9:00 am · register flags AD-12 as overdue", async () => {
    await page.getByRole("button", { name: "Loan register" }).click();
    await page.locator(".row", { hasText: "AD-12" }).getByText("Overdue").waitFor();
    await shot("4-morning-overdue");
  });

  await step("9:00 am · close AD-12 for the unit Leela hands over", async () => {
    const row = page.locator(".row", { hasText: "AD-12" });
    await returnUnit(row.getByRole("button", { name: "Record return" }), "AD-12", "Leela Das");
    await page.getByText(/AD-12 returned by Leela Das/).waitFor();
  });

  await step("9:00 am · RQ-214 is complete", async () => {
    await page.getByRole("button", { name: "Requests", exact: true }).click();
    await page.locator(".row", { hasText: "RQ-214" }).getByText("Complete").waitFor();
    await shot("5-complete");
  });

  await step("no page errors", async () => {
    if (problems.length) throw new Error(problems.join(" | "));
  });
} catch {
  failed = true;
} finally {
  await cleanup();
}
console.log(failed ? "\nE2E FAILED" : "\nE2E passed");
process.exit(failed ? 1 : 0);
