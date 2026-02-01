// Local book data (images + prices stay here, pdfs will be merged from books.json)
let books = [
  { id: 1, title: "The Narrow Gate", author: "Samuel Mutava", price: 110, img: "assets/narrow gate.png" },
  { id: 2, title: "Potential and Purpose", author: "Samuel Mutava", price: 150, img: "assets/potential&purpose.jpg" },
  { id: 3, title: "If It's Not Right, It's Not Righteous", author: "Samuel Mutava", price: 100, img: "assets/not_right.jpg" },
  { id: 4, title: "Beyond", author: "Samuel Mutava", price: 200, img: "assets/beyond.jpg" },
  { id: 5, title: "A Way Out", author: "Samuel Mutava", price: 100, img: "assets/way_out.jpg" },
  { id: 6, title: "Beyond The Grade", author: "Samuel Mutava", price: 50, img: "assets/beyond.png" }
  { id: 7, title: "AI in Coding", author: "Samuel Mutava", price: 100, img: "assets/coding.jpeg" }
];

// Cart from localStorage
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Fetch PDFs from books.json and merge into books array
fetch("books.json")
  .then(res => res.json())
  .then(data => {
    data.forEach(b => {
      const book = books.find(localBook => localBook.id === b.id);
      if (book) {
        book.pdf = b.pdf; // merge pdf into our book object
      }
    });

    // After merging PDFs, render books
    renderBooks();
  })
  .catch(err => console.error("Error loading books.json:", err));

// Render featured books
function renderBooks() {
  const featuredContainer = document.getElementById("featured-books");
  if (!featuredContainer) return;

  featuredContainer.innerHTML = books.map(book => `
    <div class="book">
      <img src="${book.img}" alt="${book.title}">
      <h3>${book.title}</h3>
      <p>${book.author}</p>
      <p>Ksh ${book.price}</p>
      <button onclick="addToCart(${book.id})">Add to Cart</button>
      ${book.pdf ? `<a href="${book.pdf}" target="_blank" class="btn btn-sm btn-secondary mt-2">Preview PDF</a>` : ""}
    </div>
  `).join("");
}

// Add to cart
function addToCart(id) {
  const book = books.find(b => b.id === id);
  if (!book) return;

  const item = cart.find(i => i.id === id);

  if (item) {
    item.qty++;
  } else {
    cart.push({ ...book, qty: 1 });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
}

// Update cart count
function updateCartCount() {
  const count = cart.reduce((acc, item) => acc + item.qty, 0);
  const cartCountEl = document.getElementById("cart-count");
  if (cartCountEl) cartCountEl.textContent = count;
}

// ✅ Complete purchase: move items from cart to downloads
function completePurchase() {
  const downloads = JSON.parse(localStorage.getItem("downloads")) || [];

  cart.forEach(item => {
    if (item.pdf) {
      downloads.push({
        title: item.title,
        author: item.author,
        pdf: item.pdf,
        img: item.img  // ✅ now we save the book cover too
      });
    }
  });

  localStorage.setItem("downloads", JSON.stringify(downloads));
  localStorage.removeItem("cart"); // clear cart after purchase
  updateCartCount();

  // redirect back to shop
  window.location.href = "shop.html";
}

// Initialize
updateCartCount();



