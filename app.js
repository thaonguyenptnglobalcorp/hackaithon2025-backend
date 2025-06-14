const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { OpenAI } = require('openai');
const {authenticate} = require('./middlewares/auth.js');
const { getModels } = require('./services/openAI.js');
const MAX_LENGTH_PER_LINE_DEFAULT = 100;
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/generate/commit-messages', authenticate, async (req, res) => {
  const { diff, format, apiKey, maxLengthPerLine, customPrompt, model } = req.body;
  let lengthValue = MAX_LENGTH_PER_LINE_DEFAULT;
  if (!diff || !format || !apiKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (maxLengthPerLine && (typeof maxLengthPerLine == 'number' || maxLengthPerLine <= 0)) {
    //convert length to a number if it's a string
    lengthValue = parseInt(maxLengthPerLine, 10);
  }
  let prompt = `
    You are an assistant that writes clear, concise Git commit messages.
    Use the following template: 
      [required <subject line>]
      <BLANK LINE>
      [optional <body>]
      <BLANK LINE>
      [optional <footer(s)>]

    Ensure the commit message follows these rules:
    1. Subject Line: 
      - Format: ${format}
      - Imperative mood
      - No capitalization
      - No period at the end
      - Maximum of ${lengthValue} characters per line including any spaces or special characters
    2. Body (optional):
      - Bullet points with "-"
      - Maximum of ${lengthValue} characters per line including any spaces or special characters
      - Bullet points that exceed the ${lengthValue} characters per line count should use line breaks without adding extra bullet points
      - Explain what and why
      - Be objective
    3. Footer (optional):
      - Format: <token>: <value>
      - Use "BREAKING CHANGE" for major changes
      - Maximum of ${lengthValue} characters per line

    Critical Requirements
      - Output ONLY the commit message
      - NO additional text or explanations
      - NO questions or comments
      - NO formatting instructions or metadata
      - RESPECT the maximum number of 100 characters per line
      - DO NOT wrap the output in any special characters or delimiters such as backticks or quotes

    Given the following staged code diff, generate a clear and concise commit message:
    ${diff}
  `;
  if (customPrompt && customPrompt.trim() !== '') {
    prompt = `
      ${customPrompt}
      Given the following staged code diff, generate a clear and concise commit message:
      ${diff}
      `;
  }

  try {
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    let modelName = model || process.env.CHATGPT_MODEL || 'gpt-4o';
    const response = await openai.chat.completions.create({
      model: modelName,
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

    Critical Requirements
      - NO formatting instructions or metadata
      - RESPECT the maximum number of 100 characters per line
      - DO NOT wrap the output in any special characters or delimiters such as backticks or quotes
      - Output ONLY the review comments
      - NO additional text or explanations

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

app.get('/models', authenticate, async (req, res) => {
  try {
    const { apiKey } = req.body;
    const models = await getModels(apiKey || process.env.OPENAI_API_KEY);
    res.json(models);
  } catch (err) {
    console.error('OpenAI error:', err);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Backend running`);
});
