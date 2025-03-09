const express = require('express');
const cors = require('cors'); // Import cors
const app = express();
const dictionaryRoutes = require('./routes/dictionaryRoutes');

app.use(cors()); // 👈 Enable CORS for all domains
app.use(express.json());
app.use('/api', dictionaryRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
