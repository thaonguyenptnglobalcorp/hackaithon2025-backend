const { OpenAI } = require('openai');

async function getModels(apiKey){
  try {
    const openai = new OpenAI({
        apiKey: apiKey,
    });
    const models = await openai.models.list();
    return models.data.map(model => model.id);
  } catch (error) {
    console.error('Error fetching models:', error);
    throw error;
  }
}
module.exports = { getModels };