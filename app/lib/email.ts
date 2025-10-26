import nodemailer from "nodemailer";

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn("SMTP_USER or SMTP_PASS not set. Emails will fail.");
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: true, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendInvitationEmail({
  to,
  childName,
  defaultPassword,
  inviteLink,
}: {
  to: string;
  childName: string;
  defaultPassword?: string;
  inviteLink: string;
}) {
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #333;">
      <h2>Invitation to Cashteen Parent Portal</h2>
      <p>Hello,</p>
      <p>You have been invited to view purchases for <strong>${childName}</strong>.</p>
      ${
        defaultPassword
          ? `<p><strong>Temporary password:</strong> ${defaultPassword}</p>
             <p>Use this email (${to}) and the temporary password above to log in. We recommend changing the password after first login. This may serve as your account
             for monitoring your child's purchases.</p>`
          : `<p>Please click the button below to accept the invitation and set your password.</p>`
      }
      <p style="text-align:center; margin: 24px 0;">
        <a href="${inviteLink}" style="text-decoration:none; background:#0d6efd; color:white; padding:12px 20px; border-radius:6px; display:inline-block;">
          Open Parent Portal
        </a>
      </p>
      <p style="font-size:12px; color:#666">If the button doesn't work, open this link in your browser: ${inviteLink}</p>
      <hr/>
      <p style="font-size:12px; color:#666">This is an automated message from Cashteen.</p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"Cashteen" <${process.env.SMTP_USER}>`,
    to,
    subject: `Invitation: Access ${childName} purchases on Cashteen`,
    html,
  });

  return info;
}
