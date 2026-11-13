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
