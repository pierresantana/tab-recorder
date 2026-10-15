const OFFSCREEN_URL = 'offscreen.html';

async function hasOffscreen() {
  const ctx = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  return ctx.length > 0;
}

async function ensureOffscreen() {
  if (await hasOffscreen()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ['USER_MEDIA'],
    justification: 'Record tab audio and video with MediaRecorder',
  });
}

async function setRecording(recording) {
  await chrome.storage.session.set({ recording });
  await chrome.action.setBadgeText({ text: recording ? 'REC' : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#d32f2f' });
}

async function isRecording() {
  const { recording } = await chrome.storage.session.get('recording');
  return !!recording;
}

async function download(url, filename) {
  let id;
  try {
    id = await chrome.downloads.download({ url, filename, saveAs: false });
  } catch (e) {
    // Release the blob (and its memory) if the download never started.
    if (await hasOffscreen()) await chrome.offscreen.closeDocument();
    throw e;
  }
  // Keep offscreen doc (owner of the blob URL) alive until the file is written.
  const onChanged = async (delta) => {
    if (delta.id !== id || !delta.state) return;
    if (delta.state.current === 'complete' || delta.state.current === 'interrupted') {
      chrome.downloads.onChanged.removeListener(onChanged);
      if (await hasOffscreen()) await chrome.offscreen.closeDocument();
    }
  };
  chrome.downloads.onChanged.addListener(onChanged);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;
  (async () => {
    switch (msg.type) {
      case 'get-state':
        return { recording: await isRecording() };
      case 'start': {
        await ensureOffscreen();
        const res = await chrome.runtime.sendMessage({ type: 'offscreen-start', streamId: msg.streamId, mic: msg.mic !== false });
        if (res?.error) return { error: res.error };
        await setRecording(true);
        return { mimeType: res.mimeType, mic: res.mic };
      }
      case 'stop':
        try {
          await chrome.runtime.sendMessage({ type: 'offscreen-stop' });
        } catch (_) {
          // Offscreen doc gone: nothing left to stop, just reset state.
          if (await hasOffscreen()) await chrome.offscreen.closeDocument();
        }
        await setRecording(false);
        return {};
      case 'recording-ended': // tab closed / stream ended on its own
        await setRecording(false);
        return {};
      case 'save':
        if (typeof msg.url !== 'string' || !msg.url.startsWith(`blob:${chrome.runtime.getURL('')}`)) {
          return { error: 'Invalid download URL' };
        }
        await download(msg.url, msg.filename);
        return {};
    }
  })().then(sendResponse).catch((e) => sendResponse({ error: e.message }));
  return true;
});
