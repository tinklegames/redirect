let generatedLink = "";
let iframeAllowed = false;

async function checkCode() {
    const code = document.getElementById('codeInput').value.trim();
    const resultDiv = document.getElementById('result');
    const submitBtn = document.getElementById('submitBtn');
    const openPageBtn = document.getElementById('openPageBtn');
    const iframeHint = document.getElementById('iframeHint');

    try {
        const response = await fetch('https://raw.githubusercontent.com/tinklegames/redirect/main/codes.json');
        const data = await response.json();

        if (data[code]) {
            const parts = data[code].split('|');
            generatedLink = parts[0];
            iframeAllowed = parts[1] === 'true';

            document.getElementById('codeInput').value = generatedLink;
            resultDiv.innerHTML = "✅ Link generated successfully!";

            const newBtn = submitBtn.cloneNode(true); // clone the button to remove old events
            submitBtn.parentNode.replaceChild(newBtn, submitBtn);
            newBtn.innerHTML = "Copy Link";
            newBtn.addEventListener('click', () => copyLink(generatedLink));
            newBtn.style.backgroundColor = "#4CAF50";

            if (iframeAllowed) {
                openPageBtn.classList.remove("hidden");
                iframeHint.classList.add("hidden");
            } else {
                openPageBtn.classList.add("hidden");
                iframeHint.classList.remove("hidden");
                iframeHint.textContent = "⚠️ This site cannot open in an iframe. Copy and paste the link in your browser instead.";
            }

            showNotification("✅ Valid code! Link generated.", "success");
        } else {
            resultDiv.innerHTML = "❌ Invalid code. Try again.";
            showNotification("❌ Invalid code. Please try again.", "error");
            openPageBtn.classList.add("hidden");
            iframeHint.classList.add("hidden");
        }
    } catch (error) {
        console.error(error);
        resultDiv.innerHTML = "⚠️ Error fetching codes. Please try again later.";
        showNotification("⚠️ Error fetching codes. Try again later.", "error");
    }
}

// Copy link to clipboard
function copyLink(link) {
    navigator.clipboard.writeText(link).then(() => {
        showNotification("🔗 Link copied to clipboard!", "success");
    }).catch(err => {
        console.error("Error copying link:", err);
        showNotification("❌ Failed to copy link.", "error");
    });
}

function openPage() {
    if (!generatedLink || !iframeAllowed) return;

    const newTab = window.open("about:blank", "_blank");
    if (!newTab) {
        alert("Please allow pop-ups to open the site.");
        return;
    }

    newTab.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Game Viewer</title>
            <style>
                html, body {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    background-color: black;
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
            <iframe id="siteFrame" src="${generatedLink}" allowfullscreen></iframe>
            <script>
                const frame = document.getElementById("siteFrame");
                function resizeFrame() {
                    frame.style.width = window.innerWidth + "px";
                    frame.style.height = window.innerHeight + "px";
                }
                window.addEventListener("resize", resizeFrame);
                resizeFrame();
            </script>
        </body>
        </html>
    `);
    newTab.document.close();
}

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.innerHTML = message;
    notification.className = type;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

document.getElementById('submitBtn').addEventListener('click', checkCode);
document.getElementById('openPageBtn').addEventListener('click', openPage);

document.getElementById('openPageBtn').classList.add('hidden');
document.getElementById('iframeHint').classList.add('hidden');
