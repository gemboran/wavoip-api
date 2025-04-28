import WebSocket from 'ws';

export async function getSignedUrl() {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${process.env.ELEVENLABS_AGENT_ID}`,
    {
      method: 'GET',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get signed URL: ${response.statusText}`);
  }

  const data = await response.json();
  return data.signed_url;
}

export async function setupElevenLabs(deviceEmitter, socket) {
  const signedUrl = await getSignedUrl();
  const elevenLabsWs = new WebSocket(signedUrl);

  elevenLabsWs.on('open', () => {
    console.log('[ElevenLabs] Connected to Conversational AI');
    deviceEmitter.emit('microphone_audioctx_change_state', {
      state: 'connected',
    });
  });

  elevenLabsWs.on('message', (data) => {
    const message = JSON.parse(data);
    if (message.type === 'audio') {
      socket.socket_audio_transport.volatile
        .timeout(250)
        .emit('microphone_buffer', message.audio.chunk);
    }
  });

  elevenLabsWs.on('close', () => {
    console.log('[ElevenLabs] Disconnected');
    deviceEmitter.emit('microphone_audioctx_change_state', {
      state: 'disconnected',
    });
  });

  elevenLabsWs.on('error', (error) => {
    console.error('[ElevenLabs] WebSocket error:', error);
  });

  return elevenLabsWs;
}
