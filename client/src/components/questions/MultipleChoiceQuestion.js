import React from 'react';

const MultipleChoiceQuestion = ({ question, onSelect, disabled }) => {
  return (
    <div className="multiple-choice-question">
      <h3 className="question-text">{question.question}</h3>
      <div className="options">
        {question.options.map((option, index) => (
          <button
            key={index}
            className="option-button"
            onClick={() => onSelect(option)}
            disabled={disabled}
          >
            {String.fromCharCode(65 + index)}. {option}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MultipleChoiceQuestion;