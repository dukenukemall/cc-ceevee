import type { TavilyResponse } from "@/types/scan";

const TAVILY_API_URL = "https://api.tavily.com/search";

export async function searchTavily(query: string): Promise<TavilyResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY is not set");

  console.log("[tavily] Searching for:", query);

  const response = await fetch(TAVILY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      max_results: 8,
      include_answer: true,
      topic: "general",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[tavily] API error:", response.status, text);
    throw new Error(`Tavily API error: ${response.status}`);
  }

  const data = await response.json();
  console.log("[tavily] Results found:", data.results?.length);
  return data as TavilyResponse;
}
