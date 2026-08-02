import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";

const CHROME_PATHS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  process.env.LOCALAPPDATA + "/Google/Chrome/Application/chrome.exe",
];
const executablePath = CHROME_PATHS.find((p) => existsSync(p));
if (!executablePath) throw new Error("Chrome not found");

const browser = await puppeteer.launch({ executablePath, headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on("console", (m) => console.log("[console]", m.type(), m.text()));
page.on("pageerror", (e) => console.log("[pageerror]", e.message));

await page.goto("http://localhost:3001/", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 1500));

const metrics = await page.evaluate(() => ({
  scrollHeight: document.documentElement.scrollHeight,
  innerHeight: window.innerHeight,
  bodyOverflow: getComputedStyle(document.body).overflow,
  htmlOverflow: getComputedStyle(document.documentElement).overflow,
}));
console.log("metrics:", JSON.stringify(metrics));

await page.screenshot({ path: "scripts/scroll-1-top.png" });

// Scroll into the showcase (should be near full grow width).
await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 0.9 }));
await new Promise((r) => setTimeout(r, 800));
const width = await page.evaluate(() => {
  const el = document.querySelector("section > div[style]");
  return el ? el.getBoundingClientRect().width : null;
});
console.log("showcase width mid-scroll:", width);
await page.screenshot({ path: "scripts/scroll-2-showcase.png" });

// Bottom: footer with DREAMFLUID + bottom bar.
await page.evaluate(() =>
  window.scrollTo({ top: document.documentElement.scrollHeight })
);
await new Promise((r) => setTimeout(r, 800));
const atBottom = await page.evaluate(
  () =>
    Math.abs(
      window.scrollY + window.innerHeight - document.documentElement.scrollHeight
    ) < 2
);
console.log("reached bottom:", atBottom);
await page.screenshot({ path: "scripts/scroll-3-footer.png" });

await browser.close();
console.log("done");
