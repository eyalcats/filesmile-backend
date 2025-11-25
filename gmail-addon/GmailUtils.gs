/**
 * Gmail utilities for email operations
 */

/**
 * Get current message from event
 */
function getCurrentMessage(e) {
  const accessToken = e.messageMetadata.accessToken;
  const messageId = e.messageMetadata.messageId;

  GmailApp.setCurrentMessageAccessToken(accessToken);

  return GmailApp.getMessageById(messageId);
}

/**
 * Get email subject
 */
function getEmailSubject(message) {
  return message.getSubject();
}

/**
 * Get email sender
 */
function getEmailSender(message) {
  return message.getFrom();
}

/**
 * Get email as EML format (RFC 822)
 */
function getEmailAsEML(message) {
  try {
    // Get raw message content
    const raw = message.getRawContent();

    // Convert to base64
    const blob = Utilities.newBlob(raw, 'message/rfc822');
    const base64 = Utilities.base64Encode(blob.getBytes());

    return base64;
  } catch (e) {
    Logger.log('Failed to get email as EML: ' + e.message);
    throw e;
  }
}

/**
 * Get message attachments
 */
function getMessageAttachments(message) {
  const attachments = message.getAttachments();

  return attachments.map(function(att) {
    return {
      name: att.getName(),
      size: att.getSize(),
      contentType: att.getContentType(),
      data: Utilities.base64Encode(att.getBytes())
    };
  });
}

/**
 * Get email body as text
 */
function getEmailBodyText(message) {
  return message.getPlainBody();
}

/**
 * Get email body as HTML
 */
function getEmailBodyHtml(message) {
  return message.getBody();
}

/**
 * Get email date
 */
function getEmailDate(message) {
  return message.getDate();
}

/**
 * Get email recipients
 */
function getEmailRecipients(message) {
  return {
    to: message.getTo(),
    cc: message.getCc(),
    bcc: message.getBcc()
  };
}

/**
 * Check if email has attachments
 */
function hasAttachments(message) {
  return message.getAttachments().length > 0;
}

/**
 * Get email thread
 */
function getEmailThread(message) {
  return message.getThread();
}

/**
 * Get thread subject
 */
function getThreadSubject(message) {
  return message.getThread().getFirstMessageSubject();
}
