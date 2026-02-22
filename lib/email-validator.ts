// Список одноразовых email доменов
const DISPOSABLE_DOMAINS = [
  'temp-mail.org', 'guerrillamail.com', '10minutemail.com',
  'mailinator.com', 'throwaway.email', 'tempmail.com',
  'yopmail.com', 'maildrop.cc', 'getnada.com',
  'trashmail.com', 'fakeinbox.com', 'sharklasers.com',
  'grr.la', 'guerrillamail.biz', 'spam4.me',
  'tempmail.net', 'dispostable.com', 'emailondeck.com',
  'temp-mail.io', 'mohmal.com', 'minuteinbox.com',
  'mytemp.email', 'tempail.com', 'tempr.email'
];

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  return DISPOSABLE_DOMAINS.some(d => domain.includes(d) || d.includes(domain));
}

export function getEmailScore(email: string): number {
  let score = 100;
  const [localPart, domain] = email.toLowerCase().split('@');
  
  if (!localPart || !domain) return 0;
  
  // Одноразовый email
  if (isDisposableEmail(email)) {
    score -= 60;
  }
  
  // Подозрительные паттерны в local part
  if (/\d{5,}/.test(localPart)) {
    score -= 20; // Много цифр подряд (user12345@)
  }
  
  if (/^[a-z]+\d+$/.test(localPart)) {
    score -= 15; // Простой паттерн (user123@)
  }
  
  if (localPart.length < 3) {
    score -= 10; // Слишком короткий
  }
  
  if (/(.)\1{3,}/.test(localPart)) {
    score -= 15; // Повторяющиеся символы (aaaa@)
  }
  
  // Популярные домены (хорошо)
  const trustedDomains = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'icloud.com', 'protonmail.com', 'mail.ru', 'yandex.ru',
    'proton.me', 'pm.me'
  ];
  
  if (trustedDomains.includes(domain)) {
    score += 10;
  }
  
  // Корпоративный email (очень хорошо)
  if (!trustedDomains.includes(domain) && !isDisposableEmail(email)) {
    score += 15; // Вероятно корпоративный
  }
  
  return Math.max(0, Math.min(100, score));
}

export function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function getEmailAnalysis(email: string) {
  return {
    isValid: validateEmailFormat(email),
    isDisposable: isDisposableEmail(email),
    score: getEmailScore(email),
    domain: email.split('@')[1]?.toLowerCase() || '',
    localPart: email.split('@')[0]?.toLowerCase() || ''
  };
}
