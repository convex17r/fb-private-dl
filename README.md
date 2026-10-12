# fb-private-dl project

Download Private Facebook Group, Page, Profile media [one click].

--------------------------
_uses yt-dlp, aria2c*, ffmpeg._

- Supported OS: **[macOS, Linux, Windows]**
<img width="489" height="190" alt="image" src="https://github.com/user-attachments/assets/be013563-4963-4ef5-a1dd-e9846808d8ba" />

----------------------------
## ⬇ Installation


## 1. Install the tools

Install **yt-dlp _(nightly)_**, **ffmpeg**, and **aria2c** _(optional, faster downloads)_.

-----------------------------
-----------------------------

<img width="151" height="147" alt="image" src="https://github.com/user-attachments/assets/f6e1bf0b-e3a0-4dde-a183-41b43d38b09f" />

### Windows (PowerShell)

```powershell
winget install -e --id yt-dlp.yt-dlp
yt-dlp --update-to nightly
winget install -e --id Gyan.FFmpeg
winget install -e --id aria2.aria2
```

**Verify (run these):**

```powershell
yt-dlp --version
ffmpeg -version
```
---------------------------
<img width="135" height="137" alt="image" src="https://github.com/user-attachments/assets/3a4d46cc-c02e-4f8a-83d1-3c7c4f60d3e4" />

### macOS (Terminal)

```bash
brew install yt-dlp ffmpeg aria2
yt-dlp --update-to nightly
```

**Verify (run these):**

```bash
yt-dlp --version
ffmpeg -version
```

------------------------------

<img width="131" height="132" alt="image" src="https://github.com/user-attachments/assets/87c27159-7201-414e-b896-da47605b1eba" />

### Linux (Terminal, Debian / Ubuntu)

```bash
sudo apt update && sudo apt install -y yt-dlp ffmpeg aria2
yt-dlp --update-to nightly
```

Verify:

```bash
yt-dlp --version
ffmpeg -version
```

--------------------------------------------------------------

---

## 2. Set up cookies (required for private groups)

yt-dlp must prove to Facebook that you are logged in. Pick **one** method:

| Method | How |
| ------ | --- |
| **A. cookies.txt file** (most reliable) | Install the **Get cookies.txt LOCALLY** browser extension → open `facebook.com` → export → save as `cookies.txt` next to the downloaded `.bat` file, then choose `cookies.txt file` in the panel. |
| **B. Read from browser** | In the panel, pick the browser you are logged in with. **Close that browser** before running the `.bat` (Chrome / Edge / Brave lock their cookie database while running; Firefox does not need closing). |

---

## 3. Load the console script

1. Open the private Facebook group and stay on the **feed**.
2. Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>J</kbd> to open DevTools Console.
3. Paste the full contents of [`FBGroupDownloaderConsole.fixed.js`](./FBGroupDownloaderConsole.fixed.js)
   and press <kbd>Enter</kbd>.
4. The **FB PRIVATE VIDEO DL** panel appears top-right. Confirm it auto-selected
   your browser under **COOKIES SOURCE** (change it if needed) and leave
   **IMPERSONATE AS** on `firefox`.

> [!WARNING]
> Re-pasting the script is safe — it cleans up the previous panel and keeps your
> already-captured list.
