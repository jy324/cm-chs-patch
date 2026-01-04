# Release Notes

## Version 1.12.0

This release includes improvements to Chinese word splitting functionality in Obsidian's CodeMirror editor.

### Release Process

Releases are now automated through GitHub Actions using the release-it tool. To publish a release:

1. Go to the Actions tab in GitHub
2. Select the "Release" workflow
3. Click "Run workflow"
4. Enter the version increment or specific version:
   - Use "patch", "minor", or "major" for automatic version bumping from current version
   - Or enter a specific version number like "1.12.0" to release that exact version
   - Note: Specific versions must be in valid semver format (X.Y.Z) and typically should be higher than the current version
5. The workflow will:
   - Build the project
   - Create release artifacts
   - Create a git tag
   - Publish a GitHub release with all necessary assets

Alternatively, releases can be created locally using:
```bash
pnpm install
GITHUB_TOKEN=<your_token> pnpm release
```

### Assets Included

- `main.js` - Main plugin file
- `manifest.json` - Plugin manifest
- `styles.css` - Plugin styles (only included if the file exists; automatically skipped if not present)
- `zotlit.zip` - Complete plugin package containing all files above
