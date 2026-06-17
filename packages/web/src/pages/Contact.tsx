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
        <h1>Contact</h1>
        <p className="contact-success">
          Thank you for your message! I&apos;ll get back to you as soon as possible.
        </p>
      </div>
    );
  }

  return (
    <div className="page contact-page">
      <h1>Contact</h1>
      <form className="contact-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input type="text" id="name" name="name" required />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input type="email" id="email" name="email" required />
        </div>

        <div className="form-group">
          <label htmlFor="subject">Subject</label>
          <input type="text" id="subject" name="subject" required />
        </div>

        <div className="form-group">
          <label htmlFor="message">Message</label>
          <textarea id="message" name="message" rows={6} required />
        </div>

        <button type="submit" className="btn-submit">
          Send Message
        </button>
      </form>
    </div>
  );
}
