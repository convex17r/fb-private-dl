<p align="center">
   <img width="600" height="243" alt="privatefbvideodlp" src="https://github.com/user-attachments/assets/2ac519de-7fc0-4824-9c3d-4d4c54189cfb" />
</p>

<h1 align="center">fb-private-dlp project</h1>

<p align="center"><b>Download Private Facebook Group, Page, Profile media [Bulk]; with auto-file naming.</b></p>

<p align="center">
  <img src="https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Windows" />
  <img src="https://img.shields.io/badge/macOS-000000?style=for-the-badge&logo=apple&logoColor=white" alt="macOS" />
  <img src="https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Linux" />
  <img src="https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white" alt="Facebook" />
  <img src="https://img.shields.io/badge/yt--dlp-E10600?style=for-the-badge" alt="yt-dlp" />
</p>

<p align="center"><i>uses yt-dlp, aria2c*, ffmpeg.</i></p>

<p align="center">[Virustotal Scan Link]</p>

<p align="center">Supported OS: <b>[macOS, Linux, Windows]</b></p>
<p align="center">
  <img width="489" height="190" alt="image" src="https://github.com/user-attachments/assets/be013563-4963-4ef5-a1dd-e9846808d8ba" />
</p>

---

## ⚙ Usage:

1. [Installing Tools](#1-install-the-tools)

2. [Cookie Usage](#2-set-up-cookies-required-for-private-media)

    A. [Get COOKIES.TXT Locally](#a-cookiestxt)

    B. [Browser cookie export](#b-browser-cookie)

3. [Console Run](#3-load-the-console-script)

---

## 1. Install the tools

Install **yt-dlp**, **ffmpeg**, and **aria2c** _(optional, faster downloads)_.

<details open>
<summary><b>Windows (PowerShell)</b></summary>
<br />

<p align="center">
  <img width="151" height="147" alt="image" src="https://github.com/user-attachments/assets/f6e1bf0b-e3a0-4dde-a183-41b43d38b09f" />
</p>

```powershell
winget install -e --id yt-dlp.yt-dlp
winget install -e --id Gyan.FFmpeg
winget install -e --id aria2.aria2
```

**Verify (run these):**

```powershell
yt-dlp --version
ffmpeg -version
```

</details>

<details open>
<summary><b>macOS (Terminal)</b></summary>
<br />

<p align="center">
  <img width="135" height="137" alt="image" src="https://github.com/user-attachments/assets/3a4d46cc-c02e-4f8a-83d1-3c7c4f60d3e4" />
</p>

```bash
brew install yt-dlp ffmpeg aria2
```

**Verify (run these):**

```bash
yt-dlp --version
ffmpeg -version
```

</details>

<details open>
<summary><b>Linux</b></summary>
<br />

<p align="center">
  <img width="131" height="132" alt="image" src="https://github.com/user-attachments/assets/87c27159-7201-414e-b896-da47605b1eba" />
</p>

```bash
sudo apt update && sudo apt install -y yt-dlp ffmpeg aria2
```

Verify:

```bash
yt-dlp --version
ffmpeg -version
```

</details>

---

## 2. Set up cookies (required for private media)

yt-dlp must have proof for Facebook that you are logged in.

| Method | How |
| ------ | --- |
| **A. cookies.txt file**<a id="a-cookiestxt"></a> (most reliable) | Install the [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/cclelndahbckbenkjhflpdbgdldlbecc) browser extension → open `facebook.com` → export → save as `cookies.txt` next to the downloaded `.bat` file, then choose `cookies.txt file` in the panel. |
| **B. Read from browser (fastest) (recommended)**<a id="b-browser-cookie"></a> | In the script panel, pick the browser you are logged in with. **Close that browser** before running the `.bat` (Chrome / Edge / Brave lock their cookie database while running; **Firefox does not need closing**). |

> [!WARNING]
> Sometimes in **Method B** **eset-Antivirus's** **Advanced Browser Data Protection** may block the cookies from being accessed by `yt-dlp`; go to ESET Dashboard → Click <kbd>F5</kbd> → Go to <kbd>Browser Protection</kbd> → Turn off <kbd>Advanced Data Protection</kbd>
>
> <img width="400" height="275" alt="image" src="https://github.com/user-attachments/assets/a7b6bd3e-f7b0-4cce-9f1c-25445cf5de64" />

---

## 3. Load the console script

1. Login to the Facebook account from where you can access the private media
2. Open console by clicking <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>I</kbd> or simply press <kbd>F12</kbd> button
3. Open the [`fb-private-dlp.js`](./fb-private-dlp.js) in Notepad and **copy** the script → **Paste** it in your browser site console
4. Hit <kbd>Enter</kbd>.

> **Refreshing** the site will **remove** the progress of captured media links.

---
