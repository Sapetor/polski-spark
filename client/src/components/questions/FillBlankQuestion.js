import React from 'react';

const FillBlankQuestion = ({ question, userAnswer, setUserAnswer, onSubmit, disabled }) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !disabled) {
      onSubmit();
    }
  };

  return (
    <div className="fill-blank-question">
      <h3 className="question-text">{question.question}</h3>
      {question.hint && <p className="hint">💡 {question.hint}</p>}
      <div className="answer-input">
        <input
          type="text"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your answer..."
          disabled={disabled}
          autoFocus
          dir="ltr"
          style={{ direction: 'ltr', textAlign: 'left' }}
        />
        <button onClick={onSubmit} disabled={disabled || !userAnswer.trim()}>
          Submit
        </button>
      </div>
    </div>
  );
};

export default FillBlankQuestion;