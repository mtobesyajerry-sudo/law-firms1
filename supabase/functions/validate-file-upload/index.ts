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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILENAME_LENGTH = 255;

// Allowed extensions — must match the MIME type whitelist above
const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'jpg', 'jpeg', 'png', 'gif',
  'doc', 'docx', 'xls', 'xlsx', 'txt',
]);

// Sanitize a filename: strip path traversal, null bytes, and non-safe characters
function sanitizeFilename(raw: string): { sanitized: string; warnings: string[] } {
  const warnings: string[] = [];
  let name = raw;

  // Null byte removal
  if (name.includes('\x00')) {
    warnings.push('Filename contained null bytes (removed)');
    name = name.replace(/\x00/g, '');
  }

  // Strip path separators / and \
  if (/[\/\\]/.test(name)) {
    warnings.push('Filename contained path separators (removed)');
    name = name.replace(/[\/\\]/g, '');
  }

  // Strip parent-directory traversal sequences
  if (/\.\./.test(name)) {
    warnings.push('Filename contained directory traversal sequences (removed)');
    name = name.replace(/\.\./g, '');
  }

  // Replace characters outside safe set with underscore
  const unsafe = /[^a-zA-Z0-9._\-\s]/g;
  if (unsafe.test(name)) {
    warnings.push('Filename contained unsafe characters (replaced with _)');
    name = name.replace(/[^a-zA-Z0-9._\-\s]/g, '_');
  }

  // Enforce length limit
  if (name.length > MAX_FILENAME_LENGTH) {
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
    name = name.slice(0, MAX_FILENAME_LENGTH - ext.length) + ext;
    warnings.push(`Filename truncated to ${MAX_FILENAME_LENGTH} characters`);
  }

  return { sanitized: name.trim() || 'unnamed', warnings };
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fileHash?: string;
  sanitizedFilename?: string;
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

    // Get authorization token and verify user
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

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          valid: false,
          errors: ["Invalid or expired authentication token"],
          warnings: [],
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse multipart form data — must happen before audit log so we have file context
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const declaredMimeType = formData.get("mimeType") as string;

    // Audit log: record every invocation — wrapped in try/catch so logging NEVER causes a 500
    try {
      const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
        action_type: 'file_validation_attempt',
        event_category: 'security',
        entity_type: 'file_upload',
        action_description: `validate-file-upload invoked for file: ${file?.name ?? 'unknown'}`,
        severity: 'info',
        user_id: user.id,
        changes: {
          user_email: user.email,
          file_name: file?.name ?? null,
          file_size: file?.size ?? null,
          declared_mime_type: declaredMimeType ?? null,
          content_type: req.headers.get('content-type'),
          user_agent: req.headers.get('user-agent'),
        }
      });
      if (auditError) console.error('audit log insert error:', auditError.message);
    } catch (auditErr) {
      console.error('audit log threw unexpectedly:', auditErr);
    }

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

    // 0. Sanitize and validate filename
    const { sanitized: sanitizedFilename, warnings: filenameWarnings } = sanitizeFilename(file.name);
    result.sanitizedFilename = sanitizedFilename;
    result.warnings.push(...filenameWarnings);

    // Reject if filename has no recognised extension after sanitization
    const ext = sanitizedFilename.includes('.')
      ? sanitizedFilename.slice(sanitizedFilename.lastIndexOf('.') + 1).toLowerCase()
      : '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      result.valid = false;
      result.errors.push(`File extension .${ext || '(none)'} is not allowed`);
    }

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
        // Check if file with same hash exists
        const { data: existingDocs, error: dbError } = await supabaseAdmin
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
