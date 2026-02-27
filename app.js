let generatedLink = "";
let iframeAllowed = false;

async function checkCode() {
    const code = document.getElementById('codeInput').value.trim();
    const resultDiv = document.getElementById('result');
    const submitBtn = document.getElementById('submitBtn');
    const actionBtn = document.getElementById('actionBtn');
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

            // Reset submit button to original state
            const newSubmitBtn = submitBtn.cloneNode(true);
            submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
            newSubmitBtn.innerHTML = "Submit";
            newSubmitBtn.style.backgroundColor = "";
            newSubmitBtn.addEventListener('click', checkCode);

            // Configure the action button based on iframe allowed
            if (iframeAllowed) {
                actionBtn.innerHTML = "Open Page";
                actionBtn.style.backgroundColor = "#4CAF50";
                actionBtn.onclick = openPage;
                actionBtn.classList.remove("hidden");
                iframeHint.classList.add("hidden");
            } else {
                actionBtn.innerHTML = "Copy Link";
                actionBtn.style.backgroundColor = "#4CAF50";
                actionBtn.onclick = () => copyLink(generatedLink);
                actionBtn.classList.remove("hidden");
                iframeHint.classList.remove("hidden");
                iframeHint.textContent = "⚠️ This site cannot open in an iframe. Copy the link instead.";
            }

            showNotification("✅ Valid code! Link generated.", "success");
        } else {
            resultDiv.innerHTML = "❌ Invalid code. Try again.";
            showNotification("❌ Invalid code. Please try again.", "error");
            actionBtn.classList.add("hidden");
            iframeHint.classList.add("hidden");
        }
    } catch (error) {
        console.error(error);
        resultDiv.innerHTML = "⚠️ Error fetching codes. Please try again later.";
        showNotification("⚠️ Error fetching codes. Try again later.", "error");
    }
}

// Reset the UI to allow entering a new code
function resetForNewCode() {
    const submitBtn = document.getElementById('submitBtn');
    const actionBtn = document.getElementById('actionBtn');
    const iframeHint = document.getElementById('iframeHint');
    const resultDiv = document.getElementById('result');
    
    // Reset button to original "Submit" state
    const newBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newBtn, submitBtn);
    newBtn.innerHTML = "Submit";
    newBtn.style.backgroundColor = ""; // Reset to default
    newBtn.addEventListener('click', checkCode);
    
    // Hide action button and iframe hint
    actionBtn.classList.add("hidden");
    iframeHint.classList.add("hidden");
    
    // Clear result message
    resultDiv.innerHTML = "";
    
    // Reset variables
    generatedLink = "";
    iframeAllowed = false;
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
        <script src="https://cdn.jsdelivr.net/npm/whatareyoutryingtodo/disable-devtool.min.js" disable-devtool-auto=""></script>
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

// Add input event listener to detect typing in the code input
document.getElementById('codeInput').addEventListener('input', function() {
    resetForNewCode();
});

// Initialize
document.getElementById('submitBtn').addEventListener('click', checkCode);
document.getElementById('actionBtn').classList.add('hidden');
document.getElementById('iframeHint').classList.add('hidden');
