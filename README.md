# Tab Recorder

A Chrome extension that records the **video and audio of the current tab** — plus your **microphone** — and saves the result as an **MP4** file (with an automatic WebM fallback on older Chrome versions).

Useful for recording video calls (Google Meet, Zoom Web, Teams Web), webinars, demos, and any other tab content.

## Features

- Records tab video and tab audio (e.g. the other participants in a meeting)
- Mixes in your microphone, so your own voice is captured too
- Tab audio keeps playing through your speakers while recording
- Saves as MP4 (H.264 + AAC/Opus) on Chrome 126+, WebM (VP9/VP8 + Opus) otherwise
- `REC` badge on the extension icon while recording
- Recording stops and is saved automatically if the tab is closed
- No servers, no tracking: everything happens locally in your browser

## Requirements

- Google Chrome (or a Chromium-based browser) **116+**
- Chrome **126+** is recommended to get MP4 output

## Installation

Tab Recorder is not on the Chrome Web Store, so you load it as an unpacked extension:

1. Clone or download this repository:
   ```bash
   git clone https://github.com/<your-user>/tab-recorder.git
   ```
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the project folder (the one containing `manifest.json`).
5. (Optional) Click the puzzle icon in the toolbar and pin **Tab Recorder**.

## Usage

1. Open the tab you want to record.
2. Click the **Tab Recorder** icon and press **Start recording**.
3. **First time only:** a small popup window asks for microphone access. Click **Allow** (the window closes by itself), then click the extension icon and press **Start recording** again.
4. The icon shows a red `REC` badge while recording.
5. Click the icon again and press **Stop & save**.
6. The file is saved to your default Downloads folder as `tab-recording-<timestamp>.mp4`.

> If you deny microphone access, recording still works, but only with the tab's audio. The popup shows "no mic" in that case.

### Changing microphone permission later

Go to `chrome://settings/content/microphone` (or the site settings for the extension) and adjust the permission for the extension.

## Permissions explained

| Permission   | Why it is needed                                                      |
| ------------ | --------------------------------------------------------------------- |
| `tabCapture` | Capture the video and audio stream of the active tab                  |
| `offscreen`  | Run `MediaRecorder` in an offscreen document (required by Manifest V3) |
| `downloads`  | Save the finished recording to your computer                          |
| `activeTab`  | Grant capture access to the tab you are on when you click the icon    |
| `storage`    | Remember whether a recording is in progress                           |

The microphone is requested through the standard browser permission prompt.

## How it works

```
popup.js ──(streamId)──▶ background.js ──▶ offscreen.js
                                              │  getUserMedia(tab) + getUserMedia(mic)
                                              │  Web Audio mix ─▶ MediaRecorder
                                              ▼
                          background.js ◀── blob URL ── chrome.downloads
```

- `popup.html` / `popup.js` – start/stop UI; requests the tab `streamId`
- `background.js` – service worker; manages the offscreen document, badge and download
- `offscreen.html` / `offscreen.js` – captures the streams, mixes audio and records
- `permission.html` / `permission.js` – one-time microphone permission page

## Limitations

- **OGV is not supported.** Chrome's `MediaRecorder` cannot produce OGV. If you need it, convert the output with ffmpeg: `ffmpeg -i recording.mp4 recording.ogv`.
- Only one recording at a time.
- Some pages with DRM-protected content (e.g. Netflix) may produce a black video.
- If your Chrome does not support MP4 recording, the file is saved as `.webm`.

## Troubleshooting

| Problem                              | Fix                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| My voice is not in the recording     | Allow the microphone on the permission page, then start a new recording               |
| Output is `.webm` instead of `.mp4`  | Update Chrome to 126 or newer                                                          |
| "Extension has not been invoked..."  | Click the extension icon on the tab you want to record (grants `activeTab`)            |
| Tab is silent while recording        | Reload the extension and start again; tab audio is routed back to your speakers       |
| Nothing is downloaded                | Check Chrome's download settings and that downloads are not blocked                   |

## Development

No build step. Edit the files and click the reload icon for the extension in `chrome://extensions`.

```
.
├── manifest.json
├── background.js
├── offscreen.html
├── offscreen.js
├── popup.html
├── popup.js
├── permission.html
├── permission.js
├── LICENSE
└── icons/
```

## Privacy

Recordings are created and stored locally on your machine. The extension does not send any data anywhere.

## License

[MIT](LICENSE)
