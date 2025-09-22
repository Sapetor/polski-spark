import React, { useState } from 'react';

const GrammarLessons = ({ onBackToDashboard, onStartPractice }) => {
  const [selectedLesson, setSelectedLesson] = useState(null);

  const grammarLessons = {
    word_order: {
      title: "Polish Word Order",
      icon: "🔄",
      difficulty: "Beginner",
      duration: "5 minutes",
      description: "Learn the basic structure of Polish sentences",
      content: {
        introduction: "Polish word order is more flexible than English, but follows general patterns that help convey meaning clearly.",
        sections: [
          {
            title: "Basic Sentence Structure",
            content: `
              <p>The most common Polish sentence follows the <strong>Subject + Verb + Object (SVO)</strong> pattern, similar to English:</p>
              <div class="example-box">
                <div class="example">
                  <span class="polish">Kot je rybę.</span>
                  <span class="english">Cat eats fish.</span>
                </div>
                <div class="breakdown">
                  <span class="word">Kot</span> (subject) +
                  <span class="word">je</span> (verb) +
                  <span class="word">rybę</span> (object)
                </div>
              </div>
            `
          },
          {
            title: "Questions and Word Order",
            content: `
              <p>In questions, the question word typically comes first, followed by the verb:</p>
              <div class="example-box">
                <div class="example">
                  <span class="polish">Co robisz?</span>
                  <span class="english">What are you doing?</span>
                </div>
                <div class="example">
                  <span class="polish">Gdzie mieszkasz?</span>
                  <span class="english">Where do you live?</span>
                </div>
              </div>
            `
          },
          {
            title: "Flexibility in Polish",
            content: `
              <p>Polish allows more word order variation than English for emphasis:</p>
              <div class="example-box">
                <div class="example">
                  <span class="polish">Książkę czytam.</span>
                  <span class="english">The book I'm reading. (emphasis on "book")</span>
                </div>
                <div class="example">
                  <span class="polish">Czytam książkę.</span>
                  <span class="english">I'm reading a book. (neutral)</span>
                </div>
              </div>
            `
          }
        ]
      }
    },
    cases: {
      title: "Polish Cases",
      icon: "📋",
      difficulty: "Beginner",
      duration: "8 minutes",
      description: "Understanding nominative and accusative cases",
      content: {
        introduction: "Polish uses cases to show the role of nouns in sentences. Cases change the endings of words to indicate their grammatical function.",
        sections: [
          {
            title: "What Are Cases?",
            content: `
              <p>Cases are different forms of nouns that show their role in a sentence. Think of them like different "costumes" a word wears depending on its job.</p>
              <div class="concept-box">
                <p><strong>Same word, different roles:</strong></p>
                <div class="example">
                  <span class="polish">Kot</span> (subject) vs <span class="polish">kota</span> (object)
                </div>
              </div>
            `
          },
          {
            title: "Nominative Case (Mianownik)",
            content: `
              <p>The nominative case is used for the <strong>subject</strong> of the sentence - who or what is doing the action.</p>
              <div class="example-box">
                <div class="example">
                  <span class="polish">Pies szczeka.</span>
                  <span class="english">The dog barks.</span>
                  <span class="explanation">"Pies" is the subject (who barks?)</span>
                </div>
                <div class="example">
                  <span class="polish">Dziecko płacze.</span>
                  <span class="english">The child cries.</span>
                  <span class="explanation">"Dziecko" is the subject (who cries?)</span>
                </div>
              </div>
              <div class="rule-box">
                <strong>Rule:</strong> The subject of the sentence is always in nominative case.
              </div>
            `
          },
          {
            title: "Accusative Case (Biernik)",
            content: `
              <p>The accusative case is used for the <strong>direct object</strong> - what receives the action directly.</p>
              <div class="example-box">
                <div class="example">
                  <span class="polish">Czytam książkę.</span>
                  <span class="english">I read a book.</span>
                  <span class="explanation">"książkę" is the direct object (what am I reading?)</span>
                </div>
                <div class="example">
                  <span class="polish">Kupuję chleb.</span>
                  <span class="english">I buy bread.</span>
                  <span class="explanation">"chleb" is the direct object (what am I buying?)</span>
                </div>
              </div>
              <div class="rule-box">
                <strong>Rule:</strong> Direct objects are in accusative case.
              </div>
            `
          },
          {
            title: "Common Case Endings",
            content: `
              <p>Here are some common patterns for case endings:</p>
              <div class="table-box">
                <table>
                  <tr>
                    <th>Word Type</th>
                    <th>Nominative</th>
                    <th>Accusative</th>
                    <th>Example</th>
                  </tr>
                  <tr>
                    <td>Feminine nouns (-a)</td>
                    <td>-a</td>
                    <td>-ę</td>
                    <td>kota → kotę</td>
                  </tr>
                  <tr>
                    <td>Masculine animate</td>
                    <td>-</td>
                    <td>-a</td>
                    <td>kot → kota</td>
                  </tr>
                  <tr>
                    <td>Masculine inanimate</td>
                    <td>-</td>
                    <td>same</td>
                    <td>stół → stół</td>
                  </tr>
                </table>
              </div>
            `
          }
        ]
      }
    },
    verb_forms: {
      title: "Polish Verb Conjugation",
      icon: "⚡",
      difficulty: "Beginner",
      duration: "6 minutes",
      description: "Present tense verb forms for different persons",
      content: {
        introduction: "Polish verbs change their endings to show who is performing the action. This is called conjugation.",
        sections: [
          {
            title: "Personal Pronouns",
            content: `
              <p>First, let's learn the personal pronouns (who is doing the action):</p>
              <div class="table-box">
                <table>
                  <tr>
                    <th>Polish</th>
                    <th>English</th>
                    <th>Person</th>
                  </tr>
                  <tr>
                    <td>ja</td>
                    <td>I</td>
                    <td>1st person singular</td>
                  </tr>
                  <tr>
                    <td>ty</td>
                    <td>you</td>
                    <td>2nd person singular</td>
                  </tr>
                  <tr>
                    <td>on/ona/ono</td>
                    <td>he/she/it</td>
                    <td>3rd person singular</td>
                  </tr>
                </table>
              </div>
            `
          },
          {
            title: "Present Tense Endings",
            content: `
              <p>Polish verbs change their endings based on who performs the action:</p>
              <div class="example-box">
                <h4>Verb: robić (to do/make)</h4>
                <div class="example">
                  <span class="polish">ja robię</span>
                  <span class="english">I do</span>
                </div>
                <div class="example">
                  <span class="polish">ty robisz</span>
                  <span class="english">you do</span>
                </div>
                <div class="example">
                  <span class="polish">on/ona robi</span>
                  <span class="english">he/she does</span>
                </div>
              </div>
            `
          },
          {
            title: "Common Verbs",
            content: `
              <p>Here are essential verbs you'll use frequently:</p>
              <div class="table-box">
                <table>
                  <tr>
                    <th>Infinitive</th>
                    <th>ja</th>
                    <th>ty</th>
                    <th>on/ona</th>
                    <th>English</th>
                  </tr>
                  <tr>
                    <td>być</td>
                    <td>jestem</td>
                    <td>jesteś</td>
                    <td>jest</td>
                    <td>to be</td>
                  </tr>
                  <tr>
                    <td>mieć</td>
                    <td>mam</td>
                    <td>masz</td>
                    <td>ma</td>
                    <td>to have</td>
                  </tr>
                  <tr>
                    <td>jeść</td>
                    <td>jem</td>
                    <td>jesz</td>
                    <td>je</td>
                    <td>to eat</td>
                  </tr>
                </table>
              </div>
            `
          },
          {
            title: "Patterns to Remember",
            content: `
              <div class="rule-box">
                <h4>Key Patterns:</h4>
                <ul>
                  <li><strong>ja</strong> forms often end in <strong>-ę</strong> or <strong>-m</strong></li>
                  <li><strong>ty</strong> forms usually end in <strong>-sz</strong></li>
                  <li><strong>on/ona</strong> forms often end in <strong>-e</strong> or are short</li>
                </ul>
              </div>
            `
          }
        ]
      }
    },
    genitive_case: {
      title: "Genitive Case (Dopełniacz)",
      icon: "📋",
      difficulty: "Intermediate",
      duration: "10 minutes",
      description: "Learn the genitive case for possession and negation",
      content: {
        introduction: "The genitive case is used to show possession, after certain prepositions, with numbers, and in negation. It's one of the most frequently used cases in Polish.",
        sections: [
          {
            title: "When to Use Genitive",
            content: `
              <p>The genitive case has several important uses:</p>
              <div class="rule-box">
                <h4>Main Uses:</h4>
                <ul>
                  <li><strong>Possession:</strong> dom mojego brata (my brother's house)</li>
                  <li><strong>After numbers 5+:</strong> pięć książek (five books)</li>
                  <li><strong>Negation:</strong> nie mam czasu (I don't have time)</li>
                  <li><strong>Prepositions:</strong> od, do, z, bez, dla (from, to, from, without, for)</li>
                </ul>
              </div>
            `
          },
          {
            title: "Genitive Endings",
            content: `
              <p>Genitive case endings depend on gender and number:</p>
              <div class="table-box">
                <table>
                  <tr>
                    <th>Gender</th>
                    <th>Singular</th>
                    <th>Plural</th>
                    <th>Examples</th>
                  </tr>
                  <tr>
                    <td>Masculine</td>
                    <td>-a, -u</td>
                    <td>-ów, -y/-i</td>
                    <td>kota, domu → kotów, domów</td>
                  </tr>
                  <tr>
                    <td>Feminine</td>
                    <td>-y/-i</td>
                    <td>-, -y/-i</td>
                    <td>mamy, kaczki → mam, kaczek</td>
                  </tr>
                  <tr>
                    <td>Neuter</td>
                    <td>-a</td>
                    <td>-, -y/-i</td>
                    <td>okna → okien</td>
                  </tr>
                </table>
              </div>
            `
          },
          {
            title: "Common Expressions",
            content: `
              <div class="example-box">
                <div class="example">
                  <span class="polish">nie mam pieniędzy</span>
                  <span class="english">I don't have money</span>
                </div>
                <div class="example">
                  <span class="polish">dom mojego kolegi</span>
                  <span class="english">my friend's house</span>
                </div>
                <div class="example">
                  <span class="polish">szklanka wody</span>
                  <span class="english">a glass of water</span>
                </div>
                <div class="example">
                  <span class="polish">bez problemu</span>
                  <span class="english">without a problem</span>
                </div>
              </div>
            `
          }
        ]
      }
    },
    dative_case: {
      title: "Dative Case (Celownik)",
      icon: "➡️",
      difficulty: "Intermediate",
      duration: "8 minutes",
      description: "Learn the dative case for indirect objects",
      content: {
        introduction: "The dative case is used for indirect objects - who or what receives the action indirectly. It answers 'to whom?' or 'for whom?'",
        sections: [
          {
            title: "When to Use Dative",
            content: `
              <p>The dative case is used in several situations:</p>
              <div class="rule-box">
                <h4>Main Uses:</h4>
                <ul>
                  <li><strong>Indirect objects:</strong> daję książkę bratu (I give a book to my brother)</li>
                  <li><strong>With certain verbs:</strong> pomagać, dziękować, ufać (to help, thank, trust)</li>
                  <li><strong>After prepositions:</strong> ku, dzięki, przeciwko (towards, thanks to, against)</li>
                  <li><strong>Expressing feelings:</strong> jest mi zimno (I am cold)</li>
                </ul>
              </div>
            `
          },
          {
            title: "Dative Endings",
            content: `
              <div class="table-box">
                <table>
                  <tr>
                    <th>Gender</th>
                    <th>Singular</th>
                    <th>Examples</th>
                  </tr>
                  <tr>
                    <td>Masculine</td>
                    <td>-owi, -u</td>
                    <td>bratu, ojcu</td>
                  </tr>
                  <tr>
                    <td>Feminine</td>
                    <td>-ie, -y</td>
                    <td>mamie, córce</td>
                  </tr>
                  <tr>
                    <td>Neuter</td>
                    <td>-u</td>
                    <td>dziecku</td>
                  </tr>
                </table>
              </div>
            `
          },
          {
            title: "Common Verbs with Dative",
            content: `
              <div class="example-box">
                <div class="example">
                  <span class="polish">pomagam mamie</span>
                  <span class="english">I help mom</span>
                </div>
                <div class="example">
                  <span class="polish">dziękuję ci</span>
                  <span class="english">I thank you</span>
                </div>
                <div class="example">
                  <span class="polish">ufam tobie</span>
                  <span class="english">I trust you</span>
                </div>
                <div class="example">
                  <span class="polish">jest mi dobrze</span>
                  <span class="english">I feel good</span>
                </div>
              </div>
            `
          }
        ]
      }
    },
    instrumental_case: {
      title: "Instrumental Case (Narzędnik)",
      icon: "🔧",
      difficulty: "Intermediate",
      duration: "9 minutes",
      description: "Learn the instrumental case for tools and methods",
      content: {
        introduction: "The instrumental case is used to show how something is done - with what tool, by what means, or in what manner.",
        sections: [
          {
            title: "When to Use Instrumental",
            content: `
              <p>The instrumental case has several key uses:</p>
              <div class="rule-box">
                <h4>Main Uses:</h4>
                <ul>
                  <li><strong>Tools/instruments:</strong> piszę długopisem (I write with a pen)</li>
                  <li><strong>Transportation:</strong> jadę autobusem (I go by bus)</li>
                  <li><strong>With verb 'być':</strong> jestem nauczycielem (I am a teacher)</li>
                  <li><strong>With prepositions:</strong> z, nad, pod, przed, za (with, over, under, in front of, behind)</li>
                </ul>
              </div>
            `
          },
          {
            title: "Instrumental Endings",
            content: `
              <div class="table-box">
                <table>
                  <tr>
                    <th>Gender</th>
                    <th>Singular</th>
                    <th>Examples</th>
                  </tr>
                  <tr>
                    <td>Masculine</td>
                    <td>-em</td>
                    <td>długopisem, autobusem</td>
                  </tr>
                  <tr>
                    <td>Feminine</td>
                    <td>-ą</td>
                    <td>łyżką, ręką</td>
                  </tr>
                  <tr>
                    <td>Neuter</td>
                    <td>-em</td>
                    <td>oknem</td>
                  </tr>
                </table>
              </div>
            `
          },
          {
            title: "Professions and States",
            content: `
              <p>When stating someone's profession or role, use instrumental:</p>
              <div class="example-box">
                <div class="example">
                  <span class="polish">jestem studentem</span>
                  <span class="english">I am a student</span>
                </div>
                <div class="example">
                  <span class="polish">ona jest lekarką</span>
                  <span class="english">she is a doctor</span>
                </div>
                <div class="example">
                  <span class="polish">staję się dorosłym</span>
                  <span class="english">I'm becoming an adult</span>
                </div>
              </div>
            `
          }
        ]
      }
    },
    locative_case: {
      title: "Locative Case (Miejscownik)",
      icon: "📍",
      difficulty: "Intermediate",
      duration: "7 minutes",
      description: "Learn the locative case for location and topics",
      content: {
        introduction: "The locative case is used to indicate location and what we're talking about. It's always used with prepositions.",
        sections: [
          {
            title: "When to Use Locative",
            content: `
              <p>The locative case appears in these situations:</p>
              <div class="rule-box">
                <h4>Main Uses:</h4>
                <ul>
                  <li><strong>Location:</strong> w domu (at home), na ulicy (on the street)</li>
                  <li><strong>Topic:</strong> mówię o tobie (I'm talking about you)</li>
                  <li><strong>Time:</strong> w styczniu (in January), o ósmej (at eight)</li>
                  <li><strong>Prepositions:</strong> w, na, o, po, przy (in/at, on/at, about, after, by/near)</li>
                </ul>
              </div>
            `
          },
          {
            title: "Locative Endings",
            content: `
              <div class="table-box">
                <table>
                  <tr>
                    <th>Gender</th>
                    <th>Singular</th>
                    <th>Examples</th>
                  </tr>
                  <tr>
                    <td>Masculine</td>
                    <td>-e, -u</td>
                    <td>w domu, o kocie</td>
                  </tr>
                  <tr>
                    <td>Feminine</td>
                    <td>-ie, -y</td>
                    <td>w szkole, o mamie</td>
                  </tr>
                  <tr>
                    <td>Neuter</td>
                    <td>-e</td>
                    <td>w oknie</td>
                  </tr>
                </table>
              </div>
            `
          },
          {
            title: "Common Locations",
            content: `
              <div class="example-box">
                <div class="example">
                  <span class="polish">mieszkam w Warszawie</span>
                  <span class="english">I live in Warsaw</span>
                </div>
                <div class="example">
                  <span class="polish">jestem na uniwersytecie</span>
                  <span class="english">I'm at the university</span>
                </div>
                <div class="example">
                  <span class="polish">myślę o przyszłości</span>
                  <span class="english">I think about the future</span>
                </div>
                <div class="example">
                  <span class="polish">przy oknie</span>
                  <span class="english">by the window</span>
                </div>
              </div>
            `
          }
        ]
      }
    },
    aspects: {
      title: "Perfective vs Imperfective Aspect",
      icon: "⚡",
      difficulty: "Advanced",
      duration: "12 minutes",
      description: "Master the Polish aspect system",
      content: {
        introduction: "Polish verbs have two aspects: perfective (completed actions) and imperfective (ongoing/repeated actions). This is fundamental to Polish grammar.",
        sections: [
          {
            title: "Understanding Aspects",
            content: `
              <p>Polish verbs express not just when something happens, but how the action unfolds:</p>
              <div class="concept-box">
                <p><strong>Imperfective aspect:</strong> ongoing, repeated, or habitual actions</p>
                <p><strong>Perfective aspect:</strong> completed, one-time, or result-focused actions</p>
              </div>
              <div class="example-box">
                <div class="example">
                  <span class="polish">czytam książkę</span>
                  <span class="english">I am reading a book (ongoing)</span>
                  <span class="explanation">Imperfective - the action is in progress</span>
                </div>
                <div class="example">
                  <span class="polish">przeczytam książkę</span>
                  <span class="english">I will read the book (to completion)</span>
                  <span class="explanation">Perfective - focus on completing the action</span>
                </div>
              </div>
            `
          },
          {
            title: "Aspectual Pairs",
            content: `
              <p>Most Polish verbs come in aspectual pairs - same meaning, different aspects:</p>
              <div class="table-box">
                <table>
                  <tr>
                    <th>Imperfective</th>
                    <th>Perfective</th>
                    <th>English</th>
                  </tr>
                  <tr>
                    <td>robić</td>
                    <td>zrobić</td>
                    <td>to do/make</td>
                  </tr>
                  <tr>
                    <td>pisać</td>
                    <td>napisać</td>
                    <td>to write</td>
                  </tr>
                  <tr>
                    <td>kupować</td>
                    <td>kupić</td>
                    <td>to buy</td>
                  </tr>
                  <tr>
                    <td>czytać</td>
                    <td>przeczytać</td>
                    <td>to read</td>
                  </tr>
                </table>
              </div>
            `
          },
          {
            title: "Using Aspects in Context",
            content: `
              <div class="rule-box">
                <h4>Use Imperfective for:</h4>
                <ul>
                  <li>Ongoing actions: <em>teraz czytam</em> (I'm reading now)</li>
                  <li>Habits: <em>codziennie czytam</em> (I read every day)</li>
                  <li>General ability: <em>umiem czytać</em> (I can read)</li>
                </ul>

                <h4>Use Perfective for:</h4>
                <ul>
                  <li>Completed future: <em>jutro przeczytam</em> (I'll read tomorrow)</li>
                  <li>One-time past: <em>wczoraj przeczytałem</em> (I read yesterday)</li>
                  <li>Results: <em>przeczytałem już tę książkę</em> (I've already read this book)</li>
                </ul>
              </div>
            `
          }
        ]
      }
    },
    conditional_mood: {
      title: "Conditional Mood (Tryb Przypuszczający)",
      icon: "🤔",
      difficulty: "Advanced",
      duration: "10 minutes",
      description: "Express hypothetical and conditional situations",
      content: {
        introduction: "The conditional mood expresses hypothetical situations, polite requests, and possibilities. It's formed with past tense + conditional particles.",
        sections: [
          {
            title: "Forming the Conditional",
            content: `
              <p>The conditional is formed by adding conditional particles to the past tense:</p>
              <div class="rule-box">
                <h4>Formation: Past tense + conditional particle</h4>
                <p><strong>Conditional particles:</strong> bym, byś, by, byśmy, byście, by</p>
              </div>
              <div class="table-box">
                <table>
                  <tr>
                    <th>Person</th>
                    <th>Past tense</th>
                    <th>Conditional</th>
                    <th>English</th>
                  </tr>
                  <tr>
                    <td>ja</td>
                    <td>robiłem/łam</td>
                    <td>robiłbym/łabym</td>
                    <td>I would do</td>
                  </tr>
                  <tr>
                    <td>ty</td>
                    <td>robiłeś/łaś</td>
                    <td>robiłbyś/łabyś</td>
                    <td>you would do</td>
                  </tr>
                  <tr>
                    <td>on/ona</td>
                    <td>robił/ła</td>
                    <td>robiłby/łaby</td>
                    <td>he/she would do</td>
                  </tr>
                </table>
              </div>
            `
          },
          {
            title: "Uses of Conditional",
            content: `
              <div class="example-box">
                <h4>Hypothetical situations:</h4>
                <div class="example">
                  <span class="polish">Gdybym miał pieniądze, kupiłbym samochód</span>
                  <span class="english">If I had money, I would buy a car</span>
                </div>

                <h4>Polite requests:</h4>
                <div class="example">
                  <span class="polish">Czy mógłbyś mi pomóc?</span>
                  <span class="english">Could you help me?</span>
                </div>

                <h4>Expressing wishes:</h4>
                <div class="example">
                  <span class="polish">Chciałbym zostać lekarzem</span>
                  <span class="english">I would like to become a doctor</span>
                </div>
              </div>
            `
          },
          {
            title: "Common Conditional Expressions",
            content: `
              <div class="example-box">
                <div class="example">
                  <span class="polish">To byłoby świetnie</span>
                  <span class="english">That would be great</span>
                </div>
                <div class="example">
                  <span class="polish">Moglibyśmy się spotkać</span>
                  <span class="english">We could meet</span>
                </div>
                <div class="example">
                  <span class="polish">Wolałbym kawę</span>
                  <span class="english">I would prefer coffee</span>
                </div>
                <div class="example">
                  <span class="polish">Co byś robił na moim miejscu?</span>
                  <span class="english">What would you do in my place?</span>
                </div>
              </div>
            `
          }
        ]
      }
    }
  };

  const renderLessonContent = (lesson) => {
    return (
      <div className="lesson-content">
        <div className="lesson-intro">
          <p>{lesson.content.introduction}</p>
        </div>

        {lesson.content.sections.map((section, index) => (
          <div key={index} className="lesson-section">
            <h3>{section.title}</h3>
            <div
              className="section-content"
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          </div>
        ))}

        <div className="lesson-actions">
          <button
            onClick={() => onStartPractice(selectedLesson)}
            className="practice-btn"
          >
            Practice This Topic
          </button>
          <button
            onClick={() => setSelectedLesson(null)}
            className="back-to-lessons-btn"
          >
            Back to Lessons
          </button>
        </div>
      </div>
    );
  };

  if (selectedLesson) {
    const lesson = grammarLessons[selectedLesson];
    return (
      <div className="grammar-lessons">
        <div className="lesson-header">
          <button onClick={onBackToDashboard} className="back-btn">← Dashboard</button>
          <div className="lesson-title">
            <span className="lesson-icon">{lesson.icon}</span>
            <h2>{lesson.title}</h2>
          </div>
          <div className="lesson-meta">
            <span className="difficulty">{lesson.difficulty}</span>
            <span className="duration">{lesson.duration}</span>
          </div>
        </div>
        {renderLessonContent(lesson)}
      </div>
    );
  }

  return (
    <div className="grammar-lessons">
      <div className="lessons-header">
        <button onClick={onBackToDashboard} className="back-btn">← Back to Dashboard</button>
        <h2>📚 Grammar Lessons</h2>
        <p className="lessons-subtitle">
          Learn Polish grammar concepts before practicing
        </p>
      </div>

      <div className="lessons-grid">
        {Object.entries(grammarLessons).map(([key, lesson]) => (
          <div
            key={key}
            className="lesson-card"
            data-difficulty={lesson.difficulty}
            onClick={() => setSelectedLesson(key)}
          >
            <div className="lesson-icon-large">{lesson.icon}</div>
            <div className="lesson-info">
              <h3>{lesson.title}</h3>
              <p>{lesson.description}</p>
              <div className="lesson-details">
                <span className="difficulty-badge">{lesson.difficulty}</span>
                <span className="duration-badge">{lesson.duration}</span>
              </div>
            </div>
            <div className="lesson-arrow">→</div>
          </div>
        ))}
      </div>

      <div className="lessons-info">
        <h3>Why Learn Grammar?</h3>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-icon">🎯</div>
            <h4>Better Understanding</h4>
            <p>Know why words change forms and how sentences work</p>
          </div>
          <div className="info-item">
            <div className="info-icon">🚀</div>
            <h4>Faster Progress</h4>
            <p>Learn patterns instead of memorizing individual cases</p>
          </div>
          <div className="info-item">
            <div className="info-icon">💪</div>
            <h4>Confident Communication</h4>
            <p>Build sentences correctly and express yourself clearly</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrammarLessons;