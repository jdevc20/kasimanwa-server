const WordModel = require("../models/word");

const DictionaryController = {
  getAllWords: (req, res) => {
    WordModel.getAllWords((err, words) => {
      if (err) {
        console.error("❌ Database Error (getAllWords):", err.message);
        return res.status(500).json({ error: err.message }); // Show actual error
      }

      res.json(words.map((word) => ({
        ...word,
        definitions: word.definitions ? word.definitions.split(",") : [],
      })));
    });
  },

  getWordDetails: (req, res) => {
    const { word } = req.params;
    WordModel.getWordDetails(word, (err, wordData) => {
      if (err) {
        console.error("❌ Database Error (getWordDetails):", err.message);
        return res.status(500).json({ error: err.message });
      }
      if (!wordData) return res.status(404).json({ message: "Word not found." });

      res.json(wordData);
    });
  },

  addWord: (req, res) => {
    const {
      word, pronunciation, part_of_speech, definitions = [],
      examples = [], synonyms = [], antonyms = [], related_words = [], sources = []
    } = req.body;

    if (!word || !part_of_speech || definitions.length === 0) {
      return res.status(400).json({ error: "Required fields: word, part_of_speech, and at least one definition." });
    }

    WordModel.addWord({ word, pronunciation, part_of_speech, definitions, examples, synonyms, antonyms, related_words, sources },
      (err, wordId) => {
        if (err) {
          console.error("❌ Database Error (addWord):", err.message);
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Word added successfully", word_id: wordId });
      });
  },
};

module.exports = DictionaryController;
