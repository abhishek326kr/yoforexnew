/**
 * Send SMTP Test Email Script
 * 
 * This script tests the SMTP configuration by sending an email
 * to the specified recipient.
 */

import { emailService } from './services/emailService';

const RECIPIENT_EMAIL = 'ranjan.nayak1968@gmail.com';

async function sendTestEmail() {
  console.log('='.repeat(60));
  console.log('YoForex SMTP Test Email');
  console.log('='.repeat(60));
  console.log(`Recipient: ${RECIPIENT_EMAIL}`);
  console.log(`From: ${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`);
  console.log(`SMTP Host: ${process.env.SMTP_HOST || 'smtp.hostinger.com'}`);
  console.log(`SMTP Port: ${process.env.SMTP_PORT || '465'}`);
  console.log('='.repeat(60));
  console.log();

  try {
    console.log('Sending test email...');
    
    const result = await emailService.sendTestEmail(
      RECIPIENT_EMAIL,
      'This is an automated test email from YoForex to verify SMTP functionality. ' +
      'If you receive this email, it means the email system is properly configured and working correctly.'
    );

    console.log();
    console.log('✅ SUCCESS! Test email sent successfully');
    console.log('='.repeat(60));
    console.log('Email Details:');
    console.log(`- Status: ${result.success ? 'SENT' : 'FAILED'}`);
    console.log(`- Message ID: ${result.messageId || 'N/A'}`);
    console.log(`- Recipient: ${RECIPIENT_EMAIL}`);
    console.log(`- Subject: YoForex SMTP Test Email`);
    console.log('='.repeat(60));
    console.log();
    console.log('Please check the recipient inbox (including spam folder) to confirm delivery.');
    
    process.exit(0);
  } catch (error: any) {
    console.error();
    console.error('❌ FAILED! Error sending test email');
    console.error('='.repeat(60));
    console.error('Error Details:');
    console.error(`- Message: ${error.message}`);
    console.error(`- Code: ${error.code || 'N/A'}`);
    console.error(`- Response: ${error.response || 'N/A'}`);
    console.error('='.repeat(60));
    console.error();
    console.error('Full error object:', error);
    
    process.exit(1);
  }
}

// Run the test
sendTestEmail();
