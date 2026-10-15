const msg = document.getElementById('msg');
navigator.mediaDevices.getUserMedia({ audio: true })
  .then((s) => {
    s.getTracks().forEach((t) => t.stop());
    msg.textContent = 'Microphone allowed. You can start recording now.';
    setTimeout(() => window.close(), 1200);
  })
  .catch((e) => {
    msg.textContent = `Microphone blocked (${e.name}). Recording will continue without your voice.`;
    setTimeout(() => window.close(), 3000);
  });
