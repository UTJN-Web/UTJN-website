'use client';

export default function LoginButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event('open-login-modal'))}
      className="text-lg font-semibold hover:text-[#1c2a52]"
    >
      Login
    </button>
  );
}
