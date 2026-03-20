import { BookOpen, Users, Truck } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Wide Collection",
    description: "A carefully curated library of inspirational, educational, and spiritual books.",
  },
  {
    icon: Users,
    title: "Trusted Community",
    description: "Building a family of readers who seek wisdom, purpose, and transformation.",
  },
  {
    icon: Truck,
    title: "Fast Delivery",
    description: "Bringing your favorite books to your doorstep quickly and reliably.",
  },
];

const About = () => {
  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      {/* Header */}
      <div className="mx-auto max-w-3xl text-center">
        <img src="/logo.png" alt="Elite Bookstore" className="mx-auto h-24 w-24 rounded-full object-cover" />
        <h1 className="mt-4 font-display text-3xl font-bold text-foreground md:text-4xl">
          About Elite Bookstore
        </h1>
        <p className="mt-2 text-sm font-medium text-primary">
          Inspiring Minds • Nurturing Faith • Empowering Generations
        </p>
      </div>

      {/* Our Story */}
      <div className="mx-auto mt-10 max-w-2xl space-y-4 text-muted-foreground leading-relaxed">
        <h2 className="font-display text-xl font-semibold text-foreground">Our Story</h2>
        <p>
          Welcome to <strong className="text-foreground">Elite Bookstore</strong>, your trusted source for
          inspirational and educational books. Our mission is to provide timeless knowledge and uplifting
          content that guides, inspires, and transforms lives.
        </p>
        <p>
          We specialize in faith-based literature, motivational writings, and modern classics that help you
          grow in purpose, wisdom, and character.
        </p>
        <p>
          Our vision is to empower readers by making quality books accessible at affordable prices.
        </p>
      </div>

      {/* Meet the Author */}
      <div className="mx-auto mt-16 max-w-3xl">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-col items-center gap-6 p-8 md:flex-row md:items-start">
            <img
              src="/assets/samuel-mutava.png"
              alt="Samuel Mutava"
              className="h-48 w-40 rounded-lg object-cover object-top shadow-md"
            />
            <div className="text-center md:text-left">
              <h2 className="font-display text-2xl font-bold text-foreground">Samuel Mutava</h2>
              <p className="mt-1 text-sm font-medium text-primary">Author & Founder</p>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Samuel Mutava is a passionate author, educator, and visionary committed to transforming lives
                through the written word. With a deep conviction in the power of knowledge and faith, he has
                authored multiple books spanning inspiration, education, spirituality, and modern technology.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                His writings challenge readers to think beyond limitations, pursue purpose, and live with
                integrity. Through Elite Bookstore, Samuel brings his mission to life — making impactful
                literature accessible and affordable to everyone.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-lg border border-border bg-card p-6 text-center transition-all hover:card-shadow-hover"
          >
            <f.icon className="mx-auto h-10 w-10 text-primary" />
            <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default About;
