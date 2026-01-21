import { useCallback, useRef, useEffect } from 'react';

type SwipeDirection = 'left' | 'right' | 'down';

// Sound URLs - using free mechanical sound effects
const SOUND_URLS = {
  right: 'https://freesound.org/data/previews/220/220206_3890806-lq.mp3', // gear click
  left: 'https://freesound.org/data/previews/170/170229_2159766-lq.mp3', // mechanical release
  down: 'https://freesound.org/data/previews/351/351565_5477037-lq.mp3', // gear spin
};

// Vibration patterns (in milliseconds)
const VIBRATION_PATTERNS = {
  right: [50, 30, 100], // short-pause-long for success
  left: [30, 20, 30], // quick double tap for reject
  down: [20, 10, 20, 10, 20], // triple tap for skip
};

export const useSwipeFeedback = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Map<SwipeDirection, AudioBuffer>>(new Map());
  const isLoadedRef = useRef(false);

  // Initialize audio context and preload sounds
  useEffect(() => {
    const initAudio = async () => {
      try {
        // Create audio context on user interaction
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        // Preload sounds
        const loadSound = async (direction: SwipeDirection, url: string) => {
          try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
            audioBuffersRef.current.set(direction, audioBuffer);
          } catch (e) {
            console.log(`Could not load sound for ${direction}:`, e);
          }
        };

        await Promise.all([
          loadSound('right', SOUND_URLS.right),
          loadSound('left', SOUND_URLS.left),
          loadSound('down', SOUND_URLS.down),
        ]);
        
        isLoadedRef.current = true;
      } catch (e) {
        console.log('Audio initialization failed:', e);
      }
    };

    // Initialize on first user interaction
    const handleInteraction = () => {
      initAudio();
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('click', handleInteraction);
    };

    document.addEventListener('touchstart', handleInteraction);
    document.addEventListener('click', handleInteraction);

    return () => {
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('click', handleInteraction);
    };
  }, []);

  const triggerVibration = useCallback((direction: SwipeDirection) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(VIBRATION_PATTERNS[direction]);
      } catch (e) {
        // Vibration not supported or failed
      }
    }
  }, []);

  const playSound = useCallback((direction: SwipeDirection) => {
    if (!audioContextRef.current || !isLoadedRef.current) {
      // Fallback: use simple Audio element
      try {
        const audio = new Audio();
        audio.volume = 0.3;
        
        // Use simple beep sounds as fallback
        const oscillator = audioContextRef.current?.createOscillator();
        const gainNode = audioContextRef.current?.createGain();
        
        if (oscillator && gainNode && audioContextRef.current) {
          oscillator.connect(gainNode);
          gainNode.connect(audioContextRef.current.destination);
          
          // Different frequencies for different actions
          oscillator.frequency.value = direction === 'right' ? 800 : direction === 'left' ? 300 : 500;
          oscillator.type = 'square';
          
          gainNode.gain.value = 0.1;
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.15);
          
          oscillator.start();
          oscillator.stop(audioContextRef.current.currentTime + 0.15);
        }
      } catch (e) {
        console.log('Sound fallback failed:', e);
      }
      return;
    }

    const buffer = audioBuffersRef.current.get(direction);
    if (buffer) {
      try {
        const source = audioContextRef.current.createBufferSource();
        const gainNode = audioContextRef.current.createGain();
        
        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
        gainNode.gain.value = 0.4;
        
        source.start(0);
      } catch (e) {
        console.log('Sound playback failed:', e);
      }
    }
  }, []);

  const triggerFeedback = useCallback((direction: SwipeDirection) => {
    triggerVibration(direction);
    playSound(direction);
  }, [triggerVibration, playSound]);

  return { triggerFeedback, triggerVibration, playSound };
};
