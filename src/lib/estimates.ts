/**
 * Photo estimate service — GPT-4o vision for AI-based estimates from customer photos.
 */

export async function generateEstimateFromPhotos(photoUrls: string[], serviceType: string) {
  if (!process.env.OPENAI_API_KEY) {
    return { suggested: null, description: 'AI estimate requires OpenAI API key. Configure in .env', confidence: 0 };
  }
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const content: any[] = [{ type: 'text', text: `You are an estimate generator for ${serviceType} services. Based on these photos, describe the issue and suggest a fair price range. Be conservative.` }];
    for (const url of photoUrls) {
      content.push({ type: 'image_url', image_url: { url, detail: 'high' } });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content }],
      max_tokens: 500,
    });

    const text = response.choices?.[0]?.message?.content || '';
    // Extract price from response
    const priceMatch = text.match(/\$(\d+(?:,\d{3})?(?:\.\d{2})?)/);
    const suggestedPrice = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : null;

    return { suggested: suggestedPrice, description: text, confidence: suggestedPrice ? 0.7 : 0.3 };
  } catch (err: any) {
    console.error('AI estimate failed:', err);
    return { suggested: null, description: 'AI estimate unavailable. Please provide a manual quote.', confidence: 0 };
  }
}
