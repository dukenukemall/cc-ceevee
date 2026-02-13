import { extractText, getDocumentProxy } from "unpdf";

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  console.log("[pdf] Parsing PDF, size:", buffer.length);
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  console.log("[pdf] Extracted text length:", text.length);
  return text;
}

export function extractCandidateName(text: string): string | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const firstLine = lines[0];
  if (firstLine.length < 60 && !/[@|http|www|resume|curriculum|cv]/i.test(firstLine)) {
    console.log("[pdf] Extracted candidate name:", firstLine);
    return firstLine;
  }
  return null;
}

export function buildSearchQuery(text: string, name: string | null): string {
  const keywords: string[] = [];
  if (name) keywords.push(name);

  const snippet = text.slice(0, 500).toLowerCase();
  const patterns = [/linkedin/i, /github/i];
  patterns.forEach((p) => {
    if (p.test(snippet)) keywords.push(p.source);
  });

  const query = name
    ? `${name} professional background work experience`
    : `candidate profile: ${text.slice(0, 200)}`;

  console.log("[pdf] Built search query:", query);
  return query;
}
