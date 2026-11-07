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

const sendOtpEmail = async ({ email, name, otp }) => {
  const isDev = process.env.NODE_ENV === "development"

  // Lets the checkout be tested locally without a working mail setup
  if (isDev) {
    console.log(`[OTP] ${email}: ${otp}`)
  }

  let failure = null

  if (!process.env.RESEND_API_KEY) {
    failure = new Error("RESEND_API_KEY is not configured")
  } else {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

    // Resend reports failures in the result instead of throwing
    const { error } = await resend.emails.send({
      from,
      to: email,
      subject: `${otp} is your Vedyara sign-in code`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #3E2F1C;">
          <h2>Verify your email</h2>
          <p>Hi ${escapeHtml(name || "there")},</p>
          <p>Use this code to sign in to your Vedyara account:</p>
          <p style="font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #b8961f;">${otp}</p>
          <p>The code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
        </div>
      `,
    })

    if (error) {
      failure = new Error(error.message || "Email provider rejected the message")
    }
  }

  if (failure) {
    console.error("[OTP] Email delivery failed:", failure.message)

    if (!isDev) {
      const err = new Error("We couldn't send the verification email. Please try again in a moment.")
      err.statusCode = 502
      throw err
    }
  }
}

export default sendOtpEmail
