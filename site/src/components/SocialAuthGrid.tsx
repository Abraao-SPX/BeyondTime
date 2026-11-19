import type { SocialProvider } from '../types/auth';

interface SocialAuthGridProps {
  onSelectProvider: (provider: SocialProvider) => void;
}

export function SocialAuthGrid({ onSelectProvider }: SocialAuthGridProps) {
  return (
    <div className="social-grid">
      <button
        type="button"
        className="btn-social"
        onClick={() => onSelectProvider('Google')}
      >
        <svg className="btn-social__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.8-5.4 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12Z"
          />
          <path
            fill="#4285F4"
            d="M21.2 12.2c0-.6-.1-1.1-.2-1.6H12v3.9h5.4c-.3 1.4-1.1 2.5-2.3 3.3l3.5 2.7c2-1.9 2.6-4.7 2.6-8.3Z"
          />
          <path
            fill="#FBBC05"
            d="M6 14.3c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L2.5 7C1.8 8.5 1.4 10.2 1.4 12s.4 3.5 1.1 5l3.5-2.7Z"
          />
          <path
            fill="#34A853"
            d="M12 21.6c2.6 0 4.8-.9 6.4-2.4l-3.5-2.7c-.9.6-2 .9-2.9.9-2.6 0-4.8-1.7-5.6-4.1l-3.5 2.7c1.6 3.3 5 5.6 9.1 5.6Z"
          />
        </svg>
        <span>Google</span>
      </button>

      <button
        type="button"
        className="btn-social"
        onClick={() => onSelectProvider('Facebook')}
      >
        <svg className="btn-social__icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="#1877F2" />
          <path
            fill="#FFFFFF"
            d="M13.6 19.8v-6.9h2.3l.4-2.7h-2.7V8.5c0-.8.2-1.3 1.3-1.3h1.5V4.8c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v1.7H8.1v2.7h2.4v6.9h3.1Z"
          />
        </svg>
        <span>Facebook</span>
      </button>
    </div>
  );
}
