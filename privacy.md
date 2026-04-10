# Privacy Policy for GitLab MR Approval Guard

**Last Updated: April 8, 2026**

## Data Collection

GitLab MR Approval Guard does **not** collect, store, or transmit any personal data or user information.

## What the Extension Does

This extension operates entirely locally in your browser and:

- Reads approval counts from GitLab merge request pages
- Detects protected branch names (main, master, production, development, staging, nightly)
- Modifies the merge button behavior based on approval status
- Displays warning banners for protected branches

## Data Storage

GitLab MR Approval Guard uses your browser's sync storage (`chrome.storage.sync`) solely to save your customized settings, which include:

- Critical branch names
- Number of required approvals
- Required checklist actions

This data remains securely tied to your browser profile and is not transmitted to our servers or any third parties. The extension does not use:

- Cookies
- External servers
- Analytics services
- Tracking mechanisms

## Third-Party Services

This extension does not communicate with any third-party services or external servers. All functionality is self-contained within the extension.

## Permissions Used

- **Host permissions** (`*://gitlab.com/*` and similar): To access GitLab domains and read page content to enforce approval rules
- **scripting**: To modify the merge button state and display warning banners
- **storage**: To save your custom extension preferences (e.g., critical branches, required approvals, and actions)

All processing happens locally in your browser. No data leaves your machine.

## Changes to This Policy

Any updates to this privacy policy will be reflected in the extension's repository and updated in the Chrome Web Store listing.

## Contact

For questions or concerns about this privacy policy, contact: [emad.ehsanrad@gmail.com](mailto:emad.ehsanrad@gmail.com)

## Compliance

This extension complies with:

- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR)
- No user data is collected, therefore no data processing occurs
