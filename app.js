
/*
  MOONWAVE — Your Music. Your Universe.
  Supabase-powered music library and playlists.

  Before using:
  1. Add the Supabase CDN script to index.html before app.js.
  2. Enter your Supabase Project URL and publishable key below.
  3. Supabase bucket: moonwave-music (private).
*/

(() => {
  "use strict";

  // --------------------------------------------------
  // 1. SUPABASE CONFIGURATION
  // --------------------------------------------------

const SUPABASE_URL = "https://hmvbccvtnrmkjanddmxc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_70mTFeHAbUPOmXY11mUqNw_NM5ypwlO';                      
  const BUCKET = "moonwave-music";

  const $ = (id) => document.getElementById(id);

  if (!window.supabase) {
    alert(
      "MOONWAVE could not load Supabase. Check that the Supabase CDN script appears before app.js in index.html."
    );
    return;
  }

  if (
    SUPABASE_URL.includes("PASTE_YOUR") ||
    SUPABASE_PUBLISHABLE_KEY.includes("PASTE_YOUR")
  ) {
    alert("Please add your Supabase Project URL and publishable key at the top of app.js.");
    return;
  }

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  const audio = $("audio");

  let user = null;
  let songs = [];
  let playlists = [];
  let currentSongId = null;
  let currentObjectUrl = null;
  let currentPlaylistId = null;
  let shuffle = false;
  let repeat = false;

  // --------------------------------------------------
  // 2. SMALL HELPERS
  // --------------------------------------------------

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function titleFromFile(name) {
    return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || name;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60);
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  }

  function setStatus(message, isError = false) {
    const status = $("mw-status");
    if (!status) return;
    status.textContent = message;
    status.style.color = isError ? "#d66b91" : "";
  }

  function makeId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const random = Math.random() * 16 | 0;
      return (char === "x" ? random : (random & 3 | 8)).toString(16);
    });
  }

  function safeFileName(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  function findFirst(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  // --------------------------------------------------
  // 3. CREATE THE ACCOUNT AND LIBRARY INTERFACE
  // --------------------------------------------------

  function addStyles() {
    if ($("mw-added-styles")) return;

    const style = document.createElement("style");
    style.id = "mw-added-styles";
    style.textContent = `
      #mw-app {
        margin: 18px auto;
        max-width: 1000px;
        padding: 18px;
        color: inherit;
        font-family: inherit;
      }
      #mw-app * { box-sizing: border-box; }
      .mw-panel {
        padding: 20px;
        margin-bottom: 16px;
        border: 1px solid rgba(160,150,220,.35);
        border-radius: 20px;
        background: rgba(135,125,190,.09);
      }
      .mw-panel h2, .mw-panel h3 { margin-top: 0; }
      .mw-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
      }
      .mw-row input, .mw-row select, .mw-panel input {
        min-width: 0;
        max-width: 100%;
      }
      .mw-input {
        display: block;
        width: 100%;
        margin: 8px 0;
        padding: 12px;
        border: 1px solid rgba(150,140,210,.55);
        border-radius: 10px;
        color: inherit;
        background: rgba(255,255,255,.08);
      }
      .mw-btn {
        padding: 10px 14px;
        border: 1px solid rgba(150,140,220,.5);
        border-radius: 12px;
        color: inherit;
        background: rgba(145,130,210,.16);
        cursor: pointer;
        font: inherit;
      }
      .mw-btn:hover { background: rgba(145,130,210,.28); }
      .mw-btn:disabled { opacity: .55; cursor: wait; }
      .mw-muted { opacity: .75; font-size: .92em; }
      .mw-song, .mw-playlist {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        padding: 12px 0;
        border-bottom: 1px solid rgba(150,140,210,.22);
      }
      .mw-song:last-child, .mw-playlist:last-child { border-bottom: 0; }
      .mw-song-title { overflow-wrap: anywhere; font-weight: 600; }
      #mw-status { min-height: 1.4em; margin-top: 10px; }
      #mw-file { width: 100%; margin: 12px 0; }
      #mw-player { width: 100%; margin-top: 12px; }
      #mw-library-empty { opacity: .75; padding: 12px 0; }
      @media (max-width: 540px) {
        #mw-app { padding: 10px; }
        .mw-panel { padding: 14px; }
        .mw-row > * { max-width: 100%; }
      }
    `;
    document.head.appendChild(style);
  }

  function buildInterface() {
    if ($("mw-app")) return;

    addStyles();

    const app = document.createElement("section");
    app.id = "mw-app";
    app.innerHTML = `
      <section class="mw-panel" id="mw-account-panel">
        <h2>☾ Your Moonwave Account</h2>
        <p class="mw-muted">
          Sign in to keep your music library and playlists connected to your account.
        </p>
        <div id="mw-account-form">
          <label for="mw-email">Email address</label>
          <input class="mw-input" id="mw-email" type="email"
            autocomplete="email" placeholder="you@example.com" required />
          <label for="mw-password">Password</label>
          <input class="mw-input" id="mw-password" type="password"
            autocomplete="current-password" placeholder="At least 6 characters" required />
          <div class="mw-row">
            <button class="mw-btn" id="mw-signin" type="button">Sign In</button>
            <button class="mw-btn" id="mw-signup" type="button">Create Account</button>
          </div>
        </div>
        <div id="mw-account-info" hidden>
          <p>Signed in as <strong id="mw-user-email"></strong></p>
          <button class="mw-btn" id="mw-signout" type="button">Sign Out</button>
        </div>
        <p class="mw-muted" id="mw-status" role="status" aria-live="polite"></p>
      </section>

      <section class="mw-panel">
        <h2>♫ My Music</h2>
        <p class="mw-muted">
          Sign in first, then upload audio files. Songs are stored privately in your account.
        </p>
        <input id="mw-file" type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.flac" multiple />
        <div class="mw-row">
          <button class="mw-btn" id="mw-upload" type="button" disabled>Upload Selected Songs</button>
          <button class="mw-btn" id="mw-refresh" type="button" disabled>Refresh Library</button>
        </div>
        <div id="mw-library">
          <p id="mw-library-empty">Sign in to load your music library.</p>
        </div>
        <audio id="mw-player" controls preload="metadata"></audio>
        <p id="mw-now-playing" class="mw-muted">Nothing playing yet</p>
      </section>

      <section class="mw-panel">
        <h2>✧ My Playlists</h2>
        <div class="mw-row">
          <input class="mw-input" id="mw-playlist-name"
            type="text" placeholder="Give your playlist a name" maxlength="80" />
          <button class="mw-btn" id="mw-create-playlist" type="button" disabled>
            Create Playlist
          </button>
        </div>
        <p class="mw-muted">Use the Add to Playlist button beside a song to build a playlist.</p>
        <div id="mw-playlists">
          <p class="mw-muted">Sign in to load your playlists.</p>
        </div>
      </section>
    `;

    // Place our interface near the beginning of the page body.
    document.body.prepend(app);

    // Use the newly created audio element for this connected library.
    // The original player's audio element, if any, remains untouched.
  }

  // --------------------------------------------------
  // 4. ACCOUNT SIGN-IN AND REGISTRATION
  // --------------------------------------------------

  function showAccount(signedInUser) {
    user = signedInUser || null;

    $("mw-account-form").hidden = Boolean(user);
    $("mw-account-info").hidden = !user;
    $("mw-user-email").textContent = user?.email || "";

    $("mw-upload").disabled = !user;
    $("mw-refresh").disabled = !user;
    $("mw-create-playlist").disabled = !user;

    if (!user) {
      songs = [];
      playlists = [];
      currentSongId = null;
      currentPlaylistId = null;
      $("mw-library").innerHTML = '<p id="mw-library-empty">Sign in to load your music library.</p>';
      $("mw-playlists").innerHTML = '<p class="mw-muted">Sign in to load your playlists.</p>';
      $("mw-now-playing").textContent = "Nothing playing yet";
      $("mw-player").pause();
      $("mw-player").removeAttribute("src");
      $("mw-player").load();
      setStatus("Sign in or create an account to get started.");
    }
  }

  async function signIn() {
    const email = $("mw-email").value.trim();
    const password = $("mw-password").value;

    if (!email || !password) {
      setStatus("Enter your email address and password.", true);
      return;
    }

    setStatus("Signing in…");
    const { data, error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus(error.message, true);
      return;
    }

    showAccount(data.user);
    await loadLibrary();
  }

  async function signUp() {
    const email = $("mw-email").value.trim();
    const password = $("mw-password").value;

    if (!email || !password) {
      setStatus("Enter your email address and choose a password.", true);
      return;
    }

    if (password.length < 6) {
      setStatus("Please use a password with at least 6 characters.", true);
      return;
    }

    setStatus("Creating your account…");

    const { data, error } = await db.auth.signUp({ email, password });

    if (error) {
      setStatus(error.message, true);
      return;
    }

    if (data.session && data.user) {
      showAccount(data.user);
      await loadLibrary();
      setStatus("Your account is ready. Welcome to Moonwave!");
    } else {
      setStatus("Check your email for a confirmation link, then come back and sign in.");
    }
  }

  async function signOut() {
    const { error } = await db.auth.signOut();
    if (error) {
      setStatus(error.message, true);
      return;
    }

    showAccount(null);
    setStatus("You have signed out.");
  }

  // --------------------------------------------------
  // 5. LOAD SONGS AND PLAYLISTS FROM SUPABASE
  // --------------------------------------------------

  async function loadLibrary() {
    if (!user) return;

    setStatus("Loading your Moonwave library…");

    const [songResult, playlistResult] = await Promise.all([
      db.from("moonwave_songs")
        .select("id,user_id,title,file_name,storage_path,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),

      db.from("moonwave_playlists")
        .select("id,user_id,name,song_ids,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
    ]);

    if (songResult.error) {
      setStatus("Couldn't load songs: " + songResult.error.message, true);
      return;
    }

    if (playlistResult.error) {
      setStatus("Couldn't load playlists: " + playlistResult.error.message, true);
      return;
    }

    songs = songResult.data || [];
    playlists = playlistResult.data || [];

    renderSongs();
    renderPlaylists();
    setStatus(`Library ready — ${songs.length} song(s), ${playlists.length} playlist(s).`);
  }

  // --------------------------------------------------
  // 6. UPLOAD SONGS TO PRIVATE SUPABASE STORAGE
  // --------------------------------------------------

  async function uploadSelectedSongs() {
    if (!user) {
      setStatus("Sign in before uploading songs.", true);
      return;
    }

    const files = Array.from($("mw-file").files || []);

    if (!files.length) {
      setStatus("Choose one or more audio files first.", true);
      return;
    }

    const button = $("mw-upload");
    button.disabled = true;

    let uploaded = 0;
    let failed = 0;

    for (const file of files) {
      if (!file.type.startsWith("audio/") &&
          !/\.(mp3|m4a|wav|ogg|aac|flac|opus)$/i.test(file.name)) {
        failed++;
        setStatus(`Skipped ${file.name}: it doesn't look like an audio file.`, true);
        continue;
      }

      const id = makeId();
      const path = `${user.id}/${id}-${safeFileName(file.name)}`;

      setStatus(`Uploading ${file.name}…`);

      const { error: storageError } = await db.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "audio/mpeg"
        });

      if (storageError) {
        failed++;
        setStatus(`Couldn't upload ${file.name}: ${storageError.message}`, true);
        continue;
      }

      const { error: rowError } = await db
        .from("moonwave_songs")
        .insert({
          id,
          user_id: user.id,
          title: titleFromFile(file.name),
          file_name: file.name,
          storage_path: path
        });

      if (rowError) {
        // Avoid leaving an unlisted file behind if metadata saving fails.
        await db.storage.from(BUCKET).remove([path]);
        failed++;
        setStatus(`Couldn't save song details for ${file.name}: ${rowError.message}`, true);
        continue;
      }

      uploaded++;
    }

    $("mw-file").value = "";
    button.disabled = false;

    await loadLibrary();

    if (failed === 0) {
      setStatus(`Finished! ${uploaded} song(s) uploaded to your account.`);
    } else {
      setStatus(`Finished with ${uploaded} uploaded and ${failed} unsuccessful. Check the message above.`, true);
    }
  }

  // --------------------------------------------------
  // 7. RENDER AND PLAY SONGS
  // --------------------------------------------------

  function renderSongs() {
    const library = $("mw-library");

    if (!songs.length) {
      library.innerHTML = '<p id="mw-library-empty">Your library is empty. Choose audio files above to add music.</p>';
      return;
    }

    library.innerHTML = songs.map((song) => `
      <div class="mw-song" data-song-id="${escapeHTML(song.id)}">
        <div>
          <div class="mw-song-title">${escapeHTML(song.title)}</div>
          <div class="mw-muted">${escapeHTML(song.file_name)}</div>
        </div>
        <div class="mw-row">
          <button class="mw-btn" type="button" data-play-song="${escapeHTML(song.id)}">Play</button>
          <select class="mw-btn" aria-label="Choose playlist for ${escapeHTML(song.title)}"
            data-playlist-select="${escapeHTML(song.id)}">
            <option value="">Choose playlist…</option>
            ${playlists.map((playlist) => `
              <option value="${escapeHTML(playlist.id)}">${escapeHTML(playlist.name)}</option>
            `).join("")}
          </select>
          <button class="mw-btn" type="button" data-add-song="${escapeHTML(song.id)}">Add to Playlist</button>
          <button class="mw-btn" type="button" data-delete-song="${escapeHTML(song.id)}">Delete</button>
        </div>
      </div>
    `).join("");
  }

  async function playSong(songId) {
    const song = songs.find((item) => item.id === songId);
    if (!song || !user) return;

    setStatus(`Preparing ${song.title}…`);

    const { data, error } = await db.storage
      .from(BUCKET)
      .createSignedUrl(song.storage_path, 60 * 60);

    if (error) {
      setStatus("Couldn't play this song: " + error.message, true);
      return;
    }

    const player = $("mw-player");
    player.src = data.signedUrl;
    currentSongId = song.id;
    $("mw-now-playing").textContent = `Now playing: ${song.title}`;

    try {
      await player.play();
      setStatus(`Playing ${song.title}`);
    } catch (error) {
      setStatus("Press Play on the audio player to start listening.", false);
    }
  }

  async function deleteSong(songId) {
    const song = songs.find((item) => item.id === songId);
    if (!song || !user) return;

    if (!confirm(`Delete "${song.title}" from your Moonwave library?`)) return;

    setStatus(`Deleting ${song.title}…`);

    const { error: storageError } = await db.storage
      .from(BUCKET)
      .remove([song.storage_path]);

    if (storageError) {
      setStatus("Couldn't delete the audio file: " + storageError.message, true);
      return;
    }

    const { error: rowError } = await db
      .from("moonwave_songs")
      .delete()
      .eq("id", song.id)
      .eq("user_id", user.id);

    if (rowError) {
      setStatus("The audio file was removed, but its library entry couldn't be deleted: " + rowError.message, true);
      return;
    }

    for (const playlist of playlists) {
      if ((playlist.song_ids || []).includes(song.id)) {
        const updatedIds = playlist.song_ids.filter((id) => id !== song.id);
        await db.from("moonwave_playlists")
          .update({ song_ids: updatedIds })
          .eq("id", playlist.id)
          .eq("user_id", user.id);
      }
    }

    await loadLibrary();
    setStatus("Song deleted.");
  }

  // --------------------------------------------------
  // 8. PLAYLISTS
  // --------------------------------------------------

  async function createPlaylist() {
    if (!user) return;

    const name = $("mw-playlist-name").value.trim();
    if (!name) {
      setStatus("Enter a name for your playlist first.", true);
      return;
    }

    const { error } = await db.from("moonwave_playlists").insert({
      user_id: user.id,
      name,
      song_ids: []
    });

    if (error) {
      setStatus("Couldn't create playlist: " + error.message, true);
      return;
    }

    $("mw-playlist-name").value = "";
    await loadLibrary();
    setStatus(`Playlist "${name}" created.`);
  }

  async function addSongToPlaylist(songId, playlistId) {
    if (!user || !playlistId) {
      setStatus("Choose a playlist first.", true);
      return;
    }

    const playlist = playlists.find((item) => item.id === playlistId);
    if (!playlist) {
      setStatus("That playlist couldn't be found. Refresh your library and try again.", true);
      return;
    }

    const ids = Array.isArray(playlist.song_ids) ? [...playlist.song_ids] : [];

    if (ids.includes(songId)) {
      setStatus("That song is already in this playlist.");
      return;
    }

    ids.push(songId);

    const { error } = await db.from("moonwave_playlists")
      .update({ song_ids: ids })
      .eq("id", playlist.id)
      .eq("user_id", user.id);

    if (error) {
      setStatus("Couldn't update playlist: " + error.message, true);
      return;
    }

    await loadLibrary();
    setStatus("Song added to playlist.");
  }

  function renderPlaylists() {
    const container = $("mw-playlists");

    if (!playlists.length) {
      container.innerHTML = '<p class="mw-muted">You haven’t made any playlists yet.</p>';
      return;
    }

    container.innerHTML = playlists.map((playlist) => {
      const playlistSongs = (playlist.song_ids || [])
        .map((id) => songs.find((song) => song.id === id))
        .filter(Boolean);

      return `
        <div class="mw-playlist">
          <div>
            <strong>${escapeHTML(playlist.name)}</strong>
            <div class="mw-muted">${playlistSongs.length} song(s)</div>
            <div class="mw-muted">
              ${playlistSongs.map((song) => escapeHTML(song.title)).join(" · ") || "No songs added yet"}
            </div>
          </div>
          <div class="mw-row">
            <button class="mw-btn" type="button" data-play-playlist="${escapeHTML(playlist.id)}">Play Playlist</button>
            <button class="mw-btn" type="button" data-delete-playlist="${escapeHTML(playlist.id)}">Delete Playlist</button>
          </div>
        </div>
      `;
    }).join("");
  }

  async function playPlaylist(playlistId) {
    const playlist = playlists.find((item) => item.id === playlistId);
    if (!playlist) return;

    const firstSongId = (playlist.song_ids || []).find((id) =>
      songs.some((song) => song.id === id)
    );

    if (!firstSongId) {
      setStatus("This playlist is empty. Add a song before playing it.");
      return;
    }

    currentPlaylistId = playlistId;
    await playSong(firstSongId);
  }

  async function deletePlaylist(playlistId) {
    const playlist = playlists.find((item) => item.id === playlistId);
    if (!playlist || !user) return;

    if (!confirm(`Delete the playlist "${playlist.name}"? Your uploaded songs will not be deleted.`)) {
      return;
    }

    const { error } = await db.from("moonwave_playlists")
      .delete()
      .eq("id", playlist.id)
      .eq("user_id", user.id);

    if (error) {
      setStatus("Couldn't delete playlist: " + error.message, true);
      return;
    }

    await loadLibrary();
    setStatus("Playlist deleted.");
  }

  async function playNext() {
    let queue = songs;

    if (currentPlaylistId) {
      const playlist = playlists.find((item) => item.id === currentPlaylistId);
      const ids = playlist?.song_ids || [];
      queue = ids.map((id) => songs.find((song) => song.id === id)).filter(Boolean);
    }

    if (!queue.length) return;

    let index = queue.findIndex((song) => song.id === currentSongId);

    if (shuffle) {
      index = Math.floor(Math.random() * queue.length);
    } else {
      index = (index + 1) % queue.length;
    }

    await playSong(queue[index].id);
  }

  // --------------------------------------------------
  // 9. EVENT LISTENERS
  // --------------------------------------------------

  function connectEvents() {
    $("mw-signin").addEventListener("click", signIn);
    $("mw-signup").addEventListener("click", signUp);
    $("mw-signout").addEventListener("click", signOut);
    $("mw-upload").addEventListener("click", uploadSelectedSongs);
    $("mw-refresh").addEventListener("click", loadLibrary);
    $("mw-create-playlist").addEventListener("click", createPlaylist);

    $("mw-password").addEventListener("keydown", (event) => {
      if (event.key === "Enter") signIn();
    });

    $("mw-library").addEventListener("click", async (event) => {
      const playButton = event.target.closest("[data-play-song]");
      const deleteButton = event.target.closest("[data-delete-song]");
      const addButton = event.target.closest("[data-add-song]");

      if (playButton) {
        await playSong(playButton.dataset.playSong);
      }

      if (deleteButton) {
        await deleteSong(deleteButton.dataset.deleteSong);
      }

      if (addButton) {
        const songId = addButton.dataset.addSong;
        const select = document.querySelector(`[data-playlist-select="${songId}"]`);
        await addSongToPlaylist(songId, select?.value);
      }
    });

    $("mw-playlists").addEventListener("click", async (event) => {
      const playButton = event.target.closest("[data-play-playlist]");
      const deleteButton = event.target.closest("[data-delete-playlist]");

      if (playButton) {
        await playPlaylist(playButton.dataset.playPlaylist);
      }

      if (deleteButton) {
        await deletePlaylist(deleteButton.dataset.deletePlaylist);
      }
    });

    $("mw-player").addEventListener("ended", async () => {
      if (repeat) {
        $("mw-player").currentTime = 0;
        $("mw-player").play();
      } else {
        await playNext();
      }
    });

    // Keep compatibility with common existing controls if they exist.
    const themeButton = $("themeBtn");
    if (themeButton) {
      themeButton.addEventListener("click", () => {
        document.body.classList.toggle("night");
      });
    }

    const oldTabs = document.querySelectorAll(".tab");
    oldTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        oldTabs.forEach((item) => item.classList.toggle("active", item === tab));
        document.querySelectorAll(".view").forEach((view) => {
          view.classList.toggle("active", view.id === tab.dataset.tab);
        });
      });
    });
  }

  // --------------------------------------------------
  // 10. STARTUP
  // --------------------------------------------------

  async function start() {
    buildInterface();
    connectEvents();

    const { data, error } = await db.auth.getSession();

    if (error) {
      setStatus("Couldn't check your session: " + error.message, true);
      showAccount(null);
      return;
    }

    const sessionUser = data.session?.user || null;
    showAccount(sessionUser);

    if (sessionUser) {
      await loadLibrary();
    }

    db.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user || null;

      if (nextUser?.id !== user?.id) {
        showAccount(nextUser);
        if (nextUser) {
          // Let the current auth callback finish before requesting data.
          setTimeout(() => loadLibrary(), 0);
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
