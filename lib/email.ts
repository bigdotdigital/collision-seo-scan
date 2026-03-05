import nodemailer from 'nodemailer';

type TransportResult = { sent: boolean; reason?: string };

type ReportEmailPayload = {
  to: string;
  shopName: string;
  score: number;
  reportUrl: string;
};

type FollowupPayload = {
  to: string;
  shopName: string;
  reportUrl: string;
};

type PortalInvitePayload = {
  to: string;
  shopName: string;
  loginUrl: string;
  password: string;
};

const smtpConfigured = () =>
  Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  );

async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  fallbackLabel: string;
}): Promise<TransportResult> {
  if (!smtpConfigured()) {
    console.log(`[email:fallback:${input.fallbackLabel}]`, {
      to: input.to,
      subject: input.subject,
      text: input.text
    });
    return { sent: false, reason: 'SMTP not configured' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html
    });

    return { sent: true };
  } catch (error) {
    console.error('[email:error]', error);
    return { sent: false, reason: 'SMTP send failed' };
  }
}

export const sendReportEmail = async (payload: ReportEmailPayload): Promise<TransportResult> =>
  sendMail({
    to: payload.to,
    subject: `Your Collision SEO Scan (${payload.score}/100)`,
    text: `Hi ${payload.shopName || 'there'},\n\nYour Collision SEO Scan is ready.\nScore: ${payload.score}/100\nReport: ${payload.reportUrl}\n\n- Collision SEO Scan`,
    html: `<p>Hi ${payload.shopName || 'there'},</p><p>Your Collision SEO Scan is ready.</p><p><strong>Score:</strong> ${payload.score}/100</p><p><a href="${payload.reportUrl}">Open your report</a></p><p>- Collision SEO Scan</p>`,
    fallbackLabel: 'report'
  });

export const sendFollowupEmail = async (payload: FollowupPayload): Promise<TransportResult> =>
  sendMail({
    to: payload.to,
    subject: 'Quick follow-up on your Collision SEO report',
    text: `Hi ${payload.shopName || 'there'},\n\nSharing your report again in case you missed it:\n${payload.reportUrl}\n\nIf helpful, reply with your target city and we will prioritize the fastest wins.`,
    html: `<p>Hi ${payload.shopName || 'there'},</p><p>Sharing your report again in case you missed it:</p><p><a href="${payload.reportUrl}">${payload.reportUrl}</a></p><p>If helpful, reply with your target city and we will prioritize the fastest wins.</p>`,
    fallbackLabel: 'followup'
  });

export const sendPortalInviteEmail = async (payload: PortalInvitePayload): Promise<TransportResult> =>
  sendMail({
    to: payload.to,
    subject: 'Your Collision SEO client portal access',
    text: `Hi ${payload.shopName},\n\nYour client portal is ready.\nLogin: ${payload.loginUrl}\nEmail: ${payload.to}\nTemporary password: ${payload.password}\n\nPlease log in and change credentials with us on kickoff.`,
    html: `<p>Hi ${payload.shopName},</p><p>Your client portal is ready.</p><p><strong>Login:</strong> <a href="${payload.loginUrl}">${payload.loginUrl}</a><br/><strong>Email:</strong> ${payload.to}<br/><strong>Temporary password:</strong> ${payload.password}</p><p>Please log in and change credentials with us on kickoff.</p>`,
    fallbackLabel: 'portal'
  });
