export const MIN_ALLOWED_AGE = 50;
export const MIN_HOBBIES_COUNT = 3;
export const MAX_HOBBIES_COUNT = 10;
export const MIN_PASSWORD_LENGTH = 8;

const MIN_BIRTH_YEAR = 1900;

export function validateHobbiesSelection(hobbies: readonly string[]): string | null {
  if (hobbies.length < MIN_HOBBIES_COUNT) {
    return `Selecione pelo menos ${MIN_HOBBIES_COUNT} interesses para continuar.`;
  }
  if (hobbies.length > MAX_HOBBIES_COUNT) {
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

export function validatePasswordMatch(
  password: string,
  confirmPassword: string
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  if (password !== confirmPassword) {
    return 'As senhas digitadas não coincidem. Verifique e tente novamente.';
  }

  return null;
}
