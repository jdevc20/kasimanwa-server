const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("hiligaynon_dictionary.db");

const WordModel = {
  getAllWords: (callback) => {
    const query = `
      SELECT w.id, w.word, w.pronunciation, w.part_of_speech, 
             GROUP_CONCAT(DISTINCT d.definition, '|') AS definitions
      FROM words w
      LEFT JOIN definitions d ON w.id = d.word_id
      GROUP BY w.id
    `;

    db.all(query, [], callback);
  },

  getWordDetails: (word, callback) => {
    const query = `
      SELECT w.id, w.word, w.pronunciation, w.part_of_speech, w.created_at,
             GROUP_CONCAT(DISTINCT d.definition, '|') AS definitions,
             GROUP_CONCAT(DISTINCT e.example_sentence, '|') AS examples,
             GROUP_CONCAT(DISTINCT s.synonym_id, '|') AS synonyms,
             GROUP_CONCAT(DISTINCT a.antonym_id, '|') AS antonyms,
             GROUP_CONCAT(DISTINCT r.related_id, '|') AS related_words,
             GROUP_CONCAT(DISTINCT src.source_name, '|') AS source_names,
             GROUP_CONCAT(DISTINCT src.url, '|') AS source_urls
      FROM words w
      LEFT JOIN definitions d ON w.id = d.word_id
      LEFT JOIN examples e ON w.id = e.word_id
      LEFT JOIN synonyms s ON w.id = s.word_id
      LEFT JOIN antonyms a ON w.id = a.word_id
      LEFT JOIN related_words r ON w.id = r.word_id
      LEFT JOIN sources src ON w.id = src.word_id
      WHERE LOWER(w.word) = LOWER(?)
      GROUP BY w.id
    `;

    db.get(query, [word], (err, row) => {
      if (err) return callback(err);

      if (!row) return callback(null, null); // No word found

      // Safely convert NULL values to empty arrays
      const formattedData = {
        ...row,
        definitions: row.definitions ? row.definitions.split("|") : [],
        examples: row.examples ? row.examples.split("|") : [],
        synonyms: row.synonyms ? row.synonyms.split("|") : [],
        antonyms: row.antonyms ? row.antonyms.split("|") : [],
        related_words: row.related_words ? row.related_words.split("|") : [],
        sources: row.source_names
          ? row.source_names.split("|").map((name, index) => ({
              name,
              url: row.source_urls ? row.source_urls.split("|")[index] : "",
            }))
          : [],
      };

      callback(null, formattedData);
    });
  },

  addWord: (wordData, callback) => {
    const {
      word,
      pronunciation,
      part_of_speech,
      definitions = [],
      examples = [],
      synonyms = [],
      antonyms = [],
      related_words = [],
      sources = [],
    } = wordData;

    const query = `INSERT INTO words (word, pronunciation, part_of_speech) VALUES (?, ?, ?)`;

    db.run(query, [word, pronunciation, part_of_speech], function (err) {
      if (err) return callback(err);

      const wordId = this.lastID;

      const insertRelatedData = (table, column, values) => {
        if (values.length > 0) {
          values.forEach((value) => {
            db.run(
              `INSERT INTO ${table} (word_id, ${column}) VALUES (?, ?)`,
              [wordId, value],
              (err) => {
                if (err) {
                  console.error(`❌ Error inserting into ${table} (Word ID: ${wordId}):`, err.message);
                }
              }
            );
          });
        }
      };

      insertRelatedData("definitions", "definition", definitions);
      insertRelatedData("examples", "example_sentence", examples);
      insertRelatedData("synonyms", "synonym_id", synonyms);
      insertRelatedData("antonyms", "antonym_id", antonyms);
      insertRelatedData("related_words", "related_id", related_words);

      if (sources.length > 0) {
        sources.forEach(({ name, url }) => {
          db.run(
            "INSERT INTO sources (word_id, source_name, url) VALUES (?, ?, ?)",
            [wordId, name, url],
            (err) => {
              if (err) {
                console.error(`❌ Error inserting into sources (Word ID: ${wordId}):`, err.message);
              }
            }
          );
        });
      }

      callback(null, wordId);
    });
  },
};

module.exports = WordModel;
