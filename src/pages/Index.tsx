import { Link } from "react-router-dom";
import { BookOpen, GraduationCap, Heart, ArrowRight } from "lucide-react";
import { books } from "@/data/books";
import BookCard from "@/components/BookCard";
import { Button } from "@/components/ui/button";

const categories = [
  {
    icon: Heart,
    title: "Inspirational",
    description: "Books that uplift, motivate, and inspire positive change.",
  },
  {
    icon: GraduationCap,
    title: "Educational",
    description: "Expand your knowledge with timeless educational classics.",
  },
  {
    icon: BookOpen,
    title: "Faith & Spirituality",
    description: "Grow spiritually with faith-based books and devotionals.",
  },
];

const Index = () => {
  const featured = books.slice(0, 4);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden hero-gradient px-4 py-20 md:py-28">
        <div className="warm-overlay absolute inset-0" />
        <div className="container relative z-10 mx-auto text-center">
          <h1 className="font-display text-4xl font-bold text-primary-foreground md:text-5xl lg:text-6xl animate-fade-in">
            Discover Your Next
            <br />
            Favorite Book
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80 animate-fade-in [animation-delay:150ms]">
            Explore inspiring stories, powerful lessons, and timeless wisdom.
          </p>
          <Link to="/shop">
            <Button size="lg" variant="secondary" className="mt-8 gap-2 animate-fade-in [animation-delay:300ms]">
              Shop Now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Featured Books */}
      <section className="container mx-auto px-4 py-16 md:px-6">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold text-foreground">Featured Books</h2>
          <p className="mt-2 text-muted-foreground">Hand-picked reads for your journey</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link to="/shop">
            <Button variant="outline" className="gap-2">
              View All Books
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-secondary/50 px-4 py-16">
        <div className="container mx-auto">
          <h2 className="mb-10 text-center font-display text-3xl font-bold text-foreground">
            Explore Categories
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {categories.map((cat) => (
              <div
                key={cat.title}
                className="rounded-lg border border-border bg-card p-6 text-center transition-all hover:card-shadow-hover hover:-translate-y-1"
              >
                <cat.icon className="mx-auto h-10 w-10 text-primary" />
                <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{cat.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{cat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
