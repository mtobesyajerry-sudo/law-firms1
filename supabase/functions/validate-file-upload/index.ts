import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// File signature magic bytes for validation
const FILE_SIGNATURES = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/jpg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]], // GIF8
  'application/msword': [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4B, 0x03, 0x04]], // ZIP
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [[0x50, 0x4B, 0x03, 0x04]], // ZIP
  'text/plain': null, // Text files don't have a consistent signature
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (reduced from 50MB)

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fileHash?: string;
}

// Verify file signature matches declared MIME type
function verifyFileSignature(buffer: ArrayBuffer, declaredMimeType: string): boolean {
  const signatures = FILE_SIGNATURES[declaredMimeType as keyof typeof FILE_SIGNATURES];

  // If no signature required (text files), skip validation
  if (signatures === null) return true;

  // If MIME type not recognized, reject
  if (signatures === undefined) return false;

  const bytes = new Uint8Array(buffer);

  // Check if file starts with any of the valid signatures
  for (const signature of signatures) {
    let match = true;
    for (let i = 0; i < signature.length; i++) {
      if (bytes[i] !== signature[i]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }

  return false;
}

// Calculate SHA-256 hash of file
async function calculateFileHash(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          valid: false,
          errors: ["Method not allowed"],
          warnings: [],
        }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get authorization token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          valid: false,
          errors: ["Missing authorization header"],
          warnings: [],
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const declaredMimeType = formData.get("mimeType") as string;

    if (!file) {
      return new Response(
        JSON.stringify({
          valid: false,
          errors: ["No file provided"],
          warnings: [],
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // 1. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      result.valid = false;
      result.errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of 10MB`);
    }

    // 2. Validate MIME type is in allowed list
    const allowedMimeTypes = Object.keys(FILE_SIGNATURES);
    if (!allowedMimeTypes.includes(declaredMimeType)) {
      result.valid = false;
      result.errors.push(`File type ${declaredMimeType} is not allowed`);
    }

    // 3. Verify file signature matches declared MIME type
    const buffer = await file.arrayBuffer();
    const signatureValid = verifyFileSignature(buffer, declaredMimeType);

    if (!signatureValid) {
      result.valid = false;
      result.errors.push(`File signature does not match declared type ${declaredMimeType}. Possible file type spoofing detected.`);
    }

    // 4. Calculate file hash for integrity verification
    if (result.valid) {
      result.fileHash = await calculateFileHash(buffer);
    }

    // 5. Check for duplicate files (optional - adds warning only)
    if (result.fileHash) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Check if file with same hash exists
        const { data: existingDocs, error: dbError } = await supabase
          .from("client_documents")
          .select("id, file_name")
          .eq("file_hash", result.fileHash)
          .limit(1);

        if (!dbError && existingDocs && existingDocs.length > 0) {
          result.warnings.push(`A document with identical content already exists: ${existingDocs[0].file_name}`);
        }
      } catch (err) {
        console.error("Error checking for duplicates:", err);
        // Don't fail validation if duplicate check fails
      }
    }

    // Return validation result
    return new Response(
      JSON.stringify(result),
      {
        status: result.valid ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Validation error:", error);
    return new Response(
      JSON.stringify({
        valid: false,
        errors: ["Server error during file validation"],
        warnings: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
