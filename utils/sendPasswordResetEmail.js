import { Resend } from "resend"

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }

    return entities[char]
  })

const sendPasswordResetEmail = async ({ email, name, resetUrl }) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured")
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

  await resend.emails.send({
    from,
    to: email,
    subject: "Reset your password",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Password reset request</h2>
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p>Use the button below to reset your password. This link expires in 15 minutes.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 18px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 8px;">
            Reset password
          </a>
        </p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  })
}

export default sendPasswordResetEmail
