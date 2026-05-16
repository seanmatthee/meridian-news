/**
 * email/send — wraps Resend with a console fallback for localhost dev.
 *
 * If RESEND_API_KEY is set AND RESEND_FROM is set, emails go through Resend.
 * Otherwise we log the OTP to the server terminal so the developer can
 * complete the flow without a configured email service.
 */
import { Resend } from "resend";

const FROM_DEFAULT = process.env.RESEND_FROM ?? "";

export interface SendOtpEmailArgs {
  to: string;
  otp: string;
}

export async function sendOtpEmail(args: SendOtpEmailArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = FROM_DEFAULT;

  if (!apiKey || !from) {
    // Dev fallback. Loud and obvious so no one ships this to prod by mistake.
    console.warn(
      [
        "─".repeat(60),
        "[meridian/email] Resend not configured — OTP printed to console.",
        `  to:  ${args.to}`,
        `  otp: ${args.otp}`,
        `  reason: ${apiKey ? "missing RESEND_FROM" : "missing RESEND_API_KEY"}`,
        "─".repeat(60),
      ].join("\n"),
    );
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: args.to,
    subject: "Your Meridian verification code",
    text: [
      `Your verification code is: ${args.otp}`,
      "",
      "It expires in 10 minutes.",
      "",
      "If you didn't request this, you can ignore this email.",
      "",
      "— Meridian",
    ].join("\n"),
    html: otpEmailHtml(args.otp),
  });

  if (error) {
    console.error("[meridian/email] resend send failed:", error);
    throw new Error(`email-send-failed: ${error.message}`);
  }
}

function otpEmailHtml(otp: string): string {
  return `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;background:#fafafa;padding:40px">
  <table style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:32px">
    <tr><td>
      <p style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#666;margin:0 0 16px">MERIDIAN</p>
      <h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px;color:#111">Your verification code</h1>
      <p style="font-size:14px;color:#444;line-height:1.6">Enter this code to finish creating your Meridian account:</p>
      <p style="font-family:'Menlo',monospace;font-size:32px;letter-spacing:0.3em;color:#111;margin:24px 0;background:#f5f5f5;padding:16px;text-align:center">${otp}</p>
      <p style="font-size:12px;color:#888">It expires in 10 minutes. If you didn't ask for this, ignore this email.</p>
    </td></tr>
  </table>
</body></html>`;
}
