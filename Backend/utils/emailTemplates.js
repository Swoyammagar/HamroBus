const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const brand = {
  name: 'HamroBus',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@hamrobus.com',
  primary: '#047857',
  primaryDark: '#065f46',
  text: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  bg: '#f3f4f6',
};

const currentYear = new Date().getFullYear();

const detailRows = (rows = []) =>
  rows
    .filter((row) => row && row.label && row.value !== undefined && row.value !== null && row.value !== '')
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding: 10px 0; color: ${brand.muted}; font-size: 13px; width: 38%;">${escapeHtml(label)}</td>
          <td style="padding: 10px 0; color: ${brand.text}; font-size: 14px; font-weight: 600;">${escapeHtml(value)}</td>
        </tr>
      `
    )
    .join('');

const detailsTable = (rows = []) => {
  const body = detailRows(rows);
  if (!body) return '';

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin: 22px 0; border-top: 1px solid ${brand.border}; border-bottom: 1px solid ${brand.border};">
      ${body}
    </table>
  `;
};

const paragraph = (text) => `
  <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.65;">
    ${text}
  </p>
`;

const companyEmail = ({
  eyebrow = brand.name,
  title,
  intro,
  body = '',
  details = [],
  cta,
  note,
  signoff = 'The HamroBus Team',
}) => `
  <div style="margin: 0; padding: 0; background: ${brand.bg}; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: ${brand.bg}; padding: 28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid ${brand.border};">
            <tr>
              <td style="padding: 30px 32px 22px; text-align: center; background: #ffffff;">
                <img src="cid:hamrobuslogo" alt="HamroBus" style="width: 112px; max-width: 45%; margin-bottom: 18px;" />
                <div style="font-size: 12px; letter-spacing: 1.4px; text-transform: uppercase; color: ${brand.primary}; font-weight: 700;">${escapeHtml(eyebrow)}</div>
                <h1 style="margin: 10px 0 0; color: ${brand.text}; font-size: 25px; line-height: 1.25; font-weight: 800;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 32px 30px;">
                ${intro ? paragraph(intro) : ''}
                ${body}
                ${detailsTable(details)}
                ${
                  cta
                    ? `<div style="margin: 24px 0; text-align: center;">
                        <a href="${escapeHtml(cta.href)}" style="display: inline-block; background: ${brand.primary}; color: #ffffff; text-decoration: none; padding: 13px 22px; border-radius: 8px; font-size: 14px; font-weight: 700;">${escapeHtml(cta.label)}</a>
                      </div>`
                    : ''
                }
                ${
                  note
                    ? `<div style="margin-top: 22px; padding: 14px 16px; background: #f9fafb; border: 1px solid ${brand.border}; border-radius: 10px; color: ${brand.muted}; font-size: 13px; line-height: 1.55;">${note}</div>`
                    : ''
                }
                <p style="margin: 24px 0 0; color: #374151; font-size: 15px; line-height: 1.65;">
                  Regards,<br />
                  <strong>${escapeHtml(signoff)}</strong>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 18px 32px; background: #f9fafb; border-top: 1px solid ${brand.border}; text-align: center; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                This is an automated message from ${brand.name}. For help, contact ${escapeHtml(brand.supportEmail)}.<br />
                &copy; ${currentYear} HamroBus. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
`;

const otpEmail = ({ title, greeting, message, otp, note }) =>
  companyEmail({
    eyebrow: 'Account Security',
    title,
    intro: `${escapeHtml(greeting)}`,
    body: `
      ${paragraph(escapeHtml(message))}
      <div style="margin: 28px 0; text-align: center;">
        <div style="display: inline-block; padding: 16px 24px; border-radius: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; color: ${brand.primaryDark}; font-size: 32px; letter-spacing: 8px; font-weight: 800;">
          ${escapeHtml(otp)}
        </div>
      </div>
    `,
    note: escapeHtml(note),
  });

const driverApprovalEmail = ({ firstName, licenseNo }) =>
  companyEmail({
    eyebrow: 'Driver Verification',
    title: 'Your driver account has been approved',
    intro: `Hello ${escapeHtml(firstName || 'Driver')},`,
    body: `
      ${paragraph('Congratulations. Your HamroBus driver registration has been reviewed and approved by our administration team. You can now sign in to the driver app and start using your account.')}
      ${paragraph('Please keep your profile, license information, and assigned trip details up to date so passengers and administrators can rely on accurate service information.')}
    `,
    details: [
      { label: 'Account status', value: 'Approved' },
      { label: 'License number', value: licenseNo || 'On file' },
      { label: 'Next step', value: 'Open the HamroBus driver app and sign in' },
    ],
    note: 'For safety and service quality, HamroBus may periodically review driver documents, trip activity, and platform conduct.',
  });

