"use server";

import { createClient } from "@/lib/supabase/server";
import { extractTextFromPdf, extractCandidateName, buildSearchQuery } from "@/lib/pdf";
import { searchTavily } from "@/lib/tavily";
import type { ScanWithResults } from "@/types/scan";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function scanCv(
  formData: FormData
): Promise<{ data?: ScanWithResults; error?: string }> {
  const file = formData.get("file") as File;
  if (!file) return { error: "No file provided" };
  if (file.size > MAX_FILE_SIZE) return { error: "File too large. Maximum 10MB." };
  if (file.type !== "application/pdf") return { error: "Only PDF files are supported." };

  console.log("[scanCv] Starting scan for:", file.name, "size:", file.size);

  let supabase;
  try {
    supabase = await createClient();
  } catch (err) {
    console.error("[scanCv] Supabase client error:", err);
    return { error: "Failed to connect to database." };
  }

  // 1. Upload PDF to Supabase Storage
  const filePath = `${Date.now()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("cvs")
    .upload(filePath, buffer, { contentType: "application/pdf" });

  if (uploadError) {
    console.error("[scanCv] Upload error:", uploadError.message);
    return { error: `Storage upload failed: ${uploadError.message}` };
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
    console.error("[scanCv] Scan insert error:", scanError?.message);
    // Cleanup uploaded file
    await supabase.storage.from("cvs").remove([filePath]);
    return { error: `Failed to create scan record: ${scanError?.message}` };
  }
  console.log("[scanCv] Scan record created:", scan.id);

  // 3. Extract text from PDF
  let extractedText: string;
  try {
    extractedText = await extractTextFromPdf(buffer);
  } catch (err) {
    console.error("[scanCv] PDF parse error:", err);
    await supabase.from("scans").update({ status: "failed", error_message: "PDF parsing failed" }).eq("id", scan.id);
    return { error: "Failed to read PDF content. Make sure it's a valid PDF." };
  }

  const candidateName = extractCandidateName(extractedText);
  const searchQuery = buildSearchQuery(extractedText, candidateName);

  // 4. Search the web with Tavily
  let tavilyResult;
  try {
    tavilyResult = await searchTavily(searchQuery);
  } catch (err) {
    console.error("[scanCv] Tavily error:", err);
    await supabase.from("scans").update({ status: "failed", error_message: "Web search failed" }).eq("id", scan.id);
    return { error: "Web search failed. Please try again." };
  }

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
    if (resultsError) console.error("[scanCv] Results insert error:", resultsError.message);
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

  if (updateError || !updated) {
    console.error("[scanCv] Update error:", updateError?.message);
    return { error: "Failed to save scan results." };
  }

  console.log("[scanCv] Scan completed:", scan.id);
  return { data: updated as ScanWithResults };
}
