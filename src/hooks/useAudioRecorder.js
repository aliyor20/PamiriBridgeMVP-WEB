import { useState, useRef, useCallback } from 'react';

export function useAudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [audioBlob, setAudioBlob] = useState(null);
    const [stream, setStream] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const startRecording = useCallback(async () => {
        try {
            const currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(currentStream);

            // Compress audio to ~32kbps
            const options = { audioBitsPerSecond: 32000 };

            // Try to find a supported mimetype
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                options.mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/mp4;codecs=mp4a')) {
                // iOS fallback (often uses mp4a for AAC)
                options.mimeType = 'audio/mp4;codecs=mp4a';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                options.mimeType = 'audio/mp4';
            }

            const mediaRecorder = new MediaRecorder(currentStream, options);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const mimeType = mediaRecorder.mimeType || 'audio/webm';
                const blob = new Blob(audioChunksRef.current, { type: mimeType });
                const url = URL.createObjectURL(blob);
                setAudioBlob(blob);
                setAudioUrl(url);

                // Keep the stream alive briefly if needed by waveform component, but generally we stop tracks to turn off the red dot
                currentStream.getTracks().forEach(track => track.stop());
                setStream(null);
            };

            mediaRecorder.start(100); // collect 100ms chunks
            setIsRecording(true);
            setAudioUrl(null);
            setAudioBlob(null);

        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Microphone access is required to record audio.");
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, []);

    const clearRecording = useCallback(() => {
        setAudioUrl(null);
        setAudioBlob(null);
        audioChunksRef.current = [];
    }, []);

    return {
        isRecording,
        audioUrl,
        audioBlob,
        stream,
        startRecording,
        stopRecording,
        clearRecording
    };
}
