/**
 * workflow-canvas.js — FigJam-style floating canvas renderer
 * Handles: node cards, SVG bezier edges, pan, zoom, node drag.
 */

const WF_NODE_W = 210;   // fixed node card width
const WF_NODE_H = 82;    // fixed node card height (for edge anchor calc)
const WF_CVS_W  = 4000;
const WF_CVS_H  = 3000;

// Canvas state
let _wfNodes  = [];
let _wfEdges  = [];
let _wfScale  = 1;
let _wfTx     = 0;
let _wfTy     = 0;

// ── Entry point called by openWorkflow() ─────────────────
function renderWorkflowCanvas(nodes, edges) {
    _wfNodes = nodes.map(n => ({ ...n }));
    _wfEdges = edges;

    const container = document.getElementById('wfCanvasContainer');
    container.innerHTML = `
        <div class="wf-toolbar">
            <span class="wf-toolbar-info" id="wfInfo">
                ${nodes.length} node${nodes.length !== 1 ? 's' : ''}
                &nbsp;·&nbsp;
                ${edges.length} connection${edges.length !== 1 ? 's' : ''}
            </span>
            <div class="wf-toolbar-controls">
                <button class="wf-tool-btn" id="wfZoomOutBtn" aria-label="Zoom out" title="Zoom out">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                </button>
                <span class="wf-zoom-label" id="wfZoomLabel">100%</span>
                <button class="wf-tool-btn" id="wfZoomInBtn" aria-label="Zoom in" title="Zoom in">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                </button>
                <button class="wf-tool-btn" id="wfFitBtn" aria-label="Fit to screen" title="Fit to screen">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                </button>
            </div>
        </div>
        <div class="wf-canvas-viewport" id="wfViewport">
            <div class="wf-canvas-layer" id="wfLayer">
                <svg class="wf-svg" id="wfSvg"
                     xmlns="http://www.w3.org/2000/svg"
                     width="${WF_CVS_W}" height="${WF_CVS_H}">
                    <defs>
                        <pattern id="wfDotGrid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                            <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.06)"/>
                        </pattern>
                        <marker id="wfArrow" markerWidth="8" markerHeight="8"
                                refX="7" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L8,3 z" fill="rgba(255,255,255,0.3)"/>
                        </marker>
                    </defs>
                    <rect width="${WF_CVS_W}" height="${WF_CVS_H}" fill="url(#wfDotGrid)"/>
                </svg>
            </div>
        </div>`;

    // Render node cards into the layer
    const layer = document.getElementById('wfLayer');
    _wfNodes.forEach(n => layer.appendChild(_createNodeEl(n)));

    // Initial transform — centre around the nodes
    _wfFitNodes();

    // Draw SVG edges
    _wfDrawEdges();

    // Wire up events
    _setupViewportEvents();
    document.getElementById('wfZoomInBtn').addEventListener('click',  () => _wfZoom(0.15));
    document.getElementById('wfZoomOutBtn').addEventListener('click', () => _wfZoom(-0.15));
    document.getElementById('wfFitBtn').addEventListener('click', _wfFitNodes);
}

// ── Node element factory ─────────────────────────────────
function _createNodeEl(n) {
    const cfg = NODE_CONFIG[n.type] || NODE_CONFIG.note;
    const canDel = currentUserRole !== 'Viewer' && n.type !== 'start';

    const el = document.createElement('div');
    el.className = `wf-node wf-node-${n.type}`;
    el.id = `wfNode-${n.id}`;
    el.style.left = (n.position_x || 120) + 'px';
    el.style.top  = (n.position_y || 120) + 'px';

    el.innerHTML = `
        <div class="wf-node-topbar">
            <span class="wf-node-type-label" style="color:${cfg.color};">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="2.5"
                     stroke-linecap="round" stroke-linejoin="round">${cfg.icon}</svg>
                ${cfg.label}
            </span>
            ${canDel ? `<button class="wf-node-del-btn" onclick="event.stopPropagation();deleteNode(${n.id})" aria-label="Delete node">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>` : ''}
        </div>
        <div class="wf-node-title">${n.title}</div>
        ${n.description ? `<div class="wf-node-desc">${n.description}</div>` : ''}
        ${n.linked_article_id ? `<div class="wf-node-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            ${n.article_title}
        </div>` : ''}`;

    // Drag to reposition
    el.addEventListener('mousedown', e => {
        if (e.target.closest('.wf-node-del-btn')) return;
        e.stopPropagation();
        _startNodeDrag(e, n, el);
    });

    return el;
}

