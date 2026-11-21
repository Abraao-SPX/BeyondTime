export const MIN_ALLOWED_AGE = 50;
export const MIN_HOBBIES_COUNT = 3;
export const MAX_HOBBIES_COUNT = 10;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_SECONDS = 15 * 60;

const MIN_BIRTH_YEAR = 1900;

const MAX_SANITIZE_PASSES = 5;

const XSS_DANGEROUS_PATTERN =
  /<\s*\/?\s*[a-z!]|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|\bon[a-z]{2,30}\s*=|expression\s*\(|eval\s*\(|&lt;\s*\/?\s*[a-z!]|&#/i;

const SCRIPT_BLOCK_PATTERN =
  /<\s*(script|iframe|object|embed|svg|math|style|link|meta|base|form)\b[^<>]{0,512}>[\s\S]{0,10000}?<\s*\/\s*\1\s*>/gi;

const ANY_TAG_PATTERN = /<[^<>]{0,1024}>/g;

function decodeDangerousHtmlEntities(input: string): string {
  return input
    .replace(/&amp;(?=(?:lt|gt|quot|apos|colon|#))/gi, '&')
    .replace(/&#x([0-9a-f]{1,6});?/gi, (_, hex: string) => {
      const cp = Number.parseInt(hex, 16);
      return cp >= 32 && cp <= 0x10ffff ? String.fromCodePoint(cp) : '';
    })
    .replace(/&#([0-9]{1,7});?/g, (_, dec: string) => {
      const cp = Number.parseInt(dec, 10);
      return cp >= 32 && cp <= 0x10ffff ? String.fromCodePoint(cp) : '';
    })
    .replace(/&lt(?:;|(?![a-z0-9]))/gi, '<')
    .replace(/&gt(?:;|(?![a-z0-9]))/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&colon;/gi, ':');
}

export function containsDangerousXss(value: string): boolean {
  if (!value) return false;
  let normalized = value.normalize('NFKC').replace(/\u0000/g, '');
  for (let pass = 0; pass < MAX_SANITIZE_PASSES; pass += 1) {
    if (XSS_DANGEROUS_PATTERN.test(normalized)) {
      return true;
    }
    const decoded = decodeDangerousHtmlEntities(normalized);
    if (decoded === normalized) break;
    normalized = decoded;
  }
  return XSS_DANGEROUS_PATTERN.test(normalized);
}

export function sanitizeTextInput(value: string): string {
  if (!value) return '';
  let clean = value.normalize('NFKC').replace(/[\u0000-\u001F\u007F]/g, '');
  let pass = 0;
  while (pass < MAX_SANITIZE_PASSES) {
    const prev = clean;
    clean = decodeDangerousHtmlEntities(clean)
      .replace(SCRIPT_BLOCK_PATTERN, '')
      .replace(ANY_TAG_PATTERN, '')
      .replace(/javascript\s*:|vbscript\s*:|data\s*:\s*text\/html/gi, '')
      .replace(/\bon[a-z]{2,30}\s*=/gi, '')
      .replace(/(?:expression|eval)\s*\(/gi, '')
      .replace(/[<>]/g, '');
    if (clean === prev) break;
    pass += 1;
  }
  return clean.trim();
}

export function validateHobbiesSelection(hobbies: readonly string[]): string | null {
  const uniqueHobbies = new Set(
    hobbies.map((h) => h.trim().toLowerCase()).filter((h) => h.length > 0)
  );
  if (uniqueHobbies.size < MIN_HOBBIES_COUNT) {
    return `Selecione pelo menos ${MIN_HOBBIES_COUNT} interesses distintos para continuar.`;
  }
  if (uniqueHobbies.size > MAX_HOBBIES_COUNT) {
    return `Você pode selecionar no máximo ${MAX_HOBBIES_COUNT} interesses.`;
  }
  return null;
}

export function validateContactValue(rawValue: string): string | null {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return 'Informe seu e-mail ou número de celular com DDD para continuar.';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (emailPattern.test(trimmed)) {
    return null;
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length === 10 || digitsOnly.length === 11) {
    return null;
  }

  return 'Digite um e-mail válido (exemplo@email.com) ou celular com DDD.';
}

export function formatBirthDateInput(rawValue: string): string {
  const digits = rawValue.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function calculateAgeFromBirthDate(
  birthDate: string,
  referenceDate: Date = new Date()
): number | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(birthDate.trim());
  if (match === null) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (year < MIN_BIRTH_YEAR || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  if (parsed.getTime() > referenceDate.getTime()) {
    return null;
  }

  let age = referenceDate.getFullYear() - year;
  const monthDiff = referenceDate.getMonth() - (month - 1);
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && referenceDate.getDate() < day)
  ) {
    age -= 1;
  }

  return age;
}

export function validateBirthDate50Plus(birthDate: string): string | null {
  if (birthDate.trim().length < 10) {
    return 'Informe sua data de nascimento completa no formato DD/MM/AAAA.';
  }

  const age = calculateAgeFromBirthDate(birthDate);
  if (age === null) {
    return 'Data de nascimento inválida. Verifique o dia, mês e ano informados.';
  }

  if (age < MIN_ALLOWED_AGE) {
    return 'Cadastro exclusivo para o público 50+. Para manter nossa comunidade segura e fiel ao seu propósito, o acesso é permitido apenas para pessoas com 50 anos ou mais.';
  }

  return null;
}

export function validateStrongPassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return `A senha deve ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.`;
  }

  if (/\s/.test(password)) {
    return 'A senha não pode conter espaços em branco.';
  }

  if (!/[A-Z]/.test(password)) {
    return 'A senha deve conter pelo menos uma letra maiúscula (A-Z).';
  }

  if (!/[a-z]/.test(password)) {
    return 'A senha deve conter pelo menos uma letra minúscula (a-z).';
  }

  if (!/[0-9]/.test(password)) {
    return 'A senha deve conter pelo menos um número (0-9).';
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return 'A senha deve conter pelo menos um caractere especial (ex.: . , @ ! # $ % & *).';
  }

  return null;
}

export function validatePasswordMatch(
  password: string,
  confirmPassword: string
): string | null {
  const strengthError = validateStrongPassword(password);
  if (strengthError !== null) {
    return strengthError;
  }

  if (password !== confirmPassword) {
    return 'As senhas digitadas não coincidem. Verifique e tente novamente.';
  }

  return null;
}
