import React, { useState } from 'react';

const FlashcardQuestion = ({ question, onNext }) => {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="flashcard-question">
      <div className="flashcard">
        <h3 className="question-text">{question.question}</h3>
        {showAnswer && (
          <div className="answer-text">
            <h4>Answer:</h4>
            <p>{question.answer}</p>
          </div>
        )}
      </div>
      <div className="flashcard-controls">
        {!showAnswer ? (
          <button onClick={() => setShowAnswer(true)} className="show-answer-btn">
            Show Answer
          </button>
        ) : (
          <button onClick={onNext} className="next-btn">
            Next Card
          </button>
        )}
      </div>
    </div>
  );
};

export default FlashcardQuestion;