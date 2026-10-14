<p align="center">
  <img width="600" height="243" alt="privatefbvideodlp" src="https://github.com/user-attachments/assets/2ac519de-7fc0-4824-9c3d-4d4c54189cfb" />
</p>

<h1 align="center">fb-private-dlp project</h1>

<p align="center"><b>Download Private Facebook Group, Page and Profile media [Photo + Video] <br> [⚡ Highest quality downloads] [Bulk + Individual]; with [⚡ auto-file naming capabilities].</br> </b></p>

<p align="center">
  <img src="https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Windows" />
  <img src="https://img.shields.io/badge/macOS-000000?style=for-the-badge&logo=apple&logoColor=white" alt="macOS" />
  <img src="https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Linux" />
  <img src="https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white" alt="Facebook" />
  <img src="https://img.shields.io/badge/yt--dlp-E10600?style=for-the-badge" alt="yt-dlp" />
  <img src="https://img.shields.io/badge/gallery--dl-6f42c1?style=for-the-badge" alt="gallery-dl" />
</p>

<p align="center"><i>uses: <b>yt-dlp</b>, <b>gallery-dl</b>, <b>ffmpeg</b>, and <b>aria2c</b>* </i></p>

<p align="center">
  <a href="https://www.virustotal.com/gui/file/10033ab1954f80cb45aa289663da6e335e48051c6c6f0d379b7245f17f5d465f/detection">🔍 VirusTotal — <code>fb-private-dlp-img.js</code></a>
  &nbsp;•&nbsp;
  <a href="https://www.virustotal.com/gui/file/e9ea75cacc251afdf13dea60e6c6bfc4f7aa9ffa59fa06df8362a4b4bc138cf7/detection">🔍 VirusTotal — <code>fb-private-dlp-vid.js</code></a>
</p>

<p align="center">
  <img width="400" height="101" alt="results" src="https://github.com/user-attachments/assets/9ad030e5-f92a-462d-8616-a04b0c74bc8f"/>
  <img width="400" height="101" alt="results" src="https://github.com/user-attachments/assets/101c2818-1b51-4fc2-ae5e-4bc781ff5989"/>
</p>

<p align="center">Supported OS: <b>[macOS, Linux, Windows] <br /> Checked & Verified running in Windows.</b></p>

<p align="center">
  <img width="489" height="190" alt="image" src="https://github.com/user-attachments/assets/be013563-4963-4ef5-a1dd-e9846808d8ba" />
</p>

<p align="center"> <b>🚧 Coming Soon... [Video Tutorial + Showcase] 🚧</b> </p>

---

## Features

| | |
| :- | :- |
|  **Images (bulk)** | Download all photos uploaded from private groups, pages & individual profiles |
|  **Videos (bulk + click)** | Bulk video download from private groups, profile & pages; also supports selective feed download |
|  **Highest quality** | Downloaded media has the highest possible resolution |
|  **Auto file naming** | Media files are named automatically from the post caption or id; renaming also possible in panel |
|  **Two cookie methods** | `cookies.txt`, or direct cookie import from logged-in browser of choice |
|  **3 OS Supported** | Windows, macOS & Linux supported. [`.bat` / `.command` / `.sh`]  |

---

## Table of Contents

