// Defaults (used until storage is loaded and as fallback)
const DEFAULT_CRITICAL_BRANCHES = [
  "main",
  "master",
  "production",
  "staging",
  "development",
  "dev",
  "nightly",
];
const DEFAULT_REQUIRED_APPROVALS = 1;
const DEFAULT_REQUIRED_ACTIONS = ["Reviewer", "Channels", "DevOps"];

// Active config (populated from storage)
let CRITICAL_BRANCHES = [...DEFAULT_CRITICAL_BRANCHES];
let REQUIRED_APPROVALS = DEFAULT_REQUIRED_APPROVALS;
let REQUIRED_ACTIONS = [...DEFAULT_REQUIRED_ACTIONS];

let lastCheck = 0;

function loadSettings(callback) {
  chrome.storage.sync.get(
    {
      criticalBranches: DEFAULT_CRITICAL_BRANCHES,
      requiredApprovals: DEFAULT_REQUIRED_APPROVALS,
      requiredActions: DEFAULT_REQUIRED_ACTIONS,
    },
    (settings) => {
      CRITICAL_BRANCHES = settings.criticalBranches;
      REQUIRED_APPROVALS = settings.requiredApprovals;
      REQUIRED_ACTIONS = settings.requiredActions;
      if (callback) callback();
    },
  );
}

