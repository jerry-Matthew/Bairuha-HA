/**
 * POST /api/media/tts
 * 
 * Generate text-to-speech audio
 * 
 * Security features:
 * - Authentication required
 * - Input validation and sanitization
 * - Rate limiting
 * - No API keys exposed to client
 * - Text length limits
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import rateLimit from "@/lib/rate-limit";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { query } from "@/lib/db";

/**
 * Ensure TTS table exists, create it if it doesn't
 * This is called automatically on first use (similar to Sequelize auto-migration)
 */
async function ensureTTSTable() {
  try {
    // Check if table exists
    const tableExists = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tts_entries'
      );`
    );

    if (!tableExists[0]?.exists) {
      // Table doesn't exist, create it
      await query(`
        CREATE TABLE tts_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          text TEXT NOT NULL,
          language VARCHAR(10) NOT NULL,
          voice VARCHAR(100),
          file_path VARCHAR(500) NOT NULL,
          url VARCHAR(500) NOT NULL,
          size BIGINT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_tts_entries_user FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);

      // Create indexes (using IF NOT EXISTS to handle race conditions)
      await query(`
        CREATE INDEX IF NOT EXISTS idx_tts_entries_user_id ON tts_entries(user_id);
        CREATE INDEX IF NOT EXISTS idx_tts_entries_created_at ON tts_entries(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_tts_entries_language ON tts_entries(language);
      `);
      
      console.log("✅ TTS table created automatically");
    }
  } catch (error: any) {
    // If table already exists or other error, log but don't fail
    // This handles race conditions where multiple requests try to create the table
    if (error.code !== "42P07") { // 42P07 = duplicate_table
      console.error("Error ensuring TTS table:", error.message);
    }
  }
}

// Rate limiting: 10 TTS requests per 5 minutes per user
const limiter = rateLimit({
  interval: 5 * 60 * 1000, // 5 minutes
  uniqueTokenPerInterval: 500,
});

const MAX_TEXT_LENGTH = 5000;
const ALLOWED_LANGUAGES = ["en", "es", "fr", "de", "it", "pt"];

// Language code mapping for Google TTS
const LANGUAGE_CODES: Record<string, string> = {
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  it: "it",
  pt: "pt",
};

/**
 * Generate TTS audio using Google Translate TTS API
 * This is a free service that doesn't require API keys
 */
async function generateTTSAudio(text: string, language: string): Promise<Buffer> {
  const langCode = LANGUAGE_CODES[language] || "en";
  
  // Encode text for URL
  const encodedText = encodeURIComponent(text);
  
  // Google Translate TTS endpoint (free, no API key required)
  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodedText}`;
  
  try {
    const response = await fetch(ttsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`TTS API returned status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error: any) {
    console.error("TTS API error:", error);
    throw new Error(`Failed to generate TTS audio: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = authenticate(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const user = authResult.user;

    // Ensure TTS table exists (auto-create on first use)
    await ensureTTSTable();

    // Rate limiting
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
    await limiter.check(10, `${user.userId}-${ip}`);

    // Parse request body
    const body = await request.json();
    const { text, language, voice } = body;

    // Validate input
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (language && !ALLOWED_LANGUAGES.includes(language)) {
      return NextResponse.json(
        { error: `Invalid language. Allowed: ${ALLOWED_LANGUAGES.join(", ")}` },
        { status: 400 }
      );
    }

    // Sanitize text (remove potentially dangerous characters)
    const sanitizedText = text
      .replace(/[<>]/g, "")
      .trim()
      .substring(0, MAX_TEXT_LENGTH);

    if (!sanitizedText) {
      return NextResponse.json(
        { error: "Text cannot be empty" },
        { status: 400 }
      );
    }

    // Generate TTS audio
    const lang = language || "en";
    const audioBuffer = await generateTTSAudio(sanitizedText, lang);

    // Create TTS uploads directory if it doesn't exist
    const ttsDir = join(process.cwd(), "public", "uploads", "tts");
    if (!existsSync(ttsDir)) {
      await mkdir(ttsDir, { recursive: true });
    }

    // Save audio file
    const audioId = randomUUID();
    const fileName = `${audioId}.mp3`;
    const filePath = join(ttsDir, fileName);
    await writeFile(filePath, audioBuffer);

    // Generate URL
    const audioUrl = `/uploads/tts/${fileName}`;
    const dbFilePath = `/uploads/tts/${fileName}`;
    const fileSize = audioBuffer.length;

    // Save TTS entry to database
    const [ttsEntry] = await query(
      `INSERT INTO tts_entries (user_id, text, language, voice, file_path, url, size)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, text, language, voice, url, created_at`,
      [
        user.userId,
        sanitizedText,
        lang,
        voice || null,
        dbFilePath,
        audioUrl,
        fileSize,
      ]
    );

    return NextResponse.json({
      id: ttsEntry.id,
      audioUrl: ttsEntry.url,
      text: ttsEntry.text,
      language: ttsEntry.language,
      voice: ttsEntry.voice,
      createdAt: ttsEntry.created_at,
    });
  } catch (error: any) {
    console.error("TTS error:", error);

    if (error.message?.includes("rate limit")) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate speech" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/media/tts
 * 
 * Retrieve all TTS entries for the authenticated user
 * 
 * Security features:
 * - Authentication required
 * - User-scoped queries (users can only see their own entries)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = authenticate(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const user = authResult.user;

    // Ensure TTS table exists (auto-create on first use)
    await ensureTTSTable();

    // Fetch user's TTS entries
    const entries = await query(
      `SELECT id, text, language, voice, url, size, created_at
       FROM tts_entries
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user.userId]
    );

    return NextResponse.json(
      { entries },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("List TTS entries error:", error);
    return NextResponse.json(
      { error: "Failed to load TTS entries" },
      { status: 500 }
    );
  }
}

