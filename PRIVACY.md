# Privacy Policy for Chat Search

**Last updated:** January 2025

## Summary
Chat Search stores all data locally on your device. We do not collect, transmit, or store any of your data on external servers.

## Data Collection
**We collect nothing.** Specifically:
- No analytics or telemetry
- No personal information
- No chat content
- No usage statistics
- No cookies or tracking

## Data Storage
All data is stored locally in your browser using IndexedDB:
- Your connected account information (account names, not credentials)
- Synced chat metadata and content for search purposes
- Search index for fast full-text search

This data never leaves your device.

## Permissions Explained
- **storage**: To save your synced chats locally in IndexedDB
- **sidePanel**: To display the search interface
- **cookies**: To authenticate with Claude/ChatGPT APIs using your existing logged-in sessions (cookies are read locally, never transmitted)
- **Host permissions (claude.ai, chatgpt.com)**: To fetch your chat history from these services using your authenticated session

## Third-Party Services
This extension communicates with:
- **claude.ai** - To fetch your Claude conversations (using your existing login)
- **chatgpt.com** - To fetch your ChatGPT conversations (using your existing login)

No data is sent to any other third party.

## Data Deletion
Uninstalling the extension removes all locally stored data. You can also clear data via Chrome's extension settings.

## Open Source
This extension is open source. You can audit the code yourself.

## Contact
For questions about this privacy policy, open an issue on the GitHub repository.

## Changes
Any changes to this privacy policy will be reflected in extension updates.
