MOONWAVE starter website (PWA)

FILES
- index.html: app layout
- style.css: dreamy Moonwave styling
- app.js: local audio selection, playback, shuffle/repeat, playlists
- manifest.webmanifest: Home Screen app metadata
- sw.js: basic offline caching
- icon-192.png / icon-512.png: app icons

HOSTING WITH GITHUB PAGES
1. Sign in/create an account at https://github.com/
2. Create a NEW PUBLIC repository named moonwave-player (GitHub Pages on Free works with public repositories).
3. Choose Add file > Upload files and upload every file in this folder, including both PNG icons and the .webmanifest and .js files.
4. Commit the upload.
5. In the repository, open Settings > Pages.
6. Under Build and deployment, choose Deploy from a branch; select branch main and folder /(root), then Save.
7. Wait for the published URL shown in the Pages section. It will look like https://YOUR-USERNAME.github.io/moonwave-player/
8. Open that URL in Safari on your iPhone, tap Share, choose Add to Home Screen, turn on Open as Web App if offered, then tap Add.

IMPORTANT NOTES
- GitHub Pages sites are public. Do not put private information or music files in the repository.
- The app does not upload the selected music, but browser-selected audio object URLs are temporary. After closing/reloading the app, you may need to select the audio files again. Playlists in this starter are also temporary and reset when the page reloads.
- This starter is a static web app, not a native App Store app.
- Offline caching is best-effort; the first load requires an internet connection.
- Fonts are loaded from Google Fonts when online; system fonts are used if unavailable.
