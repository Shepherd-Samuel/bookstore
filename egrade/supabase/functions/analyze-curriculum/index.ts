import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, subject_name, level, term, grade } = await req.json();

    if (!content || !subject_name) {
      throw new Error("Content and subject_name are required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Handle PDF base64 content - extract text using AI vision
    let textContent = content;
    let isPdf = false;
    if (content.startsWith("[PDF_BASE64]")) {
      isPdf = true;
      const base64Data = content.replace("[PDF_BASE64]", "");
      
      // Use AI to extract text from PDF via base64
      const pdfResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract ALL text content from this PDF document. Return the complete text exactly as it appears, preserving structure, headings, tables, and formatting. This is a KICD curriculum design document."
                },
                {
                  type: "image_url",
                  image_url: { url: `data:application/pdf;base64,${base64Data}` }
                }
              ]
            }
          ],
        }),
      });

      if (!pdfResponse.ok) {
        const errText = await pdfResponse.text();
        console.error("PDF extraction error:", pdfResponse.status, errText);
        throw new Error("Failed to extract text from PDF. Try pasting the content instead.");
      }

      const pdfResult = await pdfResponse.json();
      textContent = pdfResult.choices?.[0]?.message?.content || "";
      
      if (!textContent.trim()) {
        throw new Error("Could not extract text from the PDF. Try pasting the content instead.");
      }
    }

    const systemPrompt = `You are a KICD (Kenya Institute of Curriculum Development) curriculum design expert. Your task is to analyze curriculum content and extract structured data following Kenya's CBC (Competency-Based Curriculum) framework.

Extract the following for each lesson/topic found:
- strand: The main strand (e.g., "Numbers", "Algebra", "Geometry")
- sub_strand: The sub-strand within the strand
- specific_learning_outcomes: What the learner should achieve (these are the COMPETENCIES teachers will assess against)
- key_inquiry_questions: Questions that guide learning and probe understanding
- learning_experiences: Activities and experiences for learning — these describe HOW learners demonstrate competency
- resources: Teaching/learning resources needed
- assessment_methods: How to assess learning — these tell teachers what evidence to look for when rating EE/ME/AE/BE
- core_competencies: The CBC core competencies addressed (e.g., Communication and Collaboration, Critical Thinking and Problem Solving, Creativity and Imagination, Citizenship, Digital Literacy, Learning to Learn, Self-efficacy)
- week_number: The week number (1-14)
- lesson_number: The lesson number within the week

IMPORTANT: The specific_learning_outcomes, learning_experiences, and assessment_methods are CRITICAL because teachers use these to determine whether a learner is Exceeding Expectations (EE), Meeting Expectations (ME), Approaching Expectations (AE), or Below Expectations (BE). Be thorough and detailed in extracting these.

The subject is: ${subject_name}
The level/department is: ${level}
The specific grade is: ${grade || level}
${term === "Full Year" ? "This upload covers the FULL ACADEMIC YEAR (all 3 terms). Extract ALL strands and sub-strands for the entire year." : `The term is: ${term}`}

IMPORTANT: A curriculum design is specific to a subject AND a grade. For example, Kiswahili for Grade 7 (Junior Secondary) is completely different from Kiswahili for Grade 8, even though both are in the Junior Secondary department.
${term === "Full Year" ? "Since this is a full-year curriculum, include the term (Term 1, Term 2, or Term 3) for each entry based on where it falls in the academic calendar." : ""}
Return ONLY valid JSON matching the schema provided in the tool call.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this KICD curriculum content and extract structured entries:\n\n${textContent}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_curriculum",
              description: "Extract structured KICD curriculum entries from content",
              parameters: {
                type: "object",
                properties: {
                  entries: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        strand: { type: "string" },
                        sub_strand: { type: "string" },
                        specific_learning_outcomes: { type: "string" },
                        key_inquiry_questions: { type: "string" },
                        learning_experiences: { type: "string" },
                        resources: { type: "string" },
                        assessment_methods: { type: "string" },
                        term: { type: "string", description: "Term 1, Term 2, or Term 3" },
                        week_number: { type: "number" },
                        lesson_number: { type: "number" },
                      },
                      required: ["strand", "sub_strand", "specific_learning_outcomes"],
                      additionalProperties: false,
                    },
                  },
                  summary: { type: "string", description: "Brief summary of what was found" },
                },
                required: ["entries", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_curriculum" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI analysis failed");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const parsed = JSON.parse(toolCall.function.arguments);

    const entries = (parsed.entries || []).map((e: any) => ({
      ...e,
      subject_name,
      level,
      grade: grade || level,
      term: e.term || (term === "Full Year" ? "Term 1" : term),
      week_number: e.week_number || 1,
      lesson_number: e.lesson_number || 1,
    }));

    return new Response(
      JSON.stringify({ entries, summary: parsed.summary || `Extracted ${entries.length} curriculum entries.` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-curriculum error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
