import React, { useState, useRef, useEffect } from 'react';
import AudioUtils from '../../utils/audioUtils';

const PronunciationQuestion = ({ question, onSubmit, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [audioSupport, setAudioSupport] = useState({});
  const [hasAttempted, setHasAttempted] = useState(false);

  const audioUtils = useRef(new AudioUtils());

  useEffect(() => {
    const support = audioUtils.current.checkSupport();
    setAudioSupport(support);

    return () => {
      audioUtils.current.cleanup();
    };
  }, []);

  const handlePlayOriginal = async () => {
    if (!audioSupport.speechSynthesis || disabled) return;

    setIsPlaying(true);
    try {
      await audioUtils.current.speak(question.polish, { rate: 0.8 });
    } catch (error) {
      console.error('Error playing pronunciation:', error);
    }
    setIsPlaying(false);
  };

  const handleStartRecording = async () => {
    if (!audioSupport.getUserMedia || disabled) {
      alert('Microphone access required for pronunciation practice');
      return;
    }

    setIsRecording(true);
    setRecognitionResult(null);

    try {
      const recordingPromise = await audioUtils.current.startRecording();
      setRecordedAudio(recordingPromise);
    } catch (error) {
      console.error('Recording error:', error);

      // Show user-friendly error message
      const errorMessage = error.message || 'Could not access microphone. Please check permissions.';
      alert(errorMessage);

      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    if (!isRecording) return;

    setIsRecording(false);

    try {
      const audioData = await audioUtils.current.stopRecording();
      if (audioData) {
        setRecordedAudio(audioData);
        setHasAttempted(true);

        // Automatically try speech recognition
        if (audioSupport.speechRecognition) {
          setTimeout(() => {
            handleSpeechRecognition();
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const handleSpeechRecognition = async () => {
    if (!audioSupport.speechRecognition) return;

    try {
      const result = await audioUtils.current.startRecognition();
      const comparison = audioUtils.current.comparePronunciation(
        result.transcript,
        question.polish
      );

      setRecognitionResult({
        userSaid: result.transcript,
        confidence: result.confidence,
        ...comparison
      });

    } catch (error) {
      console.error('Speech recognition error:', error);
      setRecognitionResult({
        error: 'Could not process pronunciation',
        feedback: { level: 'error', message: 'Recognition failed' }
      });
    }
  };

  const handlePlayRecording = async () => {
    if (!recordedAudio) return;

    try {
      await audioUtils.current.playAudio(recordedAudio.audioUrl);
    } catch (error) {
      console.error('Error playing recording:', error);
    }
  };

  const handleSubmitPronunciation = () => {
    if (!hasAttempted) return;

    const score = recognitionResult?.similarity || 0;
    const isCorrect = score > 0.7;

    onSubmit({
      answer: recognitionResult?.userSaid || 'Audio recorded',
      isCorrect,
      score: Math.round(score * 100),
      pronunciationData: {
        recorded: !!recordedAudio,
        recognized: !!recognitionResult,
        similarity: score,
        feedback: recognitionResult?.feedback
      }
    });
  };

  return (
    <div className="pronunciation-question">
      <h3 className="question-text">{question.question || 'Pronounce this word in Polish'}</h3>

      <div className="target-word">
        <div className="word-display">
          <span className="polish-word">{question.polish}</span>
          <button
            className="play-original-btn"
            onClick={handlePlayOriginal}
            disabled={disabled || isPlaying || !audioSupport.speechSynthesis}
          >
            {isPlaying ? '🔊' : '🔉'} {isPlaying ? 'Playing...' : 'Listen'}
          </button>
        </div>

        {question.english && (
          <div className="english-meaning">
            <strong>Meaning:</strong> {question.english}
          </div>
        )}

        {question.pronunciation && (
          <div className="pronunciation-guide">
            <strong>Guide:</strong> /{question.pronunciation}/
          </div>
        )}
      </div>

      {!audioSupport.speechSynthesis && (
        <div className="audio-warning">
          ⚠️ Audio playback not supported in this browser
        </div>
      )}

      {!audioSupport.getUserMedia && (
        <div className="audio-warning">
          ⚠️ Microphone access not supported. Recording unavailable.
        </div>
      )}

      <div className="recording-section">
        <div className="recording-controls">
          {!isRecording ? (
            <button
              className="record-btn start"
              onClick={handleStartRecording}
              disabled={disabled || !audioSupport.getUserMedia}
            >
              🎤 Record Pronunciation
            </button>
          ) : (
            <button
              className="record-btn stop"
              onClick={handleStopRecording}
              disabled={disabled}
            >
              ⏹️ Stop Recording
            </button>
          )}

          {recordedAudio && (
            <button
              className="play-recording-btn"
              onClick={handlePlayRecording}
              disabled={disabled}
            >
              ▶️ Play My Recording
            </button>
          )}
        </div>

        {isRecording && (
          <div className="recording-indicator">
            <div className="recording-pulse"></div>
            <span>Recording... Speak clearly!</span>
          </div>
        )}

        {recognitionResult && (
          <div className={`recognition-result ${recognitionResult.feedback?.level || 'error'}`}>
            {recognitionResult.error ? (
              <div className="error-message">
                <p>{recognitionResult.error}</p>
              </div>
            ) : (
              <div className="result-details">
                <div className="what-heard">
                  <strong>Recognized:</strong> "{recognitionResult.userSaid}"
                </div>
                <div className="similarity-score">
                  <strong>Accuracy:</strong> {Math.round(recognitionResult.similarity * 100)}%
                </div>
                <div className="feedback">
                  {recognitionResult.feedback.message}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="question-actions">
        <button
          className="submit-pronunciation-btn"
          onClick={handleSubmitPronunciation}
          disabled={disabled || !hasAttempted}
        >
          Submit Pronunciation
        </button>
      </div>

      <div className="pronunciation-tips">
        <h4>💡 Tips:</h4>
        <ul>
          <li>Listen to the original pronunciation first</li>
          <li>Speak clearly into your microphone</li>
          <li>Try to match the accent and intonation</li>
          <li>Record in a quiet environment</li>
        </ul>
      </div>
    </div>
  );
};

export default PronunciationQuestion;