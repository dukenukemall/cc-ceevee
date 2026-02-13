"use server";

import { createClient } from "@/lib/supabase/server";
import { extractTextFromPdf, extractCandidateName, buildSearchQuery } from "@/lib/pdf";
import { searchTavily } from "@/lib/tavily";
import type { ScanWithResults } from "@/types/scan";

export async function scanCv(formData: FormData): Promise<ScanWithResults> {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");
  console.log("[scanCv] Starting scan for:", file.name);

  const supabase = await createClient();

  // 1. Upload PDF to Supabase Storage
  const filePath = `${Date.now()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("cvs")
    .upload(filePath, buffer, { contentType: "application/pdf" });

  if (uploadError) {
    console.error("[scanCv] Upload error:", uploadError);
    throw new Error("Failed to upload PDF");
  }
  console.log("[scanCv] PDF uploaded to storage:", filePath);

  // 2. Create scan record
  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .insert({
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      status: "processing",
    })
    .select("*")
    .single();

  if (scanError || !scan) {
    console.error("[scanCv] Scan insert error:", scanError);
    throw new Error("Failed to create scan record");
  }
  console.log("[scanCv] Scan record created:", scan.id);

  // 3. Extract text from PDF
  const extractedText = await extractTextFromPdf(buffer);
  const candidateName = extractCandidateName(extractedText);
  const searchQuery = buildSearchQuery(extractedText, candidateName);

  // 4. Search the web with Tavily
  const tavilyResult = await searchTavily(searchQuery);

  // 5. Store results
  const resultRows = tavilyResult.results.map((r) => ({
    scan_id: scan.id,
    title: r.title,
    url: r.url,
    content: r.content,
    score: r.score,
  }));

  if (resultRows.length > 0) {
    const { error: resultsError } = await supabase
      .from("scan_results")
      .insert(resultRows);

    if (resultsError) console.error("[scanCv] Results insert error:", resultsError);
  }

  // 6. Update scan with summary
  const { data: updated, error: updateError } = await supabase
    .from("scans")
    .update({
      extracted_name: candidateName,
      extracted_text: extractedText.slice(0, 5000),
      search_query: searchQuery,
      summary: tavilyResult.answer || "No summary available.",
      status: "completed",
    })
    .eq("id", scan.id)
    .select("*, scan_results(*)")
    .single();

  if (updateError) {
    console.error("[scanCv] Update error:", updateError);
    throw new Error("Failed to update scan");
  }

  console.log("[scanCv] Scan completed:", scan.id);
  return updated as ScanWithResults;
}
