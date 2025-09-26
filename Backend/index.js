const express = require('express');
const cors = require('cors');
const app = express();
const connectDB = require('./config/db');
const mainRoute = require('./routes/index.routes');
require('dotenv').config();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from Express!');
});

app.use('/api', mainRoute); // Handles /api/users

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT,'0.0.0.0', () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
