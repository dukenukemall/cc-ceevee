export interface Scan {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  extracted_name: string | null;
  extracted_text: string | null;
  search_query: string | null;
  summary: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScanResult {
  id: string;
  scan_id: string;
  title: string;
  url: string;
  content: string | null;
  score: number | null;
  created_at: string;
}

export interface ScanWithResults extends Scan {
  scan_results: ScanResult[];
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilyResponse {
  answer: string;
  results: TavilySearchResult[];
}
