// Order = preference. MP4 supported in Chrome 126+; OGV is not supported by MediaRecorder.
const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1,opus',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

let recorder = null;
let chunks = [];
let stream = null;
let audioCtx = null;
let micStream = null;

function pickMime() {
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
}

async function start(streamId, useMic) {
  if (recorder) return { error: 'Already recording' };
  const mimeType = pickMime();
  if (!mimeType) return { error: 'No supported recording format' };

  const constraint = { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } };
  stream = await navigator.mediaDevices.getUserMedia({ audio: constraint, video: constraint });

  // tabCapture mutes the tab for the user; route audio back to speakers.
  // Mix tab audio + microphone into one track for the recording.
  audioCtx = new AudioContext();
  const mixDest = audioCtx.createMediaStreamDestination();
  const tabSrc = audioCtx.createMediaStreamSource(stream);
  tabSrc.connect(audioCtx.destination);
  tabSrc.connect(mixDest);

  let micOk = false;
  if (useMic) try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    // Mic goes only to the recording, never to speakers (avoids echo).
    audioCtx.createMediaStreamSource(micStream).connect(mixDest);
    micOk = true;
  } catch (e) {
    console.warn('Microphone unavailable:', e.message);
  }

  const recStream = new MediaStream([
    ...stream.getVideoTracks(),
    ...mixDest.stream.getAudioTracks(),
  ]);

  chunks = [];
  recorder = new MediaRecorder(recStream, {
    mimeType,
    videoBitsPerSecond: 5_000_000,
    audioBitsPerSecond: 128_000,
  });
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.onstop = finish;
  stream.getVideoTracks()[0].onended = () => {
    if (recorder?.state === 'recording') {
      recorder.stop();
      chrome.runtime.sendMessage({ type: 'recording-ended' });
    }
  };
  recorder.start(1000);
  return { mimeType, mic: micOk };
}

function finish() {
  const type = recorder.mimeType || 'video/webm';
  const ext = type.includes('mp4') ? 'mp4' : 'webm';
  const blob = new Blob(chunks, { type });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  stream.getTracks().forEach((t) => t.stop());
  micStream?.getTracks().forEach((t) => t.stop());
  audioCtx?.close();
  recorder = stream = audioCtx = micStream = null;
  chunks = [];
  chrome.runtime.sendMessage({ type: 'save', url, filename: `tab-recording-${stamp}.${ext}` });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'offscreen-start') {
    start(msg.streamId, msg.mic).then(sendResponse).catch((e) => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'offscreen-stop') {
    if (recorder?.state === 'recording') recorder.stop();
    sendResponse({});
  }
});
