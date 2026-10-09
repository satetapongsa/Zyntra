import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF file exceeds 10MB limit' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const { text, totalPages } = await extractText(new Uint8Array(arrayBuffer));

    // Array of string pages or combined text
    const fullText = Array.isArray(text) ? text.join('\n\n') : (text || '');

    // Clean text and take up to 2500 characters to strictly protect token budget
    const cleanText = fullText
      .replace(/\r\n/g, '\n')
      .replace(/\n\s*\n+/g, '\n\n')
      .trim();

    const truncated = cleanText.slice(0, 2500);

    return NextResponse.json({
      name: file.name,
      pages: totalPages || 1,
      text: truncated,
    });
  } catch (err: any) {
    console.error('PDF parsing error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to extract text from PDF' },
      { status: 500 }
    );
  }
}
