import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Trash2, ShoppingBag, CreditCard } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const PAYSTACK_PUBLIC_KEY = "pk_live_2796a492f9d07dd3d0399051ff4cd1521ed2a013";

const Cart = () => {
  const { cart, cartTotal, updateQty, removeFromCart, completePurchase } = useCart();
  const navigate = useNavigate();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);

  const handlePayWithPaystack = () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email.");
      return;
    }
    if (phone.length < 9) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    if (cartTotal <= 0) {
      toast.error("Your cart is empty.");
      return;
    }

    setPaying(true);

    const bookNames = cart.map((item) => item.title).join("_");
    const safeBookNames = bookNames.replace(/[^a-zA-Z0-9]/g, "_");
    const ref = safeBookNames + "_" + Date.now();

    // @ts-ignore - PaystackPop is loaded via script
    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email,
      amount: cartTotal * 100,
      currency: "KES",
      ref,
      label: "Elite Bookstore",
      metadata: { phone },
      callback: () => {
        completePurchase();
        setPaying(false);
        setCheckoutOpen(false);
        toast.success("Payment successful! Redirecting to downloads...");
        navigate("/downloads");
      },
      onClose: () => {
        setPaying(false);
        toast.error("Payment was not completed.");
      },
    });

    handler.openIframe();
  };

  if (cart.length === 0) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center px-4 py-20 text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/40" />
        <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Browse our collection and add some books!</p>
        <Link to="/shop">
          <Button className="mt-6">Go to Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-bold text-foreground">Your Shopping Cart</h1>

      <div className="mt-8 space-y-4">
        {cart.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
          >
            <img
              src={item.img}
              alt={item.title}
              className="h-20 w-16 rounded object-cover bg-muted"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-sm font-semibold text-foreground truncate">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.author}</p>
              <p className="mt-1 text-sm font-bold text-primary">Ksh {item.price}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQty(item.id, item.qty - 1)}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-6 text-center text-sm font-medium text-foreground">{item.qty}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQty(item.id, item.qty + 1)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between rounded-lg border border-border bg-card p-6">
        <div>
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="font-display text-2xl font-bold text-foreground">Ksh {cartTotal}</p>
        </div>
        <Button size="lg" className="gap-2" onClick={() => setCheckoutOpen(true)}>
          <CreditCard className="h-4 w-4" />
          Pay Now
        </Button>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Checkout</DialogTitle>
            <DialogDescription>
              Enter your details to complete payment of <strong>Ksh {cartTotal}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="checkout-email">Email</Label>
              <Input
                id="checkout-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout-phone">Phone Number</Label>
              <Input
                id="checkout-phone"
                type="tel"
                placeholder="0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handlePayWithPaystack}
              disabled={paying}
            >
              <CreditCard className="h-4 w-4" />
              {paying ? "Processing..." : `Pay Ksh ${cartTotal}`}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Secured by Paystack • M-Pesa & Card accepted
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cart;
