const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("hiligaynon_dictionary.db");

const WordModel = {
  // ✅ Get all words with definitions
  getAllWords: (callback) => {
    const query = `
      SELECT w.id, w.word, w.pronunciation, w.part_of_speech, 
             COALESCE(GROUP_CONCAT(DISTINCT d.definition), '')  AS definitions
      FROM words w
      LEFT JOIN definitions d ON w.id = d.word_id
      GROUP BY w.id
    `;

    db.all(query, [], callback);
  },

  // ✅ Get details of a specific word
  getWordDetails: (word, callback) => {
    const query = `
SELECT 
    w.id, 
    w.word, 
    w.pronunciation, 
    w.part_of_speech, 
    w.created_at,
    
    COALESCE((SELECT GROUP_CONCAT(definition, '|') 
              FROM (SELECT DISTINCT d.definition FROM definitions d WHERE d.word_id = w.id)), '') AS definitions,

    COALESCE((SELECT GROUP_CONCAT(example_sentence, '|') 
              FROM (SELECT DISTINCT e.example_sentence FROM examples e WHERE e.word_id = w.id)), '') AS examples,

    COALESCE((SELECT GROUP_CONCAT(word, '|') 
              FROM (SELECT DISTINCT s_word.word 
                    FROM synonyms s 
                    JOIN words s_word ON s.synonym_id = s_word.id 
                    WHERE s.word_id = w.id)), '') AS synonyms,

    COALESCE((SELECT GROUP_CONCAT(word, '|') 
              FROM (SELECT DISTINCT a_word.word 
                    FROM antonyms a 
                    JOIN words a_word ON a.antonym_id = a_word.id 
                    WHERE a.word_id = w.id)), '') AS antonyms,

    COALESCE((SELECT GROUP_CONCAT(word, '|') 
              FROM (SELECT DISTINCT r_word.word 
                    FROM related_words r 
                    JOIN words r_word ON r.related_id = r_word.id 
                    WHERE r.word_id = w.id)), '') AS related_words,

    COALESCE((SELECT GROUP_CONCAT(source_name, '|') 
              FROM (SELECT DISTINCT src.source_name 
                    FROM sources src 
                    WHERE src.word_id = w.id)), '') AS source_names,

    COALESCE((SELECT GROUP_CONCAT(url, '|') 
              FROM (SELECT DISTINCT src.url 
                    FROM sources src 
                    WHERE src.word_id = w.id)), '') AS source_urls

FROM words w
WHERE LOWER(w.word) = LOWER(?);
    `;

    db.get(query, [word], (err, row) => {
      if (err) return callback(err);

      if (!row) return callback(null, null); // No word found

      const formattedData = {
        ...row,
        definitions: row.definitions ? row.definitions.split("|") : [],
        examples: row.examples ? row.examples.split("|") : [],
        synonyms: row.synonyms ? row.synonyms.split(",").map(Number) : [],
        antonyms: row.antonyms ? row.antonyms.split(",").map(Number) : [],
        related_words: row.related_words
          ? row.related_words.split(",").map(Number)
          : [],
        sources: row.source_names
          ? row.source_names.split(",").map((name, index) => ({
              name,
              url: row.source_urls ? row.source_urls.split(",")[index] : "",
            }))
          : [],
      };

      callback(null, formattedData);
    });
  },

  // ✅ Add a new word with related data
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
                  console.error(
                    `❌ Error inserting into ${table} (Word ID: ${wordId}):`,
                    err.message
                  );
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
                console.error(
                  `❌ Error inserting into sources (Word ID: ${wordId}):`,
                  err.message
                );
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
