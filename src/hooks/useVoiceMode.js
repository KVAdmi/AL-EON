import { useState, useEffect, useRef } from 'react';
import { createVoiceClient, getVoiceClient } from '@/voice/voiceClient';

/**
 * useVoiceMode - Hook delgado que delega la grabación a src/voice/voiceClient.ts
 * - No contiene lógica de MediaRecorder
 * - Solo maneja estado y callbacks para la UI
 */
export function useVoiceMode(options = {}) {
	const {
		accessToken = null,
		sessionId = null,
		enabled = false,
		ttsGender = 'female',
		onResponse = () => {},
		onError = () => {},
		handsFreeEnabled = false
	} = options;

	const [mode, setMode] = useState('text'); // 'text' | 'voice'
	const [state, setState] = useState('idle'); // from VoiceState
	const [transcript, setTranscript] = useState('');
	const [error, setError] = useState(null);

	const clientRef = useRef(null);

	useEffect(() => {
		if (!enabled) {
			// Ensure any existing client is reset
			const existing = getVoiceClient();
			if (existing) existing.reset();
			clientRef.current = null;
			return;
		}

		// Crear cliente y registrar callbacks
		const client = createVoiceClient({
			onStateChange: (s) => setState(s),
			onAudioReady: async (blob) => {
				setState('uploading');
				try {
					// Enviar audio al backend usando el propio cliente
					const data = await client.sendAudio(blob, accessToken);
					const text = data?.text || data?.transcript || '';
					if (text) {
						setTranscript(text);
						onResponse(text);
					} else {
						const err = new Error('No se recibió transcripción del servidor');
						setError(err);
						onError(err);
					}
				} catch (err) {
					setError(err);
					onError(err);
				} finally {
					setState('idle');
				}
			},
			onError: (err) => {
				setError(err);
				onError(err);
			}
		});

		clientRef.current = client;

		return () => {
			try {
				client.reset();
			} catch (e) {
				// ignore
			}
			clientRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabled, accessToken]);

	const startRecording = async () => {
		if (!enabled) {
			const err = new Error('Voice mode is disabled');
			setError(err);
			onError(err);
			return;
		}

		try {
			setError(null);
			setTranscript('');
			setState('recording');
			setMode('voice');
			if (!clientRef.current) {
				clientRef.current = createVoiceClient({
					onStateChange: (s) => setState(s),
					onAudioReady: async (blob) => {
						setState('uploading');
						try {
							const data = await clientRef.current.sendAudio(blob, accessToken);
							const text = data?.text || data?.transcript || '';
							if (text) {
								setTranscript(text);
								onResponse(text);
							} else {
								const err = new Error('No se recibió transcripción del servidor');
								setError(err);
								onError(err);
							}
						} catch (err) {
							setError(err);
							onError(err);
						} finally {
							setState('idle');
						}
					},
					onError: (err) => {
						setError(err);
						onError(err);
					}
				});
			}

			await clientRef.current.startRecording();
		} catch (err) {
			setError(err);
			onError(err);
			setState('error');
		}
	};

	const stopRecording = () => {
		try {
			clientRef.current?.stopRecording();
			setMode('text');
		} catch (err) {
			setError(err);
			onError(err);
			setState('error');
		}
	};

	const clear = () => {
		setTranscript('');
		setError(null);
		setState('idle');
	};

	return {
		mode,
		setMode,
		state,
		transcript,
		error,
		isSupported: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
		startRecording,
		stopRecording,
		clear,
		handsFreeEnabled
	};
}