function init() {
  loadSettings(() => {
    // Re-run rules whenever settings change (e.g. popup saves)
    chrome.storage.onChanged.addListener((changes) => {
      loadSettings(checkAndApplyRules);
    });

    // Use a MutationObserver to handle dynamic content loading (SPA)
    // Debounce checks instead of throttling, to wait for the DOM to settle
    let domTimeout = null;
    const observer = new MutationObserver(() => {
      clearTimeout(domTimeout);
      domTimeout = setTimeout(() => {
        checkAndApplyRules();
      }, 800); // 800ms after the last mutation
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Initial check
    setTimeout(checkAndApplyRules, 1000);
    setTimeout(checkAndApplyRules, 3000); // multiple checks for slow load
  });
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

  // --- Feature: Hide "Merge when..." controls until approved ---
  if (!hasApproval) {
    hideMergeMomentControls();
  } else {
    showMergeMomentControls();
  }

  // --- Feature: Prevent Merge without Approval ---
  if (!hasApproval) {
    if (mergeButton) {
      // Use different terminology ("review sign-off") here rather than "1 approval"
      // so we do not accidentally trick our own regex in checkHasApproval().
      disableMergeButton(
        mergeButton,
        `Blocked: ${REQUIRED_APPROVALS} review sign-off${REQUIRED_APPROVALS > 1 ? "s" : ""} required.`,
      );
    }
  } else {
    // Always remove the blocker (button may have been re-rendered by GitLab,
    // losing its mrGuardDisabled flag, but the blocker div persists in the DOM)
    if (mergeButton) enableMergeButton(mergeButton);
    const blocker = document.getElementById("mr-guard-blocker-message");
    if (blocker) blocker.remove();
  }
}

function getTargetBranch() {
  // 1. Try finding the specific element first (modern GitLab)
  const targetEl = document.querySelector(".js-target-branch");
  if (targetEl) return targetEl.textContent.trim();

  // 2. Look for the "into target-branch" text structure in header
  // Often in .merge-request-details or .mr-source-target
  const details = document.querySelector(".merge-request-details");
  if (details && details.innerText.includes("into")) {
    const text = details.innerText;
    const parts = text.split(/into\s+/);
    if (parts.length > 1) {
      // The next word is usually the branch (or part of 'branch-name')
      const potentialBranch = parts[1].trim().split(/\s+/)[0];
      if (potentialBranch && potentialBranch.length > 0) return potentialBranch;
    }
  }

  // 3. Try finding via `ref-name` classes - usually the second one is target
  const refs = document.querySelectorAll(".ref-name");
  if (refs.length >= 2) {
    return refs[1].textContent.trim();
  }

  // 4. Fallback: Search for links formatted as /tree/branchname
  // Be careful not to pick up source branch. Target usually appears after source.
  // This is a bit risky but works if others fail.

  return null;
}

function checkHasApproval() {
  // Strategy: check all positive signals first, then fall back to negative signals.
  const bodyText = document.body.innerText;

  // 1. Most reliable: "X of Y approvals" — check X meets REQUIRED_APPROVALS
  const approvalsMatch = bodyText.match(/(\d+)\s+of\s+(\d+)\s+approvals/i);
  if (approvalsMatch) {
    const received = parseInt(approvalsMatch[1]);
    const result = received >= REQUIRED_APPROVALS;
    return result;
  }

  // 2. Standalone count: "X approvals" or "X approval"
  //    Strip "Requires X approvals" phrases first so we don't confuse the
  //    GitLab requirement notice with actual received approvals.
  const bodyTextForCount = bodyText.replace(
    /Requires(\s+at\s+least)?\s+\d+\s+approvals?/gi,
    "",
  );
  const countMatch = bodyTextForCount.match(/(\d+)\s+approvals?/i);
  if (countMatch) {
    const received = parseInt(countMatch[1]);
    const result = received >= REQUIRED_APPROVALS;
    return result;
  }

  // 3. Check for the approved class on the merge request widget.
  //    GitLab adds this when its own threshold is met — which may be lower
  //    than our custom REQUIRED_APPROVALS — so only trust it for 1 approval.
  if (
    document.querySelector(".mr-widget-body.approved") &&
    REQUIRED_APPROVALS <= 1
  ) {
    return true;
  }

  // 4. "Approved by" text is present but we have no count info.
  //    Only trust this when a single approval is sufficient.
  if (bodyText.includes("Approved by") && REQUIRED_APPROVALS <= 1) {
    return true;
  }

  // 5. GitLab explicitly says approval is still required.
  //    Checked last because GitLab can show "Requires X approvals" in the rules
  //    section even after the required number of approvals has been reached.
  if (bodyText.includes("Requires") && bodyText.includes("approval")) {
    return false;
  }

  // If no strategy matched, it means the text like "X approvals" wasn't found,
  // which implies 0 approvals. Default to false so we block properly.
  return false;
}

function getMergeButton() {
  // Select the button that actually triggers the merge
  // .accept-merge-request is the classic class
  // data-qa-selector="merge_button" for testing
  return (
    document.querySelector(".accept-merge-request") ||
    document.querySelector('button[data-qa-selector="merge_button"]')
  );
}

function hideMergeMomentControls() {
  // "Merge when all merge checks pass" helper text
  document
    .querySelectorAll('[data-testid="auto-merge-helper-text"]')
    .forEach((el) => {
      if (el.dataset.mrGuardHidden !== "true") {
        el.dataset.mrGuardHidden = "true";
        el.style.display = "none";
      }
    });

  // The caret dropdown containing "Merge immediately"
  document
    .querySelectorAll('[data-testid="merge-immediately-dropdown"]')
    .forEach((el) => {
      if (el.dataset.mrGuardHidden !== "true") {
        el.dataset.mrGuardHidden = "true";
        el.style.display = "none";
      }
    });
}

function showMergeMomentControls() {
  document.querySelectorAll('[data-mr-guard-hidden="true"]').forEach((el) => {
    el.style.display = "";
    delete el.dataset.mrGuardHidden;
  });
}

function showCriticalBanner(targetBranch) {
  const bannerId = "mr-guard-critical-banner";
  const actionsStr = REQUIRED_ACTIONS.join(",");
  const existing = document.getElementById(bannerId);

  if (
    existing &&
    existing.dataset.branch === targetBranch &&
    existing.dataset.actions === actionsStr
  ) {
    return; // Prevent infinite mutation observer loop
  }

  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.id = bannerId;
  banner.className = "mr-guard-banner critical";
  banner.dataset.branch = targetBranch;
  banner.dataset.actions = actionsStr;

  // Create elements safely without innerHTML
  const container = document.createElement("div");
  container.className = "mr-guard-content-container";

  const leftCol = document.createElement("div");
  leftCol.className = "mr-guard-left-col";

  const icon = document.createElement("div");
  icon.className = "mr-guard-icon";
  icon.textContent = "⚠️";

  const textMain = document.createElement("div");
  textMain.className = "mr-guard-text-main";

  const h2 = document.createElement("h2");
  h2.textContent = "CRITICAL ALERT";

  const p = document.createElement("p");
  p.textContent = "Merging into ";
  const branchSpan = document.createElement("span");
  branchSpan.className = "highlight-branch";
  branchSpan.textContent = targetBranch;
  p.appendChild(branchSpan);

  textMain.appendChild(h2);
  textMain.appendChild(p);
  leftCol.appendChild(icon);
  leftCol.appendChild(textMain);

  const rightCol = document.createElement("div");
  rightCol.className = "mr-guard-right-col";

  const checklistTitle = document.createElement("div");
  checklistTitle.className = "mr-guard-checklist-title";
  checklistTitle.textContent = "REQUIRED ACTIONS:";

  const ul = document.createElement("ul");
  ul.className = "mr-guard-checklist";

  const items = REQUIRED_ACTIONS;
  items.forEach((item) => {
    const li = document.createElement("li");
    const itemSpan = document.createElement("span");
    itemSpan.textContent = item;
    const checkSpan = document.createElement("span");
    checkSpan.className = "check";
    checkSpan.textContent = "✅";
    li.appendChild(itemSpan);
    li.appendChild(document.createTextNode(" "));
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
  const banner = document.getElementById("mr-guard-critical-banner");
  if (banner) banner.remove();
}

function disableMergeButton(button, reason) {
  // If already disabled, just update the reason text if it changed
  if (button.dataset.mrGuardDisabled === "true") {
    const p = document.querySelector(
      "#mr-guard-blocker-message .mr-guard-blocker-text p",
    );
    if (p && p.textContent !== reason) p.textContent = reason;
    return;
  }

  // 1. Hide the original button's container if relevant, or just the button
  // Often the button is inside a .accept-merge-request container which also has styling
  // We prefer adding a class to the *button* that makes it invisible
  button.classList.add("mr-guard-hidden-btn");

  // 2. Mark as disabled to prevent script interaction just in case
  button.dataset.mrGuardDisabled = "true";
  button.setAttribute("disabled", "true");

  // 3. Insert our "Glorified" Blocking Message
  // We want to insert it effectively replacing the button visually
  const blockerId = "mr-guard-blocker-message";
  if (!document.getElementById(blockerId)) {
    const blocker = document.createElement("div");
    blocker.id = blockerId;
    blocker.className = "mr-guard-blocker";

    // Create elements safely without innerHTML
    const content = document.createElement("div");
    content.className = "mr-guard-blocker-content";

    const iconDiv = document.createElement("div");
    iconDiv.className = "mr-guard-blocker-icon";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill-rule", "evenodd");
    path.setAttribute(
      "d",
      "M10 1H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zM6 0a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3V3a3 3 0 0 0-3-3H6zm2 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4zm0 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
    );

    svg.appendChild(path);
    iconDiv.appendChild(svg);

    const textDiv = document.createElement("div");
    textDiv.className = "mr-guard-blocker-text";

    const h3 = document.createElement("h3");
    h3.textContent = "Merge blocked";

    const p = document.createElement("p");
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
  if (button.dataset.mrGuardDisabled !== "true") return;

  // Restore checks
  button.classList.remove("mr-guard-hidden-btn");
  button.removeAttribute("disabled");
  delete button.dataset.mrGuardDisabled;

  // Remove our blocker
  const blocker = document.getElementById("mr-guard-blocker-message");
  if (blocker) blocker.remove();
}

init();
