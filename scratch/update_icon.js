const fs = require('fs');

let content = fs.readFileSync('frontend/js/workspaces.js', 'utf8');

const target = `                const roleClass = {
                    'Owner': 'badge-owner', 'Admin': 'badge-admin',
                    'Editor': 'badge-editor', 'Viewer': 'badge-viewer'
                }[ws.user_role] || 'badge-viewer';

                return \`
                    <div class="workspace-card" data-id="\${ws.id}" data-role="\${ws.user_role}" data-name="\${ws.name}" style="flex-wrap: wrap;">
                        <div class="workspace-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="6" height="6" rx="1"/><rect x="16" y="3" width="6" height="6" rx="1"/><rect x="9" y="3" width="6" height="6" rx="1"/><rect x="2" y="11" width="6" height="10" rx="1"/><rect x="9" y="11" width="13" height="10" rx="1"/></svg>
                        </div>`;

const replacement = `                const roleClass = {
                    'Owner': 'badge-owner', 'Admin': 'badge-admin',
                    'Editor': 'badge-editor', 'Viewer': 'badge-viewer'
                }[ws.user_role] || 'badge-viewer';

                let iconHtml = '';
                if (ws.profile_image) {
                    iconHtml = \`<img src="\${ws.profile_image}" alt="\${ws.name}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">\`;
                } else {
                    const hueRotate = (ws.id % 10) * 36;
                    iconHtml = \`<img src="img/kimisLogo.png" alt="Logo" style="width:24px;height:24px;object-fit:contain;filter: hue-rotate(\${hueRotate}deg);">\`;
                }

                return \`
                    <div class="workspace-card" data-id="\${ws.id}" data-role="\${ws.user_role}" data-name="\${ws.name}" style="flex-wrap: wrap;">
                        <div class="workspace-icon" style="overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--bg-surface);">
                            \${iconHtml}
                        </div>`;

content = content.replace(target, replacement);
content = content.replace(target.replace(/\n/g, '\r\n'), replacement);

fs.writeFileSync('frontend/js/workspaces.js', content, 'utf8');
