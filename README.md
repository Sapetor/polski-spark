# 🇵🇱 Polski Spark

A modern, interactive Polish language learning application built with React and Node.js, featuring Anki deck integration, spaced repetition learning, and comprehensive grammar practice.

![Polski Spark](https://img.shields.io/badge/Language-Polish-red?style=flat-square)
![React](https://img.shields.io/badge/React-18+-blue?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-16+-green?style=flat-square)
![SQLite](https://img.shields.io/badge/Database-SQLite-lightblue?style=flat-square)

## ✨ Features

### 🎓 Learning Modes
- **📚 Study Mode**: Vocabulary-focused learning with smart filtering
- **🎯 Quick Practice**: Configurable lessons with multiple question types
- **📖 Review Words**: Practice yesterday's vocabulary with performance tracking
- **🎲 Random Quiz**: Smart quiz generation from all learned vocabulary
- **📝 Grammar Practice**: Polish sentence structure, cases, and verb conjugation
- **🎧 Listening Practice**: Audio comprehension exercises with Polish character tolerance
- **📋 Grammar Lessons**: Interactive lessons explaining Polish grammar rules

### 🏠 Modern Dashboard
- **Glassmorphism Design**: Beautiful backdrop blur effects and modern UI
- **4-Hub Layout**: Learning, Analytics, Quick Practice, and Achievements
- **Progress Tracking**: XP, levels, streaks, and detailed analytics
- **Responsive Design**: Optimized for desktop, tablet, and mobile

### 🚀 Advanced Features
- **Anki Integration**: Import and practice with existing Anki decks
- **Spaced Repetition**: Scientifically-proven learning algorithm
- **Polish Character Support**: Automatic normalization of diacritical marks (ć→c, ł→l, etc.)
- **Multi-Answer Validation**: Accepts any valid translation from multiple alternatives
- **Session Persistence**: Auto-save and restore learning progress

## 🛠️ Tech Stack

- **Frontend**: React 18+ with modern hooks
- **Backend**: Node.js with Express
- **Database**: SQLite with migrations
- **Styling**: Modern CSS with Grid/Flexbox
- **Audio**: Web Speech API for pronunciation

## 🚀 Quick Start

### Prerequisites
- Node.js 16 or higher
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/polski-spark.git
   cd polski-spark
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Start the development servers**

   In one terminal (server):
   ```bash
   cd server
   npm start
   ```

   In another terminal (client):
   ```bash
   cd client
   HOST=0.0.0.0 npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📱 Usage

1. **Create a User**: Start by creating your learning profile
2. **Upload Anki Decks**: Import your existing Anki decks or use sample data
3. **Choose Learning Mode**: Select from Study, Practice, or Review modes
4. **Learn Polish**: Practice vocabulary, grammar, and listening comprehension
5. **Track Progress**: Monitor your learning journey with detailed analytics

## 🎯 Learning Features

### Question Types
- **Multiple Choice**: Select the correct translation
- **Fill in the Blank**: Complete sentences with missing words
- **Translation**: Translate between Polish and English
- **Word Order**: Arrange Polish words in correct sentence structure
- **Listening Comprehension**: Audio-based understanding exercises

### Polish Language Support
- **Diacritic Tolerance**: Type "miod" instead of "miód" - both accepted
- **Multiple Translations**: "incapable" or "unfit" both correct for "niezdolny"
- **Grammar Focus**: Cases, verb forms, and sentence structure
- **Audio Pronunciation**: Text-to-speech for Polish words

## 🏗️ Architecture

```
polski-spark/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
├── server/                # Node.js backend
│   ├── migrations/        # Database migrations
│   ├── utils/            # Server utilities
│   └── tests/            # Integration tests
└── specs/                # Feature specifications
```

## 🧪 Testing

```bash
# Run server tests
cd server
npm test

# Run client tests
cd client
npm test
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the server directory:

```env
NODE_ENV=development
PORT=3001
DATABASE_PATH=./database.sqlite
```

### Network Access
For WSL2 users or network access:
```bash
# Start client with network access
HOST=0.0.0.0 npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow React hooks patterns
- Use modern JavaScript (ES6+)
- Maintain mobile-first responsive design
- Write comprehensive tests
- Follow existing code style

## 📈 Recent Updates

### December 2024
- ✅ Fixed duplicate questions in grammar practice
- ✅ Added Polish character normalization in listening exercises
- ✅ Enhanced translation validation for multiple correct answers
- ✅ Improved UI with optimized mode card heights
- ✅ Added navigation buttons throughout the app

## 🗺️ Roadmap

### Next Features
- [ ] **Audio Improvements**: Better pronunciation practice
- [ ] **Smart Recommendations**: AI-powered learning suggestions
- [ ] **Social Features**: Community learning and leaderboards
- [ ] **Mobile App**: Native iOS/Android applications
- [ ] **Advanced Analytics**: Detailed learning insights

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Anki for the inspiration and deck format compatibility
- Polish language learning community for feedback
- React and Node.js communities for excellent documentation

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-username/polski-spark/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/your-username/polski-spark/discussions)
- 📧 **Email**: support@polski-spark.com

---

**Made with ❤️ for Polish language learners worldwide**

*Start your Polish learning journey today!* 🚀