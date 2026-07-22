import { useState, type FormEvent } from 'react';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="page contact-page">
        <h1>Kapcsolat</h1>
        <p className="contact-success">
          Köszönöm az üzenetét! Amint lehet, válaszolok Önnek.
        </p>
      </div>
    );
  }

  return (
    <div className="page contact-page">
      <h1>Kapcsolat</h1>
      <form className="contact-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Név</label>
          <input type="text" id="name" name="name" required />
        </div>

        <div className="form-group">
          <label htmlFor="email">E-mail</label>
          <input type="email" id="email" name="email" required />
        </div>

        <div className="form-group">
          <label htmlFor="subject">Tárgy</label>
          <input type="text" id="subject" name="subject" required />
        </div>

        <div className="form-group">
          <label htmlFor="message">Üzenet</label>
          <textarea id="message" name="message" rows={6} required />
        </div>

        <button type="submit" className="btn-submit">
          Üzenet küldése
        </button>
      </form>
    </div>
  );
}
