import React, { useRef, useEffect, useState } from 'react';
import { Play, Square } from 'lucide-react';

export default function AudioWaveform({ stream, audioUrl, onAudioEnd }) {
    const canvasRef = useRef(null);
    const audioRef = useRef(null);
    const audioCtxRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    const animationRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const initAudio = async () => {
            if (!stream && !audioUrl) return;

            // Initialize AudioContext only after user interaction or when we have a stream
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!audioCtxRef.current) {
                audioCtxRef.current = new AudioContext();
            }

            if (audioCtxRef.current.state === 'suspended') {
                await audioCtxRef.current.resume();
            }

            if (!analyserRef.current) {
                analyserRef.current = audioCtxRef.current.createAnalyser();
                analyserRef.current.fftSize = 256;
            }

            // Cleanup previous source
            if (sourceRef.current) {
                sourceRef.current.disconnect();
            }

            if (stream) {
                // Live Recording Mode
                sourceRef.current = audioCtxRef.current.createMediaStreamSource(stream);
                sourceRef.current.connect(analyserRef.current);
                drawWaveform();
            } else if (audioUrl && audioRef.current) {
                // Playback Mode
                try {
                    sourceRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current);
                    sourceRef.current.connect(analyserRef.current);
                    analyserRef.current.connect(audioCtxRef.current.destination);
                } catch (e) {
                    console.error("Audio Routing Error (Already connected?):", e);
                }
            }
        };

        initAudio();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (sourceRef.current) sourceRef.current.disconnect();
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
                // don't close context on every re-render, keep it alive if possible or let GC handle
            }
        };
    }, [stream, audioUrl]);

    const drawWaveform = () => {
        if (!canvasRef.current || !analyserRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyserRef.current.getByteTimeDomainData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.lineWidth = 2;

            // Create gradient
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            gradient.addColorStop(0, '#00897b');
            gradient.addColorStop(1, '#ff5252'); // Pomegranate red
            ctx.strokeStyle = gradient;

            ctx.beginPath();
            const sliceWidth = canvas.width * 1.0 / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * (canvas.height / 2);

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
                x += sliceWidth;
            }

            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        };

        draw();
    };

    const togglePlayback = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!audioRef.current) return;

        if (audioCtxRef.current?.state === 'suspended') {
            await audioCtxRef.current.resume();
        }

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
            drawWaveform();
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        if (onAudioEnd) onAudioEnd();

        // Reset canvas line
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#00897b';
            ctx.beginPath();
            ctx.moveTo(0, canvasRef.current.height / 2);
            ctx.lineTo(canvasRef.current.width, canvasRef.current.height / 2);
            ctx.stroke();
        }
    };

    return (
        <div className="glass-panel" style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            borderRadius: '16px',
            gap: '12px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)'
        }}>
            {audioUrl && (
                <button
                    onClick={togglePlayback}
                    style={{
                        background: 'var(--color-primary)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer'
                    }}
                >
                    {isPlaying ? <Square size={16} fill="white" /> : <Play size={16} fill="white" style={{ marginLeft: 2 }} />}
                </button>
            )}

            <div style={{ flex: 1, position: 'relative', height: '40px' }}>
                <canvas
                    ref={canvasRef}
                    width={200}
                    height={40}
                    style={{
                        width: '100%',
                        height: '100%',
                        opacity: (stream || isPlaying) ? 1 : 0.5,
                        transition: 'opacity 0.3s ease'
                    }}
                />
            </div>

            {audioUrl && (
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={handleEnded}
                    preload="metadata"
                    crossOrigin="anonymous" // Required to avoid CORS issues with Web Audio API if hosted externally
                    style={{ display: 'none' }}
                />
            )}
        </div>
    );
}