// ── SVG edge drawing ─────────────────────────────────────
function _wfDrawEdges() {
    const svg = document.getElementById('wfSvg');
    if (!svg) return;

    // Remove old paths/labels, keep defs + dotgrid rect
    svg.querySelectorAll('.wf-edge, .wf-edge-label').forEach(el => el.remove());

    const nodeMap = {};
    _wfNodes.forEach(n => nodeMap[n.id] = n);

    _wfEdges.forEach(e => {
        const from = nodeMap[e.from_node_id];
        const to   = nodeMap[e.to_node_id];
        if (!from || !to) return;

        const x1 = (from.position_x || 0) + WF_NODE_W;
        const y1 = (from.position_y || 0) + WF_NODE_H / 2;
        const x2 = (to.position_x   || 0);
        const y2 = (to.position_y   || 0) + WF_NODE_H / 2;

        const cx = Math.max(Math.abs(x2 - x1) * 0.45, 90);
        const d  = `M${x1},${y1} C${x1+cx},${y1} ${x2-cx},${y2} ${x2},${y2}`;

        // Path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'rgba(255,255,255,0.22)');
        path.setAttribute('stroke-width', '1.5');
        path.setAttribute('marker-end', 'url(#wfArrow)');
        path.classList.add('wf-edge');
        svg.appendChild(path);

        // Condition label at midpoint
        if (e.condition) {
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
            fo.setAttribute('x', mx - 36);
            fo.setAttribute('y', my - 11);
            fo.setAttribute('width', '72');
            fo.setAttribute('height', '22');
            fo.classList.add('wf-edge-label');
            fo.innerHTML = `<div xmlns="http://www.w3.org/1999/xhtml" class="wf-edge-pill">${e.condition}</div>`;
            svg.appendChild(fo);
        }
    });
}

// ── Transform helpers ─────────────────────────────────────
function _wfApplyTransform() {
    const layer = document.getElementById('wfLayer');
    if (!layer) return;
    layer.style.transform = `translate(${_wfTx}px, ${_wfTy}px) scale(${_wfScale})`;
    const label = document.getElementById('wfZoomLabel');
    if (label) label.textContent = Math.round(_wfScale * 100) + '%';
}

function _wfZoom(delta) {
    _wfScale = Math.min(2, Math.max(0.25, _wfScale + delta));
    _wfApplyTransform();
}

function _wfFitNodes() {
    if (!_wfNodes.length) { _wfTx = 40; _wfTy = 40; _wfScale = 1; _wfApplyTransform(); return; }
    const vp = document.getElementById('wfViewport');
    if (!vp) return;
    const vpW = vp.clientWidth  || 800;
    const vpH = vp.clientHeight || 480;

    const xs = _wfNodes.map(n => n.position_x || 0);
    const ys = _wfNodes.map(n => n.position_y || 0);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs) + WF_NODE_W;
    const maxY = Math.max(...ys) + WF_NODE_H;

    const pad   = 60;
    const scaleX = (vpW - pad * 2) / (maxX - minX || 1);
    const scaleY = (vpH - pad * 2) / (maxY - minY || 1);
    _wfScale = Math.min(1, scaleX, scaleY);
    _wfTx = pad - minX * _wfScale;
    _wfTy = pad - minY * _wfScale;
    _wfApplyTransform();
}

// ── Pan (drag on empty canvas) ────────────────────────────
function _setupViewportEvents() {
    const vp = document.getElementById('wfViewport');
    if (!vp) return;

    let panning = false, px = 0, py = 0;

    vp.addEventListener('mousedown', e => {
        if (e.target.closest('.wf-node')) return;
        panning = true;
        px = e.clientX; py = e.clientY;
        vp.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', e => {
        if (!panning) return;
        _wfTx += e.clientX - px;
        _wfTy += e.clientY - py;
        px = e.clientX; py = e.clientY;
        _wfApplyTransform();
    });

    window.addEventListener('mouseup', () => {
        panning = false;
        if (vp) vp.style.cursor = 'grab';
    });

    // Ctrl + scroll to zoom
    vp.addEventListener('wheel', e => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        _wfZoom(e.deltaY < 0 ? 0.08 : -0.08);
    }, { passive: false });
}

// ── Node drag ─────────────────────────────────────────────
function _startNodeDrag(e, nodeData, el) {
    const startX = e.clientX;
    const startY = e.clientY;
    const origX  = nodeData.position_x || 0;
    const origY  = nodeData.position_y || 0;

    el.classList.add('wf-node--dragging');

    const onMove = ev => {
        const dx = (ev.clientX - startX) / _wfScale;
        const dy = (ev.clientY - startY) / _wfScale;
        nodeData.position_x = Math.max(0, origX + dx);
        nodeData.position_y = Math.max(0, origY + dy);
        el.style.left = nodeData.position_x + 'px';
        el.style.top  = nodeData.position_y + 'px';
        _wfDrawEdges();
    };

    const onUp = async () => {
        el.classList.remove('wf-node--dragging');
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup',   onUp);

        // Persist position if endpoint exists
        try {
            await fetch(`${API_BASE}/workspaces/${currentWorkspaceId}/workflows/${currentWorkflowId}/nodes/${nodeData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ position_x: nodeData.position_x, position_y: nodeData.position_y })
            });
        } catch (_) { /* position save is best-effort */ }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
}
