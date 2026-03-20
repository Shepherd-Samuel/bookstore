import { useParams, Link } from "react-router-dom";
import { books } from "@/data/books";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowLeft, Star, BookOpen } from "lucide-react";
import BookCard from "@/components/BookCard";

const reviews = [
  { name: "Grace W.", rating: 5, text: "Life-changing read! I couldn't put it down." },
  { name: "John K.", rating: 4, text: "Very insightful and well-written. Highly recommend." },
  { name: "Mercy A.", rating: 5, text: "This book spoke to my soul. A must-read for everyone." },
];

const BookDetail = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const book = books.find((b) => b.id === Number(id));

  if (!book) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center px-4 py-20 text-center">
        <BookOpen className="h-16 w-16 text-muted-foreground/40" />
        <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Book not found</h1>
        <Link to="/shop">
          <Button className="mt-6">Back to Shop</Button>
        </Link>
      </div>
    );
  }

  const related = books
    .filter((b) => b.id !== book.id && b.category === book.category)
    .slice(0, 4);

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <Link
        to="/shop"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Shop
      </Link>

      {/* Book Info */}
      <div className="mt-4 grid gap-10 md:grid-cols-[300px_1fr]">
        <div className="aspect-[3/4] overflow-hidden rounded-xl border border-border bg-muted">
          <img
            src={book.img}
            alt={book.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
        </div>

        <div className="flex flex-col justify-center">
          {book.category && (
            <span className="mb-2 inline-block w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {book.category}
            </span>
          )}
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            {book.title}
          </h1>
          <p className="mt-1 text-muted-foreground">by {book.author}</p>

          <p className="mt-6 leading-relaxed text-muted-foreground">
            {book.description || "No description available for this book yet."}
          </p>

          <div className="mt-8 flex items-center gap-6">
            <span className="font-display text-3xl font-bold text-primary">
              Ksh {book.price}
            </span>
            <Button
              size="lg"
              className="gap-2"
              onClick={() => addToCart(book)}
            >
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </Button>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-foreground">Reader Reviews</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {reviews.map((review, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-border bg-card p-5"
            >
              <div className="flex items-center gap-1">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
                {Array.from({ length: 5 - review.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-muted-foreground/30" />
                ))}
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                "{review.text}"
              </p>
              <p className="mt-3 text-xs font-semibold text-foreground">{review.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related Books */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-foreground">
            More in {book.category}
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {related.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default BookDetail;
