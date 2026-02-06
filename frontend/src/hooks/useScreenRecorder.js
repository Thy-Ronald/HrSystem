import { useState, useRef, useCallback } from 'react';

export function useScreenRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    const startRecording = useCallback((stream, filenamePrefix = 'recording') => {
        if (!stream || !stream.active) {
            console.error("No active stream provided for recording");
            return;
        }

        try {
            // Use standard webm mime type
            const options = { mimeType: 'video/webm;codecs=vp9' };
            // Fallback if vp9 not supported
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm;codecs=vp8';
            }
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm';
            }

            const recorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);

                // Auto-download
                const a = document.createElement('a');
                document.body.appendChild(a);
                a.style = 'display: none';
                a.href = url;
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                a.download = `${filenamePrefix}-${timestamp}.webm`;
                a.click();

                // Cleanup
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                chunksRef.current = [];
            };

            recorder.start(1000); // Collect 1s chunks
            setIsRecording(true);
            setRecordingTime(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error("Failed to start recording:", error);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, []);

    // Formatting helper
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return {
        isRecording,
        recordingTime,
        formattedTime: formatTime(recordingTime),
        startRecording,
        stopRecording
    };
}
