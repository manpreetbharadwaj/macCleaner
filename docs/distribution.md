# macOS distribution and Firebase deployment

This project has two independent applications:

- `src/` + `src-tauri/`: the native Tauri desktop application.
- `web/`: the public marketing website.

Only `web/dist` is a deployable website. Root `dist/` is the Tauri frontend and must never be published as the marketing site.

## Local DMG builds

The DMG wrapper runs Tauri with `--bundles dmg` and an explicit target, mounts the result read-only, reads the executable architectures with `lipo`, checks its signature and stapled ticket, and copies a canonical artifact plus SHA-256 file into the ignored `release/` directory.

```bash
npm run dmg:native
npm run dmg:arm64
npm run dmg:intel
npm run dmg:universal
```

Targets map as follows:

| Command | Tauri target | Required executable architectures |
|---|---|---|
| `dmg:arm64` | `aarch64-apple-darwin` | `arm64` |
| `dmg:intel` | `x86_64-apple-darwin` | `x86_64` |
| `dmg:universal` | `universal-apple-darwin` | `arm64` and `x86_64` |

The script never installs a missing Rust target automatically. Install only the target you intend to build:

```bash
rustup target add x86_64-apple-darwin
```

Universal support is not claimed merely because the command exists. The release copy is created only after `lipo` confirms both slices. Dependency compatibility is therefore proven by a successful build and binary inspection, not configuration alone.

## Development versus production signing

`src-tauri/tauri.conf.json` uses the ad-hoc identity `-` for local development and explicitly enables hardened runtime. Ad-hoc output is useful for local testing but is not production trusted and the strict website release build rejects it.

For direct distribution, install a valid **Developer ID Application** certificate in the signing keychain, then provide its identity at runtime:

```bash
export APPLE_SIGNING_IDENTITY='Developer ID Application: …'
```

Provide one notarization credential set without committing it.

App Store Connect API key:

```bash
export APPLE_API_ISSUER='…'
export APPLE_API_KEY='…'
export APPLE_API_KEY_PATH='/absolute/path/to/AuthKey_….p8'
```

Or Apple ID credentials:

```bash
export APPLE_ID='…'
export APPLE_PASSWORD='…' # app-specific password
export APPLE_TEAM_ID='…'
```

Then build the intended architecture:

```bash
npm run dmg:production
# or, for a verified universal build:
npm run dmg:universal -- --production
```

Production mode fails unless the mounted app reports a Developer ID signature and `xcrun stapler validate` succeeds. Tauri performs signing/notarization from the environment; the repository does not create, download, or store credentials.

Optional independent release checks:

```bash
codesign --verify --deep --strict --verbose=2 '/Volumes/.../MacBook Cleaner.app'
spctl --assess --type execute --verbose=4 '/Volumes/.../MacBook Cleaner.app'
xcrun stapler validate '/Volumes/.../MacBook Cleaner.app'
lipo -archs '/Volumes/.../MacBook Cleaner.app/Contents/MacOS/macbook-cleaner'
shasum -a 256 release/MacBook-Cleaner-*.dmg
```

## Website installer flow

`web/scripts/prepare-installer.mjs` inspects the selected local DMG and writes ignored generated metadata. It either copies the verified artifact to `/downloads/` or uses `VITE_MAC_DOWNLOAD_URL` as the public destination. All website download buttons consume that one metadata object.

Ordinary local website builds are allowed without a DMG and show “Download unavailable.” Strict release builds are not:

```bash
npm run web:build
npm run web:build:release
```

`web:build:release` also verifies that a same-origin file exists in `web/dist`, has the DMG `koly` trailer, matches the inspected SHA-256 checksum, and is Developer ID signed plus notarized. An external HTTPS URL receives an HTTP HEAD check and is rejected if it returns HTML, an error status, or an implausibly small response.

## Firebase project selection and deployment

The repository intentionally does not contain a Firebase project ID. Select it explicitly for each environment:

```bash
firebase projects:list
firebase use --add
firebase use
```

For a one-off command that cannot accidentally use a remembered project:

```bash
firebase deploy --only hosting --project '<verified-project-id>'
```

Firebase runs `npm --prefix web run build:release` before deployment and publishes only `web/dist`. It uses clean URLs without a catch-all SPA rewrite and sets DMG attachment/content-type headers under `/downloads/**`.

After deployment, verify the exact versioned URL before announcing it:

```bash
curl -fsSIL 'https://<verified-domain>/downloads/MacBook-Cleaner-<version>-<architecture>.dmg'
```

The response must be successful, must not be HTML, and should report `Content-Type: application/x-apple-diskimage` and `Content-Disposition: attachment`.

Production release and deployment remain blocked until Apple credentials, a valid Developer ID certificate, notarization credentials, a Firebase project, and working domain access are supplied by the project owner.
