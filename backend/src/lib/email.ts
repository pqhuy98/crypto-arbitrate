import nodemailer from 'nodemailer';
import { attempt } from '../rate-limiter';

const canSendEmail = false;

export function sendEmail(subject: string, text: string) {
  if (!canSendEmail || !attempt()) {
    return;
  }
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_FROM_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  transporter.sendMail({
    from: process.env.GMAIL_FROM_EMAIL,
    to: process.env.GMAIL_TO_EMAIL,
    subject,
    text,
  }, (err, info) => {
    if (err) {
      console.log('Failed to send email notification', { now: new Date(), err, info });
    } else {
      console.log('Sent email notification', { now: new Date() });
    }
  });
}
