import { useCallback, useRef, useEffect, useState } from 'react';

type SwipeDirection = 'left' | 'right' | 'down';

// Free sound effects URLs from Pixabay/Freesound (royalty-free)
const SOUND_LIBRARY = {
  right: [
    // Success/positive mechanical sounds
    'https://cdn.pixabay.com/audio/2022/03/15/audio_7a98d09fce.mp3', // click
    'https://cdn.pixabay.com/audio/2022/10/30/audio_65d9fdc8ec.mp3', // gear
    'https://cdn.pixabay.com/audio/2022/03/24/audio_79a64d8cc3.mp3', // success
  ],
  left: [
    // Reject/negative sounds
    'https://cdn.pixabay.com/audio/2022/03/10/audio_f8c8f67ddd.mp3', // whoosh
    'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3', // swipe
    'https://cdn.pixabay.com/audio/2022/03/15/audio_942e722544.mp3', // brush
  ],
  down: [
    // Skip/neutral sounds  
    'https://cdn.pixabay.com/audio/2022/03/19/audio_d3ded8b6ed.mp3', // pop
    'https://cdn.pixabay.com/audio/2022/01/18/audio_95cc66c2f4.mp3', // soft
    'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3', // click
    'https://cdn.pixabay.com/audio/2022/03/24/audio_dd8d1de282.mp3', // tap
  ],
};

// Vibration patterns (in milliseconds)
const VIBRATION_PATTERNS = {
  right: [50, 30, 100], // short-pause-long for success
  left: [30, 20, 30], // quick double tap for reject
  down: [20, 10, 20, 10, 20], // triple tap for skip
};

export const useSwipeFeedback = () => {
  const audioElements = useRef<Map<string, HTMLAudioElement>>(new Map());
  const soundIndexRef = useRef<{ right: number; left: number; down: number }>({
    right: 0,
    left: 0,
    down: 0,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Preload all sounds
  useEffect(() => {
    const preloadSounds = () => {
      Object.entries(SOUND_LIBRARY).forEach(([direction, urls]) => {
        urls.forEach((url, index) => {
          const key = `${direction}-${index}`;
          if (!audioElements.current.has(key)) {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.volume = 0.3;
            audio.src = url;
            audioElements.current.set(key, audio);
          }
        });
      });
      setIsInitialized(true);
    };

    // Initialize on first user interaction
    const handleInteraction = () => {
      preloadSounds();
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('click', handleInteraction);
    };

    document.addEventListener('touchstart', handleInteraction);
    document.addEventListener('click', handleInteraction);

    // Also try to preload immediately
    preloadSounds();

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
    const sounds = SOUND_LIBRARY[direction];
    const currentIndex = soundIndexRef.current[direction];
    const key = `${direction}-${currentIndex}`;
    
    // Get next sound index (rotate through available sounds)
    soundIndexRef.current[direction] = (currentIndex + 1) % sounds.length;

    const audio = audioElements.current.get(key);
    if (audio) {
      // Reset and play
      audio.currentTime = 0;
      audio.volume = 0.35;
      audio.play().catch(() => {
        // Fallback: create new audio element
        const fallbackAudio = new Audio(sounds[currentIndex]);
        fallbackAudio.volume = 0.35;
        fallbackAudio.play().catch(() => {});
      });
    } else {
      // Fallback if not preloaded
      const fallbackAudio = new Audio(sounds[currentIndex]);
      fallbackAudio.volume = 0.35;
      fallbackAudio.play().catch(() => {});
    }
  }, []);

  const triggerFeedback = useCallback((direction: SwipeDirection) => {
    triggerVibration(direction);
    playSound(direction);
  }, [triggerVibration, playSound]);

  return { triggerFeedback, triggerVibration, playSound, isInitialized };
};
