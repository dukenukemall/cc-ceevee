// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse-new");

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  console.log("[pdf] Parsing PDF, size:", buffer.length);
  const data = await pdfParse(buffer);
  console.log("[pdf] Extracted text length:", data.text.length);
  return data.text;
}

export function extractCandidateName(text: string): string | null {
  // Heuristic: first non-empty line is often the name
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const firstLine = lines[0];
  // Likely a name if it's short and doesn't contain common non-name patterns
  if (firstLine.length < 60 && !/[@|http|www|resume|curriculum|cv]/i.test(firstLine)) {
    console.log("[pdf] Extracted candidate name:", firstLine);
    return firstLine;
  }
  return null;
}

export function buildSearchQuery(text: string, name: string | null): string {
  // Extract key details for a focused search
  const keywords: string[] = [];
  if (name) keywords.push(name);

  // Look for company names, titles, skills in first 500 chars
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