1. [Install the tools](#1-install-the-tools)
2. [Set up cookies (required for private media)](#2-set-up-cookies-required-for-private-media)
   - A. [Get `cookies.txt` locally](#a-cookiestxt)
   - B. [Auto browser cookie import](#b-browser-cookie)
3. [Load the console script](#3-load-the-console-script)
4. [Images — usage](#4-images-usage)
5. [Videos — usage](#5-videos-usage)

---

## 1. Install the tools

| Tool | Job | Need for |
| :- | :- | :- |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | Downloads the videos | 🎬 Videos |
| [ffmpeg](https://github.com/ffmpeg/ffmpeg) | Merges best video + audio streams | 🎬 Videos |
| [aria2c](https://github.com/aria2/aria2) | Speeding up downloads, good for large video downloads *(optional)* | 🎬 Videos |
| [gallery-dl](https://github.com/mikf/gallery-dl) | Downloads the photos | 🖼️ Images |

**Install the download tools with the commands below:**

<details close>
<summary><b>Windows (PowerShell / cmd)</b></summary>
<br />

<p align="left">
  <img width="50" height="47" alt="image" src="https://github.com/user-attachments/assets/f6e1bf0b-e3a0-4dde-a183-41b43d38b09f" />
</p>

```powershell
# videos
winget install -e --id yt-dlp.yt-dlp
winget install -e --id Gyan.FFmpeg
winget install -e --id aria2.aria2

# photos
winget install -e --id mikf.gallery-dl
```

</details>

<details close>
<summary><b>macOS (Terminal)</b></summary>
<br />

<p align="left">
  <img width="50" height="47" alt="image" src="https://github.com/user-attachments/assets/3a4d46cc-c02e-4f8a-83d1-3c7c4f60d3e4" />
</p>

```bash
# videos
brew install yt-dlp ffmpeg aria2

# photos
brew install gallery-dl
```

</details>

<details close>
<summary><b>Linux (Terminal / Shell)</b></summary>
<br />

<p align="left">
  <img width="50" height="47" alt="image" src="https://github.com/user-attachments/assets/87c27159-7201-414e-b896-da47605b1eba" />
</p>

```bash
# videos
sudo apt update && sudo apt install -y yt-dlp ffmpeg aria2

# photos
sudo apt update && sudo apt install -y gallery-dl
# use pip instead if your distro has no apt-package:
python3 -m pip install --user gallery-dl
```

</details>

----

**Verify installation:**

```bash
yt-dlp --version
ffmpeg -version
gallery-dl --version
```


---

## 2. Set up cookies (required for private media)

The downloader (`yt-dlp` & `gallery-dl`) needs proof for Facebook that you are logged in — **cookies 🍪 are your proof**.

| Method | How |
| :- | :- |
| **A. `cookies.txt` file** <a id="a-cookiestxt"></a> *(most reliable)* | Install the [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/cclelndahbckbenkjhflpdbgdldlbecc) browser extension → open `facebook.com` → export → save as `cookies.txt` next to the downloaded script file, then choose `cookies.txt` file in the panel. |
| **B. Read from browser** <a id="b-browser-cookie"></a> *(fastest — recommended)* | In the script panel ([how to run the script?](#3-load-the-console-script)) pick the browser you are logged in with. **Completely close that browser** before running the script file (Chrome / Edge / Brave lock their cookie database while running — **Firefox does not need closing**). |

> [!WARNING]
> With [Method B](#b-browser-cookie), **ESET Antivirus's Advanced Browser Data Protection** may block access to the cookies.
>
> Go to: **ESET Dashboard** → press <kbd>F5</kbd> → **Browser Protection** → turn off **Advanced Data Protection**.
>
> <p><img width="400" height="275" alt="image" src="https://github.com/user-attachments/assets/a7b6bd3e-f7b0-4cce-9f1c-25445cf5de64" /></p>

---

## 3. Load the console script

Follow these steps — or [watch the video tutorial / showcase](https://youtube.com/watch?v=xxxxxxxx):

1. **Log in** to the Facebook account that has access to the private media.
2. Go to the **Media Tab** *(for bulk download: img + vid)* or your **Feed** *(for selective click download: vid only)*.
3. Open the console with <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>I</kbd>, or just press <kbd>F12</kbd>.
4. Open the script in Notepad, **copy** it, and **paste** it into the site console:
   - image-dl: [`fb-private-dlp-img.js`](./fb-private-dlp-img.js)
   - video-dl: [`fb-private-dlp-vid.js`](./fb-private-dlp-vid.js)
5. Hit <kbd>Enter</kbd> — the panel appears on the right side. Pick **CLICK MODE** *(vid-dl script only)* or **BULK MODE** *(img + vid script)*, choose your **COOKIES SOURCE** per the [earlier discussion](#2-set-up-cookies-required-for-private-media), then click the **download** button.
6. Move the downloaded `fb-private-dlp-xxxx` file into the **folder** where you want the media, *(keep `cookies.txt` next to it if you picked [Method A](#a-cookiestxt))* and double-click run it:

> [!NOTE]
> If any error shows up: first make sure the required tools are installed properly: **yt-dlp + ffmpeg** (+ optional **aria2c**) for videos, **gallery-dl** for images — see [Install the tools section](#1-install-the-tools).
> 
> **Refreshing** the page will **remove** the progress of captured media links.


---

## 4. Images — usage <a id="4-images-usage"></a>

<p align="center"><img width="1150" height="553" alt="grpimgdemogif" src="./assets/group_imgdemo.gif" /></p>
<p align="center"><i><b>This demo shows a public profile and group; private profiles and groups work too.</i></b></p>

<p align="center"><img width="1150" height="553" alt="profimgdemogif" src="./assets/profilepage_imgdemo.gif" /></p>
<p align="center"><i> <b> After this, run the downloaded file in the target folder.</i></b></p>

---

## 5. Videos — usage <a id="5-videos-usage"></a>

<p align="center"><img width="1150" height="553" alt="bulkvidgrp" src="./assets/group_viddemobulk.gif" /></p>
<p align="center"><i><b>Bulk mode: grabs every video from the media tab.</i></b></p>

<p align="center"><img width="1150" height="553" alt="clickvidgrp" src="./assets/group_viddemoclick.gif" /></p>
<p align="center"><i><b>Click mode: captures media links from feed clicks.</i></b></p>

---

<p align="right"> <sub><i> P.S. Special Thanks to OC Zen for help in this project. </i></sub> </p>
