import { Link } from "react-router-dom";
import { Book } from "@/context/CartContext";
import { useCart } from "@/context/CartContext";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookCardProps {
  book: Book;
}

const BookCard = ({ book }: BookCardProps) => {
  const { addToCart } = useCart();

  return (
    <div className="group overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 card-shadow hover:card-shadow-hover hover:-translate-y-1">
      <Link to={`/book/${book.id}`}>
        <div className="aspect-[3/4] overflow-hidden bg-muted">
          <img
            src={book.img}
            alt={book.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
        </div>
      </Link>
      <div className="p-4">
        <Link to={`/book/${book.id}`}>
          <h3 className="font-display text-base font-semibold text-foreground line-clamp-1 hover:text-primary transition-colors">
            {book.title}
          </h3>
        </Link>
        <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-display text-lg font-bold text-primary">
            Ksh {book.price}
          </span>
          <Button
            size="sm"
            onClick={() => addToCart(book)}
            className="gap-1.5"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookCard;
