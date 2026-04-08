const DEFAULT_BRANCHES = ['main', 'master', 'production', 'development', 'dev', 'staging', 'nightly'];
const DEFAULT_APPROVALS = 1;
const DEFAULT_ACTIONS = ['Reviewer', 'Channels', 'DevOps'];

// ── Tag widget ───────────────────────────────────────────────────────────────

function createTagWidget(boxId, inputId, items) {
  const box = document.getElementById(boxId);
  const input = document.getElementById(inputId);
  let tags = [...items];

  function render() {
    // Remove existing tag elements (keep the input)
    box.querySelectorAll('.tag').forEach(el => el.remove());

    tags.forEach((tag, index) => {
      const tagEl = document.createElement('span');
      tagEl.className = 'tag';
      tagEl.textContent = tag;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.setAttribute('aria-label', `Remove ${tag}`);
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        tags.splice(index, 1);
        render();
      });

      tagEl.appendChild(removeBtn);
      box.insertBefore(tagEl, input);
    });
  }

  function addTag(value) {
    const trimmed = value.trim().replace(/,+$/, '');
    if (trimmed && !tags.includes(trimmed)) {
      tags.push(trimmed);
      render();
    }
    input.value = '';
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input.value);
    } else if (e.key === 'Backspace' && input.value === '' && tags.length > 0) {
      tags.pop();
      render();
    }
  });

  input.addEventListener('blur', () => {
    if (input.value.trim()) addTag(input.value);
  });

  // Clicking anywhere in the box focuses the input
  box.addEventListener('click', () => input.focus());

  render();

  return { getTags: () => [...tags] };
}

// ── Main ─────────────────────────────────────────────────────────────────────

let branchWidget, actionWidget;

document.addEventListener('DOMContentLoaded', () => {
  const approvalsInput = document.getElementById('required-approvals');
  const approvalsLabel = document.getElementById('approvals-label');

  function updateApprovalsLabel(value) {
    const n = parseInt(value, 10);
    approvalsLabel.textContent = (n === 1 ? 'approval' : 'approvals') + ' before merge';
  }

  approvalsInput.addEventListener('input', () => updateApprovalsLabel(approvalsInput.value));

  chrome.storage.sync.get(
    {
      criticalBranches: DEFAULT_BRANCHES,
      requiredApprovals: DEFAULT_APPROVALS,
      requiredActions: DEFAULT_ACTIONS,
    },
    (settings) => {
      approvalsInput.value = settings.requiredApprovals;
      updateApprovalsLabel(settings.requiredApprovals);
      branchWidget = createTagWidget('branches-box', 'branch-input', settings.criticalBranches);
      actionWidget = createTagWidget('actions-box', 'action-input', settings.requiredActions);
    }
  );

  document.getElementById('save-btn').addEventListener('click', () => {
    const approvals = parseInt(document.getElementById('required-approvals').value, 10);

    chrome.storage.sync.set(
      {
        criticalBranches: branchWidget.getTags(),
        requiredApprovals: isNaN(approvals) || approvals < 1 ? DEFAULT_APPROVALS : approvals,
        requiredActions: actionWidget.getTags(),
      },
      () => {
        const toast = document.getElementById('toast');
        const saveBtn = document.getElementById('save-btn');
        toast.style.display = 'block';
        saveBtn.style.display = 'none';
        setTimeout(() => {
          toast.style.display = 'none';
          saveBtn.style.display = '';
        }, 2000);
      }
    );
  });
});
