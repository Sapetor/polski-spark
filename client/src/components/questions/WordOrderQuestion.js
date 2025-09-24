import React, { useState, useEffect } from 'react';

const WordOrderQuestion = ({ question, onSubmit, disabled }) => {
  const [orderedWords, setOrderedWords] = useState([]);
  const [availableWords, setAvailableWords] = useState([...question.scrambledWords]);

  // Reset state when question changes
  useEffect(() => {
    setOrderedWords([]);
    setAvailableWords([...question.scrambledWords]);
  }, [question]);

  const addWord = (word, index) => {
    if (disabled) return;

    // Remove word from available list
    const newAvailable = [...availableWords];
    newAvailable.splice(index, 1);
    setAvailableWords(newAvailable);

    // Add word to ordered list
    setOrderedWords([...orderedWords, word]);
  };

  const removeWord = (wordIndex) => {
    if (disabled) return;

    // Remove word from ordered list
    const wordToRemove = orderedWords[wordIndex];
    const newOrdered = [...orderedWords];
    newOrdered.splice(wordIndex, 1);
    setOrderedWords(newOrdered);

    // Add word back to available list
    setAvailableWords([...availableWords, wordToRemove]);
  };

  const clearAll = () => {
    if (disabled) return;
    setOrderedWords([]);
    setAvailableWords([...question.scrambledWords]);
  };

  const handleSubmit = () => {
    if (orderedWords.length === 0) return;
    const answer = orderedWords.join(' ');
    onSubmit(answer);
  };

  return (
    <div className="word-order-question">
      <h3 className="question-text">{question.question}</h3>

      {question.hint && (
        <div className="question-hint">
          💡 {question.hint}
        </div>
      )}

      <div className="word-ordering-area">
        <div className="available-words">
          <h4>Available Words:</h4>
          <div className="words-container">
            {availableWords.map((word, index) => (
              <button
                key={`available-${word}-${index}`}
                className="word-button available"
                onClick={() => addWord(word, index)}
                disabled={disabled}
              >
                {word}
              </button>
            ))}
          </div>
        </div>

        <div className="ordered-words">
          <h4>Your Sentence:</h4>
          <div className="words-container sentence">
            {orderedWords.length === 0 ? (
              <div className="empty-sentence">Click words above to build your sentence</div>
            ) : (
              orderedWords.map((word, index) => (
                <button
                  key={`ordered-${word}-${index}`}
                  className="word-button ordered"
                  onClick={() => removeWord(index)}
                  disabled={disabled}
                >
                  {word}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {question.translation && (
        <div className="question-translation">
          <strong>Translation:</strong> {question.translation}
        </div>
      )}

      <div className="word-order-controls">
        <button
          className="clear-btn"
          onClick={clearAll}
          disabled={disabled || orderedWords.length === 0}
        >
          Clear All
        </button>
        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={disabled || orderedWords.length === 0}
        >
          Submit Answer
        </button>
      </div>
    </div>
  );
};

export default WordOrderQuestion;