// Constants
const CRITICAL_BRANCHES = [
  'main', 
  'master', 
  'production', 
  'development', 
  'dev',
  'staging', 
  'nightly'
];

// Configuration
const REQUIRED_APPROVALS = 1;

let lastCheck = 0;

function init() {
  console.log("MR Guard Extension Initialized");
  
  // Use a MutationObserver to handle dynamic content loading (SPA)
  const observer = new MutationObserver((mutations) => {
    // Throttle checks
    const now = Date.now();
    if (now - lastCheck > 1000) {
      checkAndApplyRules();
      lastCheck = now;
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
  });

  // Initial check
  setTimeout(checkAndApplyRules, 1000);
  setTimeout(checkAndApplyRules, 3000); // multiple checks for slow load
}

function checkAndApplyRules() {
  // 1. Check if we are on a Merge Request page
  if (!/\/merge_requests\/\d+/.test(window.location.href)) {
    return;
  }

  const targetBranch = getTargetBranch();
  const hasApproval = checkHasApproval();
  const mergeButton = getMergeButton();

  // --- Feature: Critical Branch Warning ---
  if (targetBranch && CRITICAL_BRANCHES.includes(targetBranch)) {
    showCriticalBanner(targetBranch);
  } else {
    removeCriticalBanner();
  }

  // --- Feature: Prevent Merge without Approval ---
  if (mergeButton) {
     if (!hasApproval) {
        disableMergeButton(mergeButton, `Requires at least ${REQUIRED_APPROVALS} approval${REQUIRED_APPROVALS > 1 ? 's' : ''}.`);
     } else {
        enableMergeButton(mergeButton);
     }
  }
}

function getTargetBranch() {
  // 1. Try finding the specific element first (modern GitLab)
  const targetEl = document.querySelector('.js-target-branch');
  if (targetEl) return targetEl.textContent.trim();
  
  // 2. Look for the "into target-branch" text structure in header
  // Often in .merge-request-details or .mr-source-target
  const details = document.querySelector('.merge-request-details');
  if (details && details.innerText.includes('into')) {
     const text = details.innerText;
     const parts = text.split(/into\s+/);
     if (parts.length > 1) {
         // The next word is usually the branch (or part of 'branch-name')
         const potentialBranch = parts[1].trim().split(/\s+/)[0]; 
         if (potentialBranch && potentialBranch.length > 0) return potentialBranch;
     }
  }

  // 3. Try finding via `ref-name` classes - usually the second one is target
  const refs = document.querySelectorAll('.ref-name');
  if (refs.length >= 2) {
      return refs[1].textContent.trim();
  }

  // 4. Fallback: Search for links formatted as /tree/branchname
  // Be careful not to pick up source branch. Target usually appears after source.
  // This is a bit risky but works if others fail.
  
  return null;
}

function checkHasApproval() {
  // Strategy: Look for positive indicators of approval
  const bodyText = document.body.innerText;
  
  // 0. Check if the approval is by the same person (self-approval)
  // If it says "Approved by you", do not enable merge
  // Uncomment if you want to block self-approvals.
  // if (bodyText.includes('Approved by you')) {
  //     return false;
  // }
  
  // 1. Check for "Approved by" text which usually appears when at least one person approved
  // It's often in a widget section stating "Approved by User1, User2"
  if (bodyText.includes('Approved by')) {
      // Verify it's not "0 Approved by" or something (unlikely)
      return true;
  }
  
  // 2. Check for "Approvals" section count
  // Sometimes it says "1 of 1 approvals"
  // Regex for "X of Y approvals" or "X approvals"
  const approvalsMatch = bodyText.match(/(\d+)\s+of\s+(\d+)\s+approvals/);
  if (approvalsMatch && parseInt(approvalsMatch[1]) >= 1) return true;
  
  // 3. Check for the green checkmark
  // .ci-status-icon-success is also used for pipelines, so be careful.
  // Look for .approved class on the merge request widget
  if (document.querySelector('.mr-widget-body.approved')) return true;
  
  // 4. Sometimes "Merge" button is disabled by GitLab itself if not approved.
  // Unless the user has "Merge options" enabling it.
  
  // Default to false (block merge) if we can't confirm. safely.
  // But to avoid blocking legitimate merges where we just can't find the text,
  // we might want to check for "Requires approval" text to confirm lack of approval.
  
  if (bodyText.includes('Requires') && bodyText.includes('approval')) {
      return false;
  }
  
  // If we don't see "Approved by" AND we don't see "Requires approval", it's ambiguous.
  // However, usually "Approved by" is present.
  
  return false; 
}

function getMergeButton() {
  // Select the button that actually triggers the merge
  // .accept-merge-request is the classic class
  // data-qa-selector="merge_button" for testing
  return document.querySelector('.accept-merge-request') || 
         document.querySelector('button[data-qa-selector="merge_button"]');
}

function showCriticalBanner(targetBranch) {
  const bannerId = 'mr-guard-critical-banner';
  if (document.getElementById(bannerId)) return;

  const banner = document.createElement('div');
  banner.id = bannerId;
  banner.className = 'mr-guard-banner critical';
  
  // Create elements safely without innerHTML
  const container = document.createElement('div');
  container.className = 'mr-guard-content-container';
  
  const leftCol = document.createElement('div');
  leftCol.className = 'mr-guard-left-col';
  
  const icon = document.createElement('div');
  icon.className = 'mr-guard-icon';
  icon.textContent = '⚠️';
  
  const textMain = document.createElement('div');
  textMain.className = 'mr-guard-text-main';
  
  const h2 = document.createElement('h2');
  h2.textContent = 'CRITICAL ALERT';
  
  const p = document.createElement('p');
  p.textContent = 'Merging into ';
  const branchSpan = document.createElement('span');
  branchSpan.className = 'highlight-branch';
  branchSpan.textContent = targetBranch;
  p.appendChild(branchSpan);
  
  textMain.appendChild(h2);
  textMain.appendChild(p);
  leftCol.appendChild(icon);
  leftCol.appendChild(textMain);
  
  const rightCol = document.createElement('div');
  rightCol.className = 'mr-guard-right-col';
  
  const checklistTitle = document.createElement('div');
  checklistTitle.className = 'mr-guard-checklist-title';
  checklistTitle.textContent = 'REQUIRED ACTIONS:';
  
  const ul = document.createElement('ul');
  ul.className = 'mr-guard-checklist';
  
  const items = ['Reviewer', 'Channels', 'DevOps'];
  items.forEach(item => {
    const li = document.createElement('li');
    const itemSpan = document.createElement('span');
    itemSpan.textContent = item;
    const checkSpan = document.createElement('span');
    checkSpan.className = 'check';
    checkSpan.textContent = '✅';
    li.appendChild(itemSpan);
    li.appendChild(document.createTextNode(' '));
    li.appendChild(checkSpan);
    ul.appendChild(li);
  });
  
  rightCol.appendChild(checklistTitle);
  rightCol.appendChild(ul);
  container.appendChild(leftCol);
  container.appendChild(rightCol);
  banner.appendChild(container);
  document.body.prepend(banner);
}

function removeCriticalBanner() {
  const banner = document.getElementById('mr-guard-critical-banner');
  if (banner) banner.remove();
}

function disableMergeButton(button, reason) {
  if (button.dataset.mrGuardDisabled === 'true') return;

  // 1. Hide the original button's container if relevant, or just the button
  // Often the button is inside a .accept-merge-request container which also has styling
  // We prefer adding a class to the *button* that makes it invisible
  button.classList.add('mr-guard-hidden-btn'); 
  
  // 2. Mark as disabled to prevent script interaction just in case
  button.dataset.mrGuardDisabled = 'true';
  button.setAttribute('disabled', 'true'); 

  // 3. Insert our "Glorified" Blocking Message
  // We want to insert it effectively replacing the button visually
  const blockerId = 'mr-guard-blocker-message';
  if (!document.getElementById(blockerId)) {
    const blocker = document.createElement('div');
    blocker.id = blockerId;
    blocker.className = 'mr-guard-blocker';
    
    // Create elements safely without innerHTML
    const content = document.createElement('div');
    content.className = 'mr-guard-blocker-content';
    
    const iconDiv = document.createElement('div');
    iconDiv.className = 'mr-guard-blocker-icon';
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill-rule', 'evenodd');
    path.setAttribute('d', 'M10 1H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zM6 0a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3V3a3 3 0 0 0-3-3H6zm2 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4zm0 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z');
    
    svg.appendChild(path);
    iconDiv.appendChild(svg);
    
    const textDiv = document.createElement('div');
    textDiv.className = 'mr-guard-blocker-text';
    
    const h3 = document.createElement('h3');
    h3.textContent = 'Merge blocked';
    
    const p = document.createElement('p');
    p.textContent = reason;
    
    textDiv.appendChild(h3);
    textDiv.appendChild(p);
    content.appendChild(iconDiv);
    content.appendChild(textDiv);
    blocker.appendChild(content);
    
    // Insert before the button (which is now invisible but still in DOM)
    button.parentNode.insertBefore(blocker, button);
  }
}

function enableMergeButton(button) {
  if (button.dataset.mrGuardDisabled !== 'true') return;

  // Restore checks
  button.classList.remove('mr-guard-hidden-btn');
  button.removeAttribute('disabled');
  delete button.dataset.mrGuardDisabled;
  
  // Remove our blocker
  const blocker = document.getElementById('mr-guard-blocker-message');
  if (blocker) blocker.remove();
}

init();
