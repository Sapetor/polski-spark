// Audio utilities for Polish language learning
class AudioUtils {
  constructor() {
    this.synthesis = window.speechSynthesis;
    this.recognition = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.currentAudio = null;

    // Initialize Speech Recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'pl-PL';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
    }
  }

  // Check browser support for audio features
  checkSupport() {
    return {
      speechSynthesis: 'speechSynthesis' in window,
      speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
      mediaRecorder: 'MediaRecorder' in window,
      getUserMedia: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
    };
  }

  // Get available Polish voices
  getPolishVoices() {
    return new Promise((resolve) => {
      let voices = this.synthesis.getVoices();

      if (voices.length === 0) {
        // Wait for voices to load
        this.synthesis.onvoiceschanged = () => {
          voices = this.synthesis.getVoices();
          const polishVoices = voices.filter(voice =>
            voice.lang.startsWith('pl') ||
            voice.name.toLowerCase().includes('pol')
          );
          resolve(polishVoices);
        };
      } else {
        const polishVoices = voices.filter(voice =>
          voice.lang.startsWith('pl') ||
          voice.name.toLowerCase().includes('pol')
        );
        resolve(polishVoices);
      }
    });
  }

  // Speak Polish text with TTS
  async speak(text, options = {}) {
    return new Promise(async (resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Stop any current speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Get Polish voice
      const polishVoices = await this.getPolishVoices();
      if (polishVoices.length > 0) {
        utterance.voice = polishVoices[0];
      }

      // Set speech parameters
      utterance.rate = options.rate || 0.8; // Slower for learning
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event.error);

      this.synthesis.speak(utterance);
    });
  }

  // Stop current speech
  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  // Start speech recognition for pronunciation practice
  startRecognition() {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      this.recognition.onresult = (event) => {
        const result = event.results[0][0];
        resolve({
          transcript: result.transcript,
          confidence: result.confidence
        });
      };

      this.recognition.onerror = (event) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.onend = () => {
        // Recognition ended naturally
      };

      this.recognition.start();
    });
  }

  // Stop speech recognition
  stopRecognition() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  // Start audio recording
  async startRecording() {
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error('MediaRecorder not supported in this browser');
      }

      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();

      return new Promise((resolve, reject) => {
        this.mediaRecorder.onstop = () => {
          try {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);

            // Stop all tracks to release microphone
            stream.getTracks().forEach(track => track.stop());

            resolve({ audioBlob, audioUrl });
          } catch (error) {
            reject(new Error(`Failed to process recording: ${error.message}`));
          }
        };

        // Set a timeout for recording initialization
        setTimeout(() => {
          if (this.mediaRecorder.state === 'inactive') {
            stream.getTracks().forEach(track => track.stop());
            reject(new Error('Recording failed to start within timeout'));
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Recording error details:', error);

      // Provide more specific error messages
      let errorMessage = 'Failed to start recording';

      if (error.name === 'NotFoundError' || error.name === 'DeviceNotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Audio recording not supported in this browser. Try using Chrome, Firefox, or Edge.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Microphone is busy or unavailable. Close other apps using the microphone.';
      } else if (error.message.includes('Media devices not supported')) {
        errorMessage = 'Audio recording not supported in this browser. Please use a modern browser.';
      }

      throw new Error(errorMessage);
    }
  }

  // Stop audio recording
  stopRecording() {
    return new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
        // Promise resolves in the onstop handler
      } else {
        resolve(null);
      }
    });
  }

  // Play audio from URL
  playAudio(audioUrl) {
    return new Promise((resolve, reject) => {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      }

      this.currentAudio = new Audio(audioUrl);

      this.currentAudio.onended = () => resolve();
      this.currentAudio.onerror = () => reject(new Error('Failed to play audio'));

      this.currentAudio.play().catch(reject);
    });
  }

  // Stop current audio playback
  stopAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }
  }

  // Compare user pronunciation with expected text
  comparePronunciation(userText, expectedText) {
    const normalize = (text) => {
      return text.toLowerCase()
        .replace(/[.,!?;:]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const normalizedUser = normalize(userText);
    const normalizedExpected = normalize(expectedText);

    // Simple similarity calculation
    const similarity = this.calculateSimilarity(normalizedUser, normalizedExpected);

    return {
      similarity,
      isCorrect: similarity > 0.7, // 70% similarity threshold
      feedback: this.generateFeedback(similarity, normalizedUser, normalizedExpected)
    };
  }

  // Calculate text similarity using simple algorithm
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  // Levenshtein distance for text comparison
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Generate pronunciation feedback
  generateFeedback(similarity, userText, expectedText) {
    if (similarity >= 0.9) {
      return { level: 'excellent', message: 'Excellent pronunciation! 🎉' };
    } else if (similarity >= 0.7) {
      return { level: 'good', message: 'Good pronunciation! Keep practicing. 👍' };
    } else if (similarity >= 0.5) {
      return { level: 'fair', message: 'Fair attempt. Try again and focus on clarity. 🎯' };
    } else {
      return { level: 'poor', message: 'Keep practicing. Listen carefully and try again. 💪' };
    }
  }

  // Clean up resources
  cleanup() {
    this.stopSpeaking();
    this.stopRecognition();
    this.stopAudio();

    if (this.currentAudio) {
      URL.revokeObjectURL(this.currentAudio.src);
      this.currentAudio = null;
    }
  }
}

export default AudioUtils;