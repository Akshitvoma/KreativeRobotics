import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load local environment variables when running locally or in development
dotenv.config();

export const config = {
  maxDuration: 15,
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        // use as-is
      }
    }

    const { name, email, phone, message } = body || {};

    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email, and message are required." });
    }

    const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const recipient = (process.env.RECIPIENT_EMAIL || user || "").trim();

    if (!user || !pass) {
      console.error("Missing SMTP credentials (SMTP_USER or SMTP_PASS)");
      return res.status(500).json({
        message: "Email service not configured. Missing SMTP_USER or SMTP_PASS on server.",
      });
    }

    const cleanUser = user.trim();
    const cleanPass = pass.replace(/\s+/g, "");

    const isGmail = host.toLowerCase().includes("gmail");
    const transportConfig = isGmail
      ? {
          service: "gmail",
          auth: {
            user: cleanUser,
            pass: cleanPass,
          },
        }
      : {
          host,
          port,
          secure: port === 465,
          auth: {
            user: cleanUser,
            pass: cleanPass,
          },
        };

    const transporter = nodemailer.createTransport(transportConfig);

    const safeName = String(name).replace(/[<>]/g, "");
    const safeEmail = String(email).replace(/[<>]/g, "");
    const safePhone = phone ? String(phone).replace(/[<>]/g, "") : "N/A";
    const safeMessage = String(message).replace(/[<>]/g, "").replace(/\n/g, "<br/>");

    const adminEmailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { width: 90%; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
    .header { background-color: #0f172a; color: #ffffff; padding: 15px; text-align: center; border-radius: 6px 6px 0 0; }
    .content { padding: 20px 10px; }
    .footer { margin-top: 20px; font-size: 0.85em; text-align: center; color: #777; border-top: 1px solid #eee; padding-top: 12px; }
    ul { list-style: none; padding: 0; }
    li { margin-bottom: 12px; }
    strong { color: #111; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin:0;color:#fff;">New Inquiry for Kreative Robotics</h2>
    </div>
    <div class="content">
      <p>You have received a new message from the contact form:</p>
      <ul>
        <li><strong>Name:</strong> ${safeName}</li>
        <li><strong>Email:</strong> ${safeEmail}</li>
        <li><strong>Phone:</strong> ${safePhone}</li>
        <li><strong>Message:</strong><br/>${safeMessage}</li>
      </ul>
    </div>
    <div class="footer">
      <p>&copy; Kreative Robotics. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

    const userReplyEmailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { width: 90%; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
    .header { background-color: #0f172a; color: #ffffff; padding: 15px; text-align: center; border-radius: 6px 6px 0 0; }
    .content { padding: 20px 10px; }
    .footer { margin-top: 20px; font-size: 0.85em; text-align: center; color: #777; border-top: 1px solid #eee; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin:0;color:#fff;">Thank You for Reaching Out!</h2>
    </div>
    <div class="content">
      <p>Dear ${safeName},</p>
      <p>Thank you for reaching out to <strong>Kreative Robotics</strong>. We have received your inquiry and appreciate your interest.</p>
      <p>Our team will review your message and get back to you shortly, typically within 1-2 business days.</p>
      <p>In the meantime, feel free to explore our website for more information about our robotics and STEM programs.</p>
      <p>Warm regards,<br/><strong>The Kreative Robotics Team</strong></p>
    </div>
    <div class="footer">
      <p><a href="mailto:info.kreativerobotics@gmail.com">info.kreativerobotics@gmail.com</a> | +91-91219 00667</p>
      <p>&copy; Kreative Robotics. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

    const mailOptionsAdmin = {
      from: `"Kreative Robotics Web" <${cleanUser}>`,
      to: recipient,
      replyTo: safeEmail,
      subject: `New Contact Form Inquiry from ${safeName}`,
      html: adminEmailHtml,
    };

    // Send primary email to admin
    await transporter.sendMail(mailOptionsAdmin);

    // Send confirmation to user (safe / non-blocking)
    try {
      const mailOptionsUser = {
        from: `"Kreative Robotics" <${cleanUser}>`,
        to: safeEmail,
        subject: "Thank You for Your Inquiry - Kreative Robotics",
        html: userReplyEmailHtml,
      };
      await transporter.sendMail(mailOptionsUser);
    } catch (userMailErr) {
      console.warn("Could not send auto-reply to user:", userMailErr.message);
    }

    return res.status(200).json({ message: "Your message has been sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    return res.status(500).json({
      message: `Failed to send email: ${error.message || "Unknown error"}`,
      error: error.message,
    });
  }
}
