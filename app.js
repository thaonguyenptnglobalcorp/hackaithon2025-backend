const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { OpenAI } = require('openai');
const {authenticate} = require('./middlewares/auth.js');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/generate', authenticate, async (req, res) => {
  const { diff, commitType, format, maxLength } = req.body;

  if (!diff || !commitType || !format || !maxLength) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const prompt = `
    You are an assistant that writes clear, concise Git commit messages.
    Use the following format: ${format}
    Commit type: ${commitType}
    Maximum length: ${maxLength} characters

    Given the following staged code diff, generate a commit message:

    ${diff}
    `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that writes Git commit messages.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const message = response.choices[0].message.content?.trim();
    res.json({ message });
  } catch (err) {
    console.error('OpenAI error:', err);
    res.status(500).json({ error: 'Failed to generate commit message' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Backend running`);
});
