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
page.on("pageerror", (e) => console.log("[pageerror]", e.message));

await page.goto("http://localhost:3001/", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 1800));

await page.screenshot({ path: "scripts/lens-scroll-0.png" });

// Mid hero exit — ring should be partly rotated / expanded.
await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 0.45 }));
await new Promise((r) => setTimeout(r, 600));
const mid = await page.evaluate(() => {
  const hero = document.querySelector("main > section");
  const r = hero?.getBoundingClientRect();
  return r
    ? { top: r.top, bottom: r.bottom, height: r.height, p: -r.top / r.height }
    : null;
});
console.log("mid:", mid);
await page.screenshot({ path: "scripts/lens-scroll-mid.png" });

// Near fully exited.
await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 0.85 }));
await new Promise((r) => setTimeout(r, 600));
const late = await page.evaluate(() => {
  const hero = document.querySelector("main > section");
  const r = hero?.getBoundingClientRect();
  return r
    ? { top: r.top, bottom: r.bottom, height: r.height, p: -r.top / r.height }
    : null;
});
console.log("late:", late);
await page.screenshot({ path: "scripts/lens-scroll-late.png" });

await browser.close();
console.log("done");
