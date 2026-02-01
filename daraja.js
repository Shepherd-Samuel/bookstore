(function() {
    // This wrapper prevents global variable leakage
    document.addEventListener('DOMContentLoaded', function () {
        const _0x5f2 = 'pk_live_2796a492f9d07dd3d0399051ff4cd1521ed2a013'; // Your Public Key
        const confirmPayBtn = document.getElementById('confirmPay');

        if (confirmPayBtn) {
            confirmPayBtn.addEventListener('click', () => {
                const emailInput = document.getElementById("customerEmail").value.trim();
                const phoneInput = document.getElementById("customerPhone").value.trim();

                if (!emailInput || !emailInput.includes("@")) {
                    alert("Please enter a valid email.");
                    return;
                }
                if (phoneInput.length < 9) {
                    alert("Please enter a valid phone number.");
                    return;
                }

                const total = cart.reduce((acc, i) => acc + i.price * i.qty, 0);
                if (total <= 0) {
                    alert("Your cart is empty.");
                    return;
                }

                const bookNames = cart.map(item => item.title).join("_");
                const safeBookNames = bookNames.replace(/[^a-zA-Z0-9]/g, "_");
                const ref = safeBookNames + "_" + Date.now();

                const handler = PaystackPop.setup({
                    key: _0x5f2, // Reference the variable
                    email: emailInput,
                    amount: total * 100,
                    currency: 'KES',
                    ref: ref,
                    label: "Elite Bookstore",
                    metadata: { phone: phoneInput },
                    callback: function (response) {
                        const downloads = JSON.parse(localStorage.getItem("downloads")) || [];
                        cart.forEach(item => {
                            const fullBook = books.find(b => b.id === item.id);
                            if (fullBook && fullBook.pdf) {
                                downloads.push({
                                    id: fullBook.id,
                                    title: fullBook.title,
                                    author: fullBook.author,
                                    pdf: fullBook.pdf,
                                    img: fullBook.img
                                });
                            }
                        });

                        localStorage.setItem("downloads", JSON.stringify(downloads));
                        localStorage.removeItem("cart");
                        cart = [];
                        updateCartCount();
                        localStorage.setItem("downloadAccess", "true");

                        alert("Payment successful!");
                        window.location.href = "downloads.html";
                    },
                    onClose: function () {
                        alert('Payment was not completed.');
                    }
                });

                handler.openIframe();
            });
        }
    });
})();
