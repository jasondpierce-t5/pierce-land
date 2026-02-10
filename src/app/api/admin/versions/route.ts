import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch all versions ordered by created_at DESC
    const { data, error } = await supabase
      .from('plan_versions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.bank_name || typeof body.bank_name !== 'string' || body.bank_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Field bank_name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (body.bank_name.length > 255) {
      return NextResponse.json(
        { error: 'Field bank_name must not exceed 255 characters' },
        { status: 400 }
      );
    }

    if (!body.slug || typeof body.slug !== 'string' || body.slug.trim().length === 0) {
      return NextResponse.json(
        { error: 'Field slug is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Validate slug format (lowercase alphanumeric with hyphens)
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugPattern.test(body.slug)) {
      return NextResponse.json(
        { error: 'Field slug must be lowercase alphanumeric with hyphens only (e.g., "first-national-bank")' },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const { data: existingSlugs, error: slugCheckError } = await supabase
      .from('plan_versions')
      .select('slug')
      .eq('slug', body.slug);

    if (slugCheckError) {
      throw slugCheckError;
    }

    if (existingSlugs && existingSlugs.length > 0) {
      return NextResponse.json(
        { error: 'A version with this slug already exists' },
        { status: 409 }
      );
    }

    // Validate optional override fields
    if (body.line_of_credit_override !== undefined && body.line_of_credit_override !== null) {
      if (typeof body.line_of_credit_override !== 'number' || isNaN(body.line_of_credit_override)) {
        return NextResponse.json(
          { error: 'Field line_of_credit_override must be a valid number' },
          { status: 400 }
        );
      }
      if (body.line_of_credit_override <= 0) {
        return NextResponse.json(
          { error: 'Field line_of_credit_override must be a positive number' },
          { status: 400 }
        );
      }
    }

    if (body.interest_rate_pct_override !== undefined && body.interest_rate_pct_override !== null) {
      if (typeof body.interest_rate_pct_override !== 'number' || isNaN(body.interest_rate_pct_override)) {
        return NextResponse.json(
          { error: 'Field interest_rate_pct_override must be a valid number' },
          { status: 400 }
        );
      }
      if (body.interest_rate_pct_override < 0 || body.interest_rate_pct_override > 100) {
        return NextResponse.json(
          { error: 'Field interest_rate_pct_override must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    if (body.total_head_override !== undefined && body.total_head_override !== null) {
      if (!Number.isInteger(body.total_head_override)) {
        return NextResponse.json(
          { error: 'Field total_head_override must be a whole number' },
          { status: 400 }
        );
      }
      if (body.total_head_override <= 0) {
        return NextResponse.json(
          { error: 'Field total_head_override must be a positive integer' },
          { status: 400 }
        );
      }
    }

    // Create new version with is_active = true by default
    const { data, error } = await supabase
      .from('plan_versions')
      .insert({
        bank_name: body.bank_name.trim(),
        slug: body.slug,
        is_active: true,
        line_of_credit_override: body.line_of_credit_override ?? null,
        interest_rate_pct_override: body.interest_rate_pct_override ?? null,
        total_head_override: body.total_head_override ?? null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 }
    );
  }
}
