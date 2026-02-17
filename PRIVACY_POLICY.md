# Privacy Policy for GitLab MR Approval Guard

**Last Updated: February 17, 2026**

## Data Collection

GitLab MR Approval Guard does **not** collect, store, or transmit any personal data or user information.

## What the Extension Does

This extension operates entirely locally in your browser and:
- Reads approval counts from GitLab merge request pages
- Detects protected branch names (main, master, production, development, staging, nightly)
- Modifies the merge button behavior based on approval status
- Displays warning banners for protected branches

## Data Storage

No data is stored locally or remotely. The extension does not use:
- Cookies
- Local storage
- External servers
- Analytics services
- Tracking mechanisms

## Third-Party Services

This extension does not communicate with any third-party services or external servers. All functionality is self-contained within the extension.

## Permissions Used

- **activeTab**: To inject scripts into GitLab pages you're currently viewing
- **Host permissions** (`*://gitlab.com/*` and similar): To access GitLab domains and read page content to enforce approval rules
- **scripting**: To modify the merge button state and display warning banners

All processing happens locally in your browser. No data leaves your machine.

## Changes to This Policy

Any updates to this privacy policy will be reflected in the extension's repository and updated in the Chrome Web Store listing.

## Contact

For questions or concerns about this privacy policy, contact: [your-email@example.com]

## Compliance

This extension complies with:
- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR)
- No user data is collected, therefore no data processing occurs
