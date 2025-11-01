let generatedLink = ""; // store the generated link

async function checkCode() {
    const code = document.getElementById('codeInput').value.trim();
    const resultDiv = document.getElementById('result');
    const submitBtn = document.getElementById('submitBtn');
    const openPageBtn = document.getElementById('openPageBtn');

    try {
        const response = await fetch('https://raw.githubusercontent.com/tinklegames/redirect/main/codes.json');
        const data = await response.json();

        if (data[code]) {
            generatedLink = data[code];
            document.getElementById('codeInput').value = generatedLink;
            resultDiv.innerHTML = "✅ Link generated successfully!";

            // Change Submit → Copy Link
            submitBtn.innerHTML = "Copy Link";
            submitBtn.onclick = () => copyLink(generatedLink);
            submitBtn.style.backgroundColor = "#4CAF50";

            // Show Open Page button
            openPageBtn.classList.remove("hidden");

            showNotification("✅ Valid code! Link generated.", "success");
        } else {
            resultDiv.innerHTML = "❌ Invalid code. Try again.";
            showNotification("❌ Invalid code. Please try again.", "error");

            // Hide Open Page button if invalid
            openPageBtn.classList.add("hidden");
        }
    } catch (error) {
        resultDiv.innerHTML = "⚠️ Error fetching codes. Please try again later.";
        showNotification("⚠️ Error fetching codes. Try again later.", "error");
    }
}

function copyLink(link) {
    navigator.clipboard.writeText(link).then(() => {
        showNotification("🔗 Link copied to clipboard!", "success");
    }).catch(err => {
        console.error("Error copying link:", err);
    });
}

function openPage() {
    if (generatedLink) {
        const newTab = window.open("about:blank", "_blank");
        newTab.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    html, body {
                        margin: 0;
                        padding: 0;
                        height: 100%;
                        width: 100%;
                        overflow: hidden;
                    }
                    iframe {
                        border: none;
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                    }
                </style>
            </head>
            <body>
                <iframe id="siteFrame" src="${generatedLink}"></iframe>
                <script>
                    // Ensure iframe resizes with window
                    const frame = document.getElementById("siteFrame");
                    function resizeFrame() {
                        frame.style.width = window.innerWidth + "px";
                        frame.style.height = window.innerHeight + "px";
                    }
                    window.addEventListener("resize", resizeFrame);
                    resizeFrame(); // run once on load
                </script>
            </body>
            </html>
        `);
        newTab.document.close();
    }
}

// Show notifications
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.innerHTML = message;
    notification.className = type;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}
