import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Book {
  id: number;
  title: string;
  author: string;
  price: number;
  img: string;
  pdf?: string;
  category?: string;
  description?: string;
}

export interface CartItem extends Book {
  qty: number;
}

interface CartContextType {
  cart: CartItem[];
  downloads: Book[];
  addToCart: (book: Book) => void;
  removeFromCart: (id: number) => void;
  updateQty: (id: number, qty: number) => void;
  clearCart: () => void;
  completePurchase: () => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("cart") || "[]");
    } catch {
      return [];
    }
  });

  const [downloads, setDownloads] = useState<Book[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("downloads") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("downloads", JSON.stringify(downloads));
  }, [downloads]);

  const addToCart = (book: Book) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === book.id);
      if (existing) {
        return prev.map((i) => (i.id === book.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...book, qty: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQty = (id: number, qty: number) => {
    if (qty < 1) return removeFromCart(id);
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  };

  const clearCart = () => setCart([]);

  const completePurchase = () => {
    const newDownloads = cart
      .filter((item) => item.pdf)
      .map(({ id, title, author, pdf, img }) => ({ id, title, author, price: 0, pdf, img }));

    setDownloads((prev) => [...prev, ...newDownloads]);
    clearCart();
  };

  const cartCount = cart.reduce((acc, i) => acc + i.qty, 0);
  const cartTotal = cart.reduce((acc, i) => acc + i.price * i.qty, 0);

  return (
    <CartContext.Provider
      value={{ cart, downloads, addToCart, removeFromCart, updateQty, clearCart, completePurchase, cartCount, cartTotal }}
    >
      {children}
    </CartContext.Provider>
  );
};
