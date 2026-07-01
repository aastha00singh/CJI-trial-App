import { useState, useEffect, useRef } from 'react';

/**
 * Hook wrapping browser native Web Speech API (webkitSpeechRecognition)
 * to provide continuous speech-to-text.
 */
const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const shouldBeListeningRef = useRef(false);

  useEffect(() => {
    // Check browser compatibility
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    // Set to true so we get instantaneous feedback on screen
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => {
          // Join transcripts without double-spacing
          const cleanPrev = prev.trim();
          return cleanPrev ? `${cleanPrev} ${finalTranscript.trim()}` : finalTranscript.trim();
        });
      }
    };

    recognition.onend = () => {
      // Auto-restart if browser arbitrarily timed out but we want to remain active
      if (shouldBeListeningRef.current) {
        try {
          recognition.start();
        } catch (err) {
          console.warn('Speech recognition failed to auto-restart:', err.message);
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error event:', event.error);
      if (event.error === 'no-speech') {
        // 'no-speech' triggers periodically if user goes silent. Ignore it to maintain connection.
        return;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldBeListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setTranscript('');
    shouldBeListeningRef.current = true;
    try {
      recognitionRef.current.start();
      setIsListening(true);
      console.log('[SpeechRecognition] Started listening...');
    } catch (e) {
      console.error('Failed to start speech recognition:', e.message);
    }
  };

  const stopListening = () => {
    shouldBeListeningRef.current = false;
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
      setIsListening(false);
      console.log('[SpeechRecognition] Stopped listening.');
    } catch (e) {
      console.error('Failed to stop speech recognition:', e.message);
    }
  };

  const resetTranscript = () => {
    setTranscript('');
  };

  return {
    transcript,
    isListening,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  };
};

export default useSpeechRecognition;
