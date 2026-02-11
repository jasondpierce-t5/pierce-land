import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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
    if (body.override_loc_amount !== undefined && body.override_loc_amount !== null) {
      if (typeof body.override_loc_amount !== 'number' || isNaN(body.override_loc_amount)) {
        return NextResponse.json(
          { error: 'Field override_loc_amount must be a valid number' },
          { status: 400 }
        );
      }
      if (body.override_loc_amount <= 0) {
        return NextResponse.json(
          { error: 'Field override_loc_amount must be a positive number' },
          { status: 400 }
        );
      }
    }

    if (body.override_interest_rate_pct !== undefined && body.override_interest_rate_pct !== null) {
      if (typeof body.override_interest_rate_pct !== 'number' || isNaN(body.override_interest_rate_pct)) {
        return NextResponse.json(
          { error: 'Field override_interest_rate_pct must be a valid number' },
          { status: 400 }
        );
      }
      if (body.override_interest_rate_pct < 0 || body.override_interest_rate_pct > 100) {
        return NextResponse.json(
          { error: 'Field override_interest_rate_pct must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    if (body.override_head_count !== undefined && body.override_head_count !== null) {
      if (!Number.isInteger(body.override_head_count)) {
        return NextResponse.json(
          { error: 'Field override_head_count must be a whole number' },
          { status: 400 }
        );
      }
      if (body.override_head_count <= 0) {
        return NextResponse.json(
          { error: 'Field override_head_count must be a positive integer' },
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
        override_loc_amount: body.override_loc_amount ?? null,
        override_interest_rate_pct: body.override_interest_rate_pct ?? null,
        override_head_count: body.override_head_count ?? null,
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
