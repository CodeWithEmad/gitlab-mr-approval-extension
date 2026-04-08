[![GitHub](https://img.shields.io/github/license/codewithemad/gitlab-mr-approval-extension)](https://github.com/CodeWithEmad/gitlab-mr-approval-extension/blob/main/LICENSE)
[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/codewithemad/gitlab-mr-approval-extension)](https://github.com/CodeWithEmad/gitlab-mr-approval-extension/releases/latest)

![GitLab MR Approval Guard in action](https://raw.githubusercontent.com/CodeWithEmad/gitlab-mr-approval-extension/main/images/banner.png)

This Extension enforces strict approval rules on GitLab Merge Requests and provides critical warnings when merging into protected branches.

## Features

1. **Approval Enforcement**: Prevents the "Merge" button from being clickable unless at least **1 approval** is detected.
2. **Critical Branch Warnings**: Displays a prominent, non-dismissible banner at the top of the page when merging into:
    * `main`
    * `master`
    * `production`
    * `development` / `dev`
    * `staging`
    * `nightly`

    The banner reminds you to:
    * Get a review.
    * Post in related channels.
    * Ensure a DevOps team member is present.

## Installation

1. Clone or download this repository.

### Google Chrome

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top right).
3. Click **Load unpacked**.
4. Select the folder where you cloned this repository.

### Mozilla Firefox

#### Installation (Permanent)

1. Visit the [Firefox Add-ons page](https://addons.mozilla.org/en-US/firefox/addon/gitlab-mr-approval-guard/).
2. Click **Add to Firefox**.

#### Debugging (Temporary)

1. Open Firefox and navigate to `about:debugging`.
2. Click on **This Firefox** in the sidebar.
3. Click **Load Temporary Add-on...**.
4. Select the `manifest.json` file from this repository.

## Usage

Navigate to any GitLab Merge Request. The extension will automatically activate.
