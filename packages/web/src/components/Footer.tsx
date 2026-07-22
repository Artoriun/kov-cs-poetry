import { useT } from '../i18n';

export default function Footer() {
  const t = useT();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p>{t.footer.copyright}</p>
        <a href="#top" className="back-to-top">{t.footer.backToTop}</a>
      </div>
    </footer>
  );
}
