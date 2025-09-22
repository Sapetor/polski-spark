import React from 'react';

const TranslationQuestion = ({ question, userAnswer, setUserAnswer, onSubmit, disabled }) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !disabled) {
      onSubmit();
    }
  };

  return (
    <div className="translation-question">
      <h3 className="question-text">{question.question}</h3>
      <div className="source-text">{question.sourceText}</div>
      <div className="answer-input">
        <input
          type="text"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`Enter your ${question.targetLanguage} translation...`}
          disabled={disabled}
          autoFocus
          dir="ltr"
          style={{ direction: 'ltr', textAlign: 'left' }}
        />
        <button onClick={onSubmit} disabled={disabled || !userAnswer.trim()}>
          Submit Translation
        </button>
      </div>
    </div>
  );
};

export default TranslationQuestion;