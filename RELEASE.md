# Release Notes

## Version 1.12.0

This release includes improvements to Chinese word splitting functionality in Obsidian's CodeMirror editor.

### Release Process

Releases are now automated through GitHub Actions. When a version tag is pushed, the workflow will:
1. Build the project
2. Create release artifacts
3. Publish a GitHub release with all necessary assets

### Assets Included

- `main.js` - Main plugin file
- `manifest.json` - Plugin manifest
- `styles.css` - Plugin styles (if present)
- `zotlit.zip` - Complete plugin package