const driverRejectionEmail = ({ firstName, licenseNo }) =>
  companyEmail({
    eyebrow: 'Driver Verification',
    title: 'Update on your driver registration',
    intro: `Hello ${escapeHtml(firstName || 'Driver')},`,
    body: `
      ${paragraph('Thank you for applying to join HamroBus as a driver. After reviewing your submitted information, we are unable to approve your driver account at this time.')}
      ${paragraph('This may be due to incomplete, incorrect, or unverifiable registration details. If you believe this decision was made in error, please contact our support team with your registered email address and license information.')}
    `,
    details: [
      { label: 'Account status', value: 'Not approved' },
      { label: 'License number', value: licenseNo || 'On file' },
      { label: 'Support contact', value: brand.supportEmail },
    ],
    note: 'You may be asked to provide clearer documents or corrected information before your application can be reconsidered.',
  });

const adminDriverRegistrationEmail = ({ driverName, email, phoneNumber, licenseNo, submittedAt }) =>
  companyEmail({
    eyebrow: 'Admin Action Required',
    title: 'New driver registration request',
    intro: 'A new driver has completed registration and is waiting for administrative review.',
    body: paragraph('Please review the driver profile, license details, and uploaded documents in the admin panel before approving or rejecting the request.'),
    details: [
      { label: 'Driver name', value: driverName },
      { label: 'Email', value: email },
      { label: 'Phone', value: phoneNumber },
      { label: 'License number', value: licenseNo },
      { label: 'Submitted at', value: submittedAt },
    ],
    note: 'Approving this request allows the driver to sign in and operate through the HamroBus driver app.',
    signoff: 'HamroBus Admin System',
  });

const faqSubmissionEmail = ({ name, role, phoneNumber, email, title, message, faqId }) =>
  companyEmail({
    eyebrow: 'Customer Support',
    title: 'New FAQ submission received',
    intro: `${escapeHtml(name)} submitted a new question from the ${escapeHtml(role)} app.`,
    details: [
      { label: 'Submitter', value: name },
      { label: 'Role', value: role },
      { label: 'Phone', value: phoneNumber },
      { label: 'Email', value: email || 'Not provided' },
      { label: 'Subject', value: title },
      { label: 'FAQ ID', value: faqId },
    ],
    body: `
      <div style="margin: 22px 0; padding: 16px; border-radius: 10px; background: #f9fafb; border: 1px solid ${brand.border};">
        <div style="margin-bottom: 8px; color: ${brand.muted}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">Message</div>
        <div style="color: ${brand.text}; font-size: 14px; line-height: 1.65;">${escapeHtml(message)}</div>
      </div>
    `,
    note: 'Please review this submission in the admin panel and update the FAQ content if it should be published for users.',
    signoff: 'HamroBus Support System',
  });

const accountDeletedEmail = ({ name, userType }) =>
  companyEmail({
    eyebrow: 'Account Notice',
    title: 'Your HamroBus account has been deleted',
    intro: `Dear ${escapeHtml(name || 'User')},`,
    body: `
      ${paragraph(`We are writing to confirm that your ${escapeHtml(userType)} account has been permanently deleted by the HamroBus administration team.`)}
      ${paragraph('This action was taken according to our platform policies and account management procedures. You will no longer be able to access HamroBus services using this account.')}
    `,
    details: [
      { label: 'Account type', value: userType },
      { label: 'Status', value: 'Permanently deleted' },
      { label: 'Support contact', value: brand.supportEmail },
    ],
    note: 'Historical operational records may remain in anonymized form where required for safety, reporting, or legal compliance.',
  });

const missedTripApologyEmail = ({ passengerName, bookingCode, routeName, scheduleStart, scheduleEnd }) =>
  companyEmail({
    eyebrow: 'Booking Update',
    title: 'We are sorry your trip was cancelled',
    intro: `Hello ${escapeHtml(passengerName || 'Passenger')},`,
    body: `
      ${paragraph('We sincerely apologize. Your scheduled trip could not be started by the driver within the expected time, so your booking has been cancelled.')}
      ${paragraph('We know service reliability matters, and this incident has been recorded for operational review by the HamroBus team.')}
    `,
    details: [
      { label: 'Booking code', value: bookingCode },
      { label: 'Route', value: routeName },
      { label: 'Scheduled time', value: `${scheduleStart} - ${scheduleEnd}` },
    ],
    note: 'Please check the passenger app for the latest available buses and booking options.',
  });

module.exports = {
  companyEmail,
  otpEmail,
  driverApprovalEmail,
  driverRejectionEmail,
  adminDriverRegistrationEmail,
  faqSubmissionEmail,
  accountDeletedEmail,
  missedTripApologyEmail,
};
