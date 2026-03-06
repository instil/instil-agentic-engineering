/**
 * Agent detail drawer – open / close / keyboard handling.
 */

import { agentDetails } from '../data/agents.js';

let lastFocusedPill = null;

export function showDetail(agentId) {
  const agent = agentDetails[agentId];
  if (!agent) return;
  const s = agent.stage;

  document.getElementById('drawerHeaderContent').innerHTML = `
    <span class="drawer-stage-badge ${s}">${agent.stageLabel} Stage</span>
    <h2 class="drawer-title">${agent.name}</h2>
    <p class="drawer-desc">${agent.description}</p>
  `;

  document.getElementById('drawerBodyContent').innerHTML = `
    <div class="drawer-section">
      <div class="drawer-section-title">What it does</div>
      ${agent.activities.map((a) => `<div class="drawer-list-item ${s}-item">${a}</div>`).join('')}
    </div>
    <div class="drawer-section">
      <div class="drawer-section-title">Inputs</div>
      <div style="padding-top:4px">${agent.inputs.map((i) => `<span class="drawer-chip">${i}</span>`).join('')}</div>
    </div>
    <div class="drawer-section">
      <div class="drawer-section-title">Outputs</div>
      <div style="padding-top:4px">${agent.outputs.map((o) => `<span class="drawer-chip">${o}</span>`).join('')}</div>
    </div>
    ${
      agent.skillUrl
        ? `
    <div class="drawer-section">
      <div class="drawer-section-title">Skill File</div>
      <a class="drawer-skill-link" href="${agent.skillUrl}" target="_blank" rel="noopener noreferrer">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/></svg>
        View SKILL.md on GitHub
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3.5 1.5h7v7M10.5 1.5l-9 9"/></svg>
      </a>
    </div>
    `
        : ''
    }
  `;

  document.getElementById('detailOverlay').classList.add('active');
  document.getElementById('detailDrawer').classList.add('active');
}

export function hideDetail() {
  document.getElementById('detailOverlay').classList.remove('active');
  document.getElementById('detailDrawer').classList.remove('active');
  if (lastFocusedPill) lastFocusedPill.focus();
}

export function initDrawer() {
  // Wire up agent pills
  document.querySelectorAll('.agent-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const id = pill.getAttribute('data-agent');
      lastFocusedPill = pill;
      showDetail(id);
    });
    pill.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const id = pill.getAttribute('data-agent');
        lastFocusedPill = pill;
        showDetail(id);
      }
    });
  });

  // Overlay click to close
  document.getElementById('detailOverlay')?.addEventListener('click', hideDetail);

  // Close button
  document.querySelector('.drawer-close')?.addEventListener('click', hideDetail);

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideDetail();
  });
}
