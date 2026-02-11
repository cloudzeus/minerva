#!/usr/bin/env node
/**
 * Test SMTP (noreply@aic.gr). Usage:
 *   node --env-file=.env scripts/test-email.mjs
 *   node --env-file=.env scripts/test-email.mjs someone@example.com
 *
 * Requires Node 20+ for --env-file, or set SMTP_* in the environment.
 */
import nodemailer from "nodemailer";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const envPath = join(rootDir, ".env");

// Load .env from project root (so it works even when --env-file is not used or .env is ignored)
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed) continue;
    const m = trimmed.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) {
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      process.env[key] = val;
    }
  }
}

const host = process.env.SMTP_SERVER;
const port = Number(process.env.SMTP_PORT) || 587;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASSWORD;
const to = process.argv[2] || user || "noreply@aic.gr";

if (!host || !user || !pass) {
  console.error("Missing SMTP config. Set SMTP_SERVER, SMTP_USER, SMTP_PASSWORD in .env or environment.");
  process.exit(1);
}

async function main() {
  console.log("Sending test email via", host + ":" + port, "from", user, "to", to, "...");
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  await transporter.sendMail({
    from: `"AIC IOT ALERTS" <${user}>`,
    to,
    subject: "MINERVA SMTP test",
    text: "This is a test email from the MINERVA alert mail script. If you received this, SMTP is working.",
    html: "<p>This is a test email from the <strong>MINERVA</strong> alert mail script.</p><p>If you received this, SMTP is working.</p>",
  });
  console.log("Test email sent successfully to", to);
}

main().catch((err) => {
  console.error("Failed to send test email:", err.message);
  process.exit(1);
});
