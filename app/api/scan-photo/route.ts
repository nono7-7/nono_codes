import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const PROMPT = `You are a contact information extractor. Analyse this image — it may be a photo of a handwritten notebook, a business card, a printed contact list, or any mix of these.

Extract every individual person's contact details you can find. For each person return an object with these fields (use empty string "" if not visible):
- name: full name
- phone: phone number including country code if shown
- email: email address
- linkedinUrl: full LinkedIn URL or just the path if partial (e.g. linkedin.com/in/johnsmith)
- company: company or organisation name
- role: job title or role
- notes: any other useful context (how they met, event name, location, etc.)

Return ONLY a valid JSON array — no markdown, no explanation, nothing else.

Example output:
[{"name":"Sarah Chen","phone":"+44 7700 900000","email":"sarah@example.com","company":"Goldman Sachs","role":"Analyst","linkedinUrl":"","notes":"Met at GS summer event"}]

If no contacts are found, return an empty array: []`;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured on server' }, { status: 500 });
  }

  try {
    const { image, mediaType } = await req.json() as { image: string; mediaType: string };

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: image },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ contacts: [] });

    const contacts = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ contacts });
  } catch (e) {
    console.error('Photo scan error:', e);
    return NextResponse.json({ error: 'Failed to process image. Please try again.' }, { status: 500 });
  }
}
