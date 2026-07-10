import { logger } from "./logger.js";

// Transactional-email seam (E-2). There is NO sending domain yet, so the active implementation is
// a no-op that logs loudly; when a domain lands, add a provider implementation (Resend/Postmark/SES)
// behind getMailer() and nothing else changes. Policy: email carries NOTIFICATIONS ("your export is
// ready", receipts) — never the sensitive payload itself; data is served in-app over authenticated
// TLS (see /account/export).
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  /** Returns true only if the message was actually handed to a provider. */
  send(message: MailMessage): Promise<boolean>;
}

class NoopMailer implements Mailer {
  async send(message: MailMessage): Promise<boolean> {
    logger.warn({ to: message.to, subject: message.subject }, "Mailer not configured — email NOT sent");
    return false;
  }
}

const mailer: Mailer = new NoopMailer();

export function getMailer(): Mailer {
  return mailer;
}
