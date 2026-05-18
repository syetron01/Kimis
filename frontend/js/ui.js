/**
 * KiMiS Custom UI Utilities
 * Replaces browser alerts, confirms, and prompts.
 */

const KiMiSUI = {
    // ── Toast Notifications ──────────────────────────
    toast(message, type = 'info', duration = 4000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error')   icon = '❌';

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">${message}</div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-fade-out');
            toast.addEventListener('animationend', () => toast.remove());
        }, duration);
    },

    // ── Modal Dialogs ────────────────────────────────
    confirm(title, body, confirmText = 'Confirm', cancelText = 'Cancel') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            
            overlay.innerHTML = `
                <div class="modal-card">
                    <div class="modal-header">
                        <div class="modal-title">${title}</div>
                    </div>
                    <div class="modal-body">${body}</div>
                    <div class="modal-footer">
                        <button class="btn btn-ghost" id="modal-cancel">${cancelText}</button>
                        <button class="btn btn-primary" id="modal-confirm">${confirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            setTimeout(() => overlay.classList.add('active'), 10);

            const close = (val) => {
                overlay.classList.remove('active');
                setTimeout(() => {
                    overlay.remove();
                    resolve(val);
                }, 200);
            };

            overlay.querySelector('#modal-cancel').onclick = () => close(false);
            overlay.querySelector('#modal-confirm').onclick = () => close(true);
            overlay.onclick = (e) => { if (e.target === overlay) close(false); };
        });
    },

    prompt(title, body, placeholder = '', confirmText = 'Confirm', cancelText = 'Cancel') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            
            overlay.innerHTML = `
                <div class="modal-card">
                    <div class="modal-header">
                        <div class="modal-title">${title}</div>
                    </div>
                    <div class="modal-body">
                        ${body}
                        <input type="text" class="form-input modal-input" id="modal-input-field" placeholder="${placeholder}">
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-ghost" id="modal-cancel">${cancelText}</button>
                        <button class="btn btn-primary" id="modal-confirm">${confirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            const input = overlay.querySelector('#modal-input-field');
            setTimeout(() => {
                overlay.classList.add('active');
                input.focus();
            }, 10);

            const close = (val) => {
                overlay.classList.remove('active');
                setTimeout(() => {
                    overlay.remove();
                    resolve(val);
                }, 200);
            };

            overlay.querySelector('#modal-cancel').onclick = () => close(null);
            overlay.querySelector('#modal-confirm').onclick = () => close(input.value);
            input.onkeydown = (e) => { if (e.key === 'Enter') close(input.value); if (e.key === 'Escape') close(null); };
            overlay.onclick = (e) => { if (e.target === overlay) close(null); };
        });
    },

    alert(title, body, btnText = 'OK') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            
            overlay.innerHTML = `
                <div class="modal-card">
                    <div class="modal-header">
                        <div class="modal-title">${title}</div>
                    </div>
                    <div class="modal-body">${body}</div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" id="modal-ok">${btnText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            setTimeout(() => overlay.classList.add('active'), 10);

            const close = () => {
                overlay.classList.remove('active');
                setTimeout(() => {
                    overlay.remove();
                    resolve();
                }, 200);
            };

            overlay.querySelector('#modal-ok').onclick = () => close();
            overlay.onclick = (e) => { if (e.target === overlay) close(); };
        });
    }
};

// Global shortcuts
window.showToast = KiMiSUI.toast;
window.showConfirm = KiMiSUI.confirm;
window.showPrompt = KiMiSUI.prompt;
window.showAlert = KiMiSUI.alert;
