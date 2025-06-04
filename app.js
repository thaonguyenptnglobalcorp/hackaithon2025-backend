const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { OpenAI } = require('openai');
const {authenticate} = require('./middlewares/auth.js');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/generate/commit-messages', authenticate, async (req, res) => {
  const { diff, commitType, format, maxLength, apiKey } = req.body;

  if (!diff || !commitType || !format || !maxLength) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const prompt = `
    You are an assistant that writes clear, concise Git commit messages.
    Use the following format: ${format}
    Commit type: ${commitType}
    Maximum length: ${maxLength} characters

    Given the following staged code diff, generate a clear and concise commit message:
    ${diff}
  `;

  try {
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    const response = await openai.chat.completions.create({
      model: process.env.CHATGPT_MODEL || 'gpt-4o',
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

app.post('/generate/review-comments', authenticate, async (req, res) => {
  const { diff, apiKey } = req.body;

  if (!diff) {
    return res.status(400).json({ error: 'Missing staged code diff' });
  }

  const prompt = `
    I will provide a staged code diff (in unified diff format). Act as a senior software engineer performing a code review.
    Your task is to generate clear, concise, and useful review comments that:
      - Are short (1-3 sentences per comment)
      - Focus on correctness, readability, performance, maintainability, best practices
      - Detect and point out risks such as potential bugs, regressions, or security issues
      - Are easy to read and markdown-friendly
    Each comment should include:
      - File and line reference
      - Brief summary/title
      - Short description of the issue or suggestion
      - Optional quick fix or rationale
      - Prioritize high-impact issues (bugs, risks) first.
      - Avoid long explanations — aim for clean, quick, actionable feedback.
    Ready? I will now paste the staged code diff:
      ${diff}
  `;

  try {
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    const response = await openai.chat.completions.create({
      model: process.env.CHATGPT_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that reviews code changes.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const message = response.choices[0].message.content?.trim();
    res.json({ message });
  } catch (err) {
    console.error('OpenAI error:', err);
    res.status(500).json({ error: 'Failed to generate review comments' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Backend running`);
});
