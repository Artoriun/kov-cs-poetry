import { type FormEvent, useState } from 'react';
import { useT } from '../i18n';
import { apiSendContact } from '../lib/api';

export default function Contact() {
  const t = useT();
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    const data = new FormData(e.currentTarget);
    setSending(true);
    setError(null);
    try {
      await apiSendContact({
        name: String(data.get('name') ?? ''),
        email: String(data.get('email') ?? ''),
        subject: String(data.get('subject') ?? ''),
        message: String(data.get('message') ?? ''),
        website: String(data.get('website') ?? ''),
      });
      setSubmitted(true);
    } catch (err) {
      const rateLimited = err instanceof Error && err.message === 'rate-limited';
      setError(rateLimited ? t.contact.tooMany : t.contact.error);
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="page contact-page">
        <h1>{t.contact.title}</h1>
        <p className="contact-success">{t.contact.success}</p>
      </div>
    );
  }

  return (
    <div className="page contact-page">
      <h1>{t.contact.title}</h1>
      <form className="contact-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">{t.contact.name}</label>
          <input type="text" id="name" name="name" maxLength={100} required />
        </div>

        <div className="form-group">
          <label htmlFor="email">{t.contact.email}</label>
          <input type="email" id="email" name="email" maxLength={200} required />
        </div>

        <div className="form-group">
          <label htmlFor="subject">{t.contact.subject}</label>
          <input type="text" id="subject" name="subject" maxLength={150} required />
        </div>

        <div className="form-group">
          <label htmlFor="message">{t.contact.message}</label>
          <textarea id="message" name="message" rows={6} maxLength={5000} required />
        </div>

        {/* Honeypot: hidden from people and from assistive tech, but a bot that fills every
            field trips it and the message is dropped server-side. */}
        <input
          type="text"
          name="website"
          className="contact-hp"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        {error && (
          <p className="contact-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn-submit" disabled={sending}>
          {sending ? t.contact.sending : t.contact.send}
        </button>
      </form>
    </div>
  );
}
