// Domaines d'emails jetables/temporaires connus, à refuser à l'inscription
const DISPOSABLE_DOMAINS = new Set([
  'yopmail.com', 'yopmail.fr', 'yopmail.net',
  'mailinator.com', 'mailinator.net', 'mailinator2.com',
  'tempmail.com', 'temp-mail.org', 'tempmailo.com', 'tempinbox.com', 'tempr.email',
  'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.net', 'guerrillamail.org', 'sharklasers.com',
  '10minutemail.com', '10minutemail.net', '20minutemail.com',
  'trashmail.com', 'trash-mail.com', 'throwawaymail.com', 'fakeinbox.com', 'dispostable.com',
  'getnada.com', 'maildrop.cc', 'mintemail.com', 'mailnesia.com', 'moakt.com',
  'emailondeck.com', 'discard.email', 'discardmail.com', 'spambog.com',
  'mytemp.email', 'burnermail.io', 'crazymailing.com', 'mail-temporaire.fr', 'jetable.org',
  '33mail.com', 'mohmal.com', 'harakirimail.com', 'mailcatch.com', 'mailnull.com',
  'tempail.com', 'fakemailgenerator.com', 'inboxbear.com', 'mailsac.com',
])

export function isDisposableEmail(email) {
  const domain = (email || '').split('@')[1]?.toLowerCase().trim()
  if (!domain) return false
  return DISPOSABLE_DOMAINS.has(domain)
}
