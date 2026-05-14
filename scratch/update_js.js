const fs = require('fs');

let content = fs.readFileSync('frontend/js/workspaces.js', 'utf8');

const target = `            e.preventDefault();
            const token = getToken();
            const name = document.getElementById("newWsName").value;
            const description = document.getElementById("newWsDesc").value;

            try {
                const res = await fetch(\`\${API_BASE}/workspaces\`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": \`Bearer \${token}\`
                    },
                    body: JSON.stringify({ name, description })
                });

                if (res.ok) {
                    document.getElementById("newWsName").value = '';
                    document.getElementById("newWsDesc").value = '';
                    await loadWorkspaces();
                } else {
                    const data = await res.json();`;

const replacement = `            e.preventDefault();
            const token = getToken();
            const name = document.getElementById("newWsName").value;
            const description = document.getElementById("newWsDesc").value;
            const fileInput = document.getElementById("newWsProfile");

            const formData = new FormData();
            formData.append("name", name);
            formData.append("description", description);
            if (fileInput && fileInput.files.length > 0) {
                formData.append("profile_image", fileInput.files[0]);
            }

            try {
                const res = await fetch(\`\${API_BASE}/workspaces\`, {
                    method: "POST",
                    headers: {
                        "Authorization": \`Bearer \${token}\`
                    },
                    body: formData
                });

                if (res.ok) {
                    document.getElementById("newWsName").value = '';
                    document.getElementById("newWsDesc").value = '';
                    if (fileInput) fileInput.value = '';
                    await loadWorkspaces();
                } else {
                    const data = await res.json();`;

content = content.replace(target, replacement);
// also try replacing with \r\n just in case
content = content.replace(target.replace(/\n/g, '\r\n'), replacement);

fs.writeFileSync('frontend/js/workspaces.js', content, 'utf8');
