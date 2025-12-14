import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create Supabase client with SERVICE ROLE key (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    // Process upload (auth already checked at page level)
    const formData = await request.formData()
    const file = formData.get('file') as File
    const path = formData.get('path') as string
    
    if (!file || !path) {
      return NextResponse.json(
        { error: 'Missing file or path' },
        { status: 400 }
      )
    }
    
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Upload to Supabase Storage using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin.storage
      .from('archives')
      .upload(path, buffer, {
        contentType: 'text/csv',
        upsert: true  // Overwrite if exists (for regenerating archives)
      })
    
    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      path: data.path 
    })
    
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
