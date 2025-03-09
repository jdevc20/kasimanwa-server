const express = require('express');
const router = express.Router();
const WordController = require('../controllers/dictionaryController');

router.get('/words', WordController.getAllWords);
router.get('/words/:word', WordController.getWordDetails);
router.post('/words', WordController.addWord); 

module.exports = router;
