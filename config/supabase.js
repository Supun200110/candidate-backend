import { createClient } from '@supabase/supabase-js';
import path from 'path';

let supabaseClient = null;

export function getSupabase() {
    if (supabaseClient) {
        return supabaseClient;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("your_supabase")) {
        throw new Error(
            "Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_KEY (or SUPABASE_SERVICE_ROLE_KEY) in your .env file."
        );
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
    return supabaseClient;
}

/**
 * Uploads a file buffer to Supabase Storage and returns its public URL
 * @param {Object} file - Multer file object with buffer, originalname, mimetype
 * @param {string} folder - Destination folder in bucket (e.g., 'candidates', 'party-symbols')
 * @returns {Promise<{ url: string, path: string }>}
 */
export async function uploadToSupabase(file, folder = 'uploads') {
    if (!file || !file.buffer) {
        throw new Error("No file buffer provided for upload.");
    }

    const supabase = getSupabase();
    const bucket = process.env.SUPABASE_BUCKET || 'candidate-images';

    const ext = path.extname(file.originalname || '') || '.jpg';
    const baseName = path.basename(file.originalname || 'image', ext)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 30);
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const filePath = `${folder}/${uniqueSuffix}_${baseName}${ext}`;

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file.buffer, {
            contentType: file.mimetype || 'image/jpeg',
            upsert: true
        });

    if (error) {
        if (error.message?.toLowerCase().includes("bucket not found") || error.statusCode === "404" || error.status === 404) {
            throw new Error(
                `Supabase bucket '${bucket}' not found. Please create a public bucket named '${bucket}' in your Supabase dashboard under Storage.`
            );
        }
        throw new Error(`Supabase storage error: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

    return {
        url: publicUrlData.publicUrl,
        path: data.path
    };
}
