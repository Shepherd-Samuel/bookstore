import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-10 md:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <Link to="/" className="mb-3 flex items-center gap-2">
              <img src="/logo.png" alt="Elite Bookstore" className="h-8 w-8 rounded-full object-cover" />
              <span className="font-display text-lg font-bold text-foreground">
                Elite <span className="text-primary">Bookstore</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your trusted source for inspirational and educational books.
              Empowering readers with timeless wisdom.
            </p>
          </div>

          <div>
            <h4 className="mb-3 font-display text-sm font-semibold text-foreground">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {[
                { to: "/shop", label: "Shop" },
                { to: "/about", label: "About Us" },
                { to: "/contact", label: "Contact" },
                { to: "/downloads", label: "Downloads" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-muted-foreground transition-colors hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-display text-sm font-semibold text-foreground">Categories</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Inspirational</li>
              <li>Educational</li>
              <li>Faith & Spirituality</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Elite Bookstore. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
