import { useState, type FormEvent } from 'react';
import { useT } from '../i18n';

export default function Contact() {
  const t = useT();
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="page contact-page">
        <h1>{t.contact.title}</h1>
        <p className="contact-success">
          {t.contact.success}
        </p>
      </div>
    );
  }

  return (
    <div className="page contact-page">
      <h1>{t.contact.title}</h1>
      <form className="contact-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">{t.contact.name}</label>
          <input type="text" id="name" name="name" required />
        </div>

        <div className="form-group">
          <label htmlFor="email">{t.contact.email}</label>
          <input type="email" id="email" name="email" required />
        </div>

        <div className="form-group">
          <label htmlFor="subject">{t.contact.subject}</label>
          <input type="text" id="subject" name="subject" required />
        </div>

        <div className="form-group">
          <label htmlFor="message">{t.contact.message}</label>
          <textarea id="message" name="message" rows={6} required />
        </div>

        <button type="submit" className="btn-submit">
          {t.contact.send}
        </button>
      </form>
    </div>
  );
}
