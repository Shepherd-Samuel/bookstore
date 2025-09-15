document.addEventListener('DOMContentLoaded', function () {
    const confirmPayBtn = document.getElementById('confirmPay');
  
    if (confirmPayBtn) {
      confirmPayBtn.addEventListener('click', () => {
        const emailInput = document.getElementById("customerEmail").value.trim();
        if (!emailInput || !emailInput.includes("@")) {
          alert("Please enter a valid email.");
          return;
        }
  
        const total = cart.reduce((acc, i) => acc + i.price * i.qty, 0);
        if (total <= 0) {
          alert("Your cart is empty.");
          return;
        }
  
        // Generate reference using book names
        const bookNames = cart.map(item => item.title).join("_");
        const safeBookNames = bookNames.replace(/[^a-zA-Z0-9]/g, "_");
        const ref = safeBookNames + "_" + Date.now();
  
        const handler = PaystackPop.setup({
          key: 'pk_live_2796a492f9d07dd3d0399051ff4cd1521ed2a013',
          email: emailInput,
          amount: total * 100, // amount in kobo
          currency: 'KES',
          ref: ref,
          label: "Elite Bookstore",
          callback: function (response) {
            // ✅ Save purchased books into downloads
            const downloads = JSON.parse(localStorage.getItem("downloads")) || [];
  
            cart.forEach(item => {
              const fullBook = books.find(b => b.id === item.id);
              if (fullBook && fullBook.pdf) {
                downloads.push({
                  id: fullBook.id,
                  title: fullBook.title,
                  author: fullBook.author,
                  pdf: fullBook.pdf,
                  img: fullBook.img // ✅ include book image
                });
              }
            });
  
            // Save downloads & clear cart
            localStorage.setItem("downloads", JSON.stringify(downloads));
            localStorage.removeItem("cart");
            cart = [];
            updateCartCount();
  
            // Mark session as having access
            localStorage.setItem("downloadAccess", "true");
  
            // ✅ Redirect to downloads page
            alert("Payment successful! You can now download your books.");
            window.location.href = "downloads.html";
          },
          onClose: function () {
            alert('Payment was not completed. You can try again.');
          }
        });
  
        handler.openIframe();
      });
    }
  });
  