import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import type { CategoryScoreSet, PrioritizedFix } from '@/lib/types';

type TransportResult = { sent: boolean; reason?: string };

type ReportEmailPayload = {
  to: string;
  shopName: string;
  score: number;
  reportUrl: string;
  categoryScores?: CategoryScoreSet;
  topFixes?: PrioritizedFix[];
  detectedSignals?: string[];
  missingSignals?: string[];
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

const resendConfigured = () => Boolean(process.env.RESEND_API_KEY);

const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function resolveFromAddress(): string {
  return (
    process.env.RESEND_FROM ||
    process.env.SMTP_FROM ||
    'Collision SEO Scan <reports@shopseoscan.com>'
  );
}

async function sendWithResend(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<TransportResult> {
  if (!resendConfigured() || !resendClient) {
    return { sent: false, reason: 'Resend not configured' };
  }

  try {
    const result = await resendClient.emails.send({
      from: resolveFromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text
    });

    if (result.error) {
      console.error('[email:resend:error]', result.error);
      return { sent: false, reason: 'Resend send failed' };
    }

    return { sent: true };
  } catch (error) {
    console.error('[email:resend:exception]', error);
    return { sent: false, reason: 'Resend send failed' };
  }
}

async function sendWithSmtp(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<TransportResult> {
  if (!smtpConfigured()) {
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
      from: resolveFromAddress(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html
    });

    return { sent: true };
  } catch (error) {
    console.error('[email:smtp:error]', error);
    return { sent: false, reason: 'SMTP send failed' };
  }
}

async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  fallbackLabel: string;
}): Promise<TransportResult> {
  const resendResult = await sendWithResend(input);
  if (resendResult.sent) return resendResult;

  const smtpResult = await sendWithSmtp(input);
  if (smtpResult.sent) return smtpResult;

  console.log(`[email:fallback:${input.fallbackLabel}]`, {
    to: input.to,
    subject: input.subject,
    text: input.text,
    resendReason: resendResult.reason,
    smtpReason: smtpResult.reason
  });

  return {
    sent: false,
    reason: resendResult.reason || smtpResult.reason || 'No email provider configured'
  };
}

export const sendReportEmail = async (payload: ReportEmailPayload): Promise<TransportResult> =>
  sendMail({
    to: payload.to,
    subject: `Your Collision SEO Scan (${payload.score}/100)`,
    text: `Hi ${payload.shopName || 'there'},

Your Collision SEO Scan is ready.
Overall score: ${payload.score}/100

Category breakdown:
- Technical SEO: ${payload.categoryScores?.technicalSeo ?? 'n/a'}
- Local SEO: ${payload.categoryScores?.localSeo ?? 'n/a'}
- Collision Authority: ${payload.categoryScores?.collisionAuthority ?? 'n/a'}
- Speed & Performance: ${payload.categoryScores?.speedPerformance ?? 'n/a'}
- Content Coverage: ${payload.categoryScores?.contentCoverage ?? 'n/a'}

Top 3 fixes:
1) ${payload.topFixes?.[0]?.title || 'Improve on-page technical basics'}
2) ${payload.topFixes?.[1]?.title || 'Strengthen collision authority signals'}
3) ${payload.topFixes?.[2]?.title || 'Close local conversion gaps'}

Detected signals: ${(payload.detectedSignals || []).slice(0, 5).join(', ') || 'None detected'}
Missing signals: ${(payload.missingSignals || []).slice(0, 5).join(', ') || 'None'}

Open full report: ${payload.reportUrl}

Want help fixing this? Book your teardown from the report.

- Collision SEO Scan`,
    html: `<p>Hi ${payload.shopName || 'there'},</p>
<p>Your Collision SEO Scan is ready.</p>
<p><strong>Overall score:</strong> ${payload.score}/100</p>
<p><strong>Category breakdown</strong><br/>
Technical SEO: ${payload.categoryScores?.technicalSeo ?? 'n/a'}<br/>
Local SEO: ${payload.categoryScores?.localSeo ?? 'n/a'}<br/>
Collision Authority: ${payload.categoryScores?.collisionAuthority ?? 'n/a'}<br/>
Speed & Performance: ${payload.categoryScores?.speedPerformance ?? 'n/a'}<br/>
Content Coverage: ${payload.categoryScores?.contentCoverage ?? 'n/a'}</p>
<p><strong>Top 3 fixes</strong></p>
<ol>
<li>${payload.topFixes?.[0]?.title || 'Improve on-page technical basics'}</li>
<li>${payload.topFixes?.[1]?.title || 'Strengthen collision authority signals'}</li>
<li>${payload.topFixes?.[2]?.title || 'Close local conversion gaps'}</li>
</ol>
<p><strong>Detected signals:</strong> ${
      (payload.detectedSignals || []).slice(0, 5).join(', ') || 'None detected'
    }<br/>
<strong>Missing signals:</strong> ${
      (payload.missingSignals || []).slice(0, 5).join(', ') || 'None'
    }</p>
<p><a href="${payload.reportUrl}">Open your full report</a></p>
<p>Want help fixing this? Book your teardown from the report.</p>
<p>- Collision SEO Scan</p>`,
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

export const sendPortalInviteEmail = async (
  payload: PortalInvitePayload
): Promise<TransportResult> =>
  sendMail({
    to: payload.to,
    subject: 'Your Collision SEO client portal access',
    text: `Hi ${payload.shopName},\n\nYour client portal is ready.\nLogin: ${payload.loginUrl}\nEmail: ${payload.to}\nTemporary password: ${payload.password}\n\nPlease log in and change credentials with us on kickoff.`,
    html: `<p>Hi ${payload.shopName},</p><p>Your client portal is ready.</p><p><strong>Login:</strong> <a href="${payload.loginUrl}">${payload.loginUrl}</a><br/><strong>Email:</strong> ${payload.to}<br/><strong>Temporary password:</strong> ${payload.password}</p><p>Please log in and change credentials with us on kickoff.</p>`,
    fallbackLabel: 'portal'
  });
