import { useCart } from "@/context/CartContext";
import { Download, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Downloads = () => {
  const { downloads } = useCart();

  if (downloads.length === 0) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center px-4 py-20 text-center">
        <Download className="h-16 w-16 text-muted-foreground/40" />
        <h1 className="mt-4 font-display text-2xl font-bold text-foreground">No downloads yet</h1>
        <p className="mt-2 text-muted-foreground">
          Purchase books from our shop to access your downloads here.
        </p>
        <Link to="/shop">
          <Button className="mt-6">Browse Books</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-bold text-foreground">Your Downloads</h1>
      <p className="mt-2 text-muted-foreground">Access your purchased books below.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {downloads.map((book, i) => (
          <div
            key={`${book.id}-${i}`}
            className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
          >
            <img
              src={book.img}
              alt={book.title}
              className="h-20 w-16 rounded object-cover bg-muted"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-sm font-semibold text-foreground truncate">{book.title}</h3>
              <p className="text-xs text-muted-foreground">{book.author}</p>
              {book.pdf && (
                <a
                  href={book.pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <BookOpen className="h-3 w-3" />
                  Open PDF
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Downloads;
