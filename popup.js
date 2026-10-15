const btn = document.getElementById('toggle');
const statusEl = document.getElementById('status');
const micEl = document.getElementById('mic');

function render(recording, info = '') {
  btn.textContent = recording ? 'Stop & save' : 'Start recording';
  btn.classList.toggle('stop', recording);
  statusEl.textContent = info;
}

async function init() {
  const { recording } = await chrome.runtime.sendMessage({ type: 'get-state' });
  const { mic = true } = await chrome.storage.local.get('mic');
  micEl.checked = mic;
  micEl.disabled = recording;
  render(recording, recording ? 'Recording…' : '');
}

micEl.addEventListener('change', () => chrome.storage.local.set({ mic: micEl.checked }));

btn.addEventListener('click', async () => {
  btn.disabled = true;
  try {
    const { recording } = await chrome.runtime.sendMessage({ type: 'get-state' });
    if (recording) {
      await chrome.runtime.sendMessage({ type: 'stop' });
      micEl.disabled = false;
      render(false, 'Saving…');
    } else {
      const useMic = micEl.checked;
      const mic = useMic ? await navigator.permissions.query({ name: 'microphone' }) : null;
      if (mic?.state === 'prompt') {
        // The action popup can't show the permission prompt; use a small popup window once.
        await chrome.windows.create({
          url: chrome.runtime.getURL('permission.html'),
          type: 'popup',
          width: 420,
          height: 260,
        });
        window.close();
        return;
      }
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      // streamId must be requested here: popup open grants activeTab.
      const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
      const res = await chrome.runtime.sendMessage({ type: 'start', streamId, mic: useMic });
      if (res?.error) throw new Error(res.error);
      micEl.disabled = true;
      render(true, `Recording… (${res.mimeType})${res.mic ? '' : ' — no mic'}`);
    }
  } catch (e) {
    statusEl.textContent = e.message;
  } finally {
    btn.disabled = false;
  }
});

init();
