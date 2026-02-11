import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data, error } = await supabase
      .from('plan_versions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching version:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id } = params;

    // Verify version exists
    const { data: existingVersion, error: fetchError } = await supabase
      .from('plan_versions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingVersion) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Validate bank_name if provided
    if (body.bank_name !== undefined) {
      if (typeof body.bank_name !== 'string' || body.bank_name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Field bank_name must be a non-empty string' },
          { status: 400 }
        );
      }
      if (body.bank_name.length > 255) {
        return NextResponse.json(
          { error: 'Field bank_name must not exceed 255 characters' },
          { status: 400 }
        );
      }
    }

    // Validate slug if provided
    if (body.slug !== undefined) {
      if (typeof body.slug !== 'string' || body.slug.trim().length === 0) {
        return NextResponse.json(
          { error: 'Field slug must be a non-empty string' },
          { status: 400 }
        );
      }

      // Validate slug format
      const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugPattern.test(body.slug)) {
        return NextResponse.json(
          { error: 'Field slug must be lowercase alphanumeric with hyphens only (e.g., "first-national-bank")' },
          { status: 400 }
        );
      }

      // Check slug uniqueness (exclude current record)
      const { data: existingSlugs, error: slugCheckError } = await supabase
        .from('plan_versions')
        .select('slug')
        .eq('slug', body.slug)
        .neq('id', id);

      if (slugCheckError) {
        throw slugCheckError;
      }

      if (existingSlugs && existingSlugs.length > 0) {
        return NextResponse.json(
          { error: 'A version with this slug already exists' },
          { status: 409 }
        );
      }
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

    // Build update object with only provided fields
    const updateData: any = {};
    if (body.bank_name !== undefined) updateData.bank_name = body.bank_name.trim();
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.override_loc_amount !== undefined) {
      updateData.override_loc_amount = body.override_loc_amount;
    }
    if (body.override_interest_rate_pct !== undefined) {
      updateData.override_interest_rate_pct = body.override_interest_rate_pct;
    }
    if (body.override_head_count !== undefined) {
      updateData.override_head_count = body.override_head_count;
    }

    // Update version
    const { data, error } = await supabase
      .from('plan_versions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating version:', error);
    return NextResponse.json(
      { error: 'Failed to update version' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Verify version exists
    const { data: existingVersion, error: fetchError } = await supabase
      .from('plan_versions')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingVersion) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting is_active = false
    const { error } = await supabase
      .from('plan_versions')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Version deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating version:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate version' },
      { status: 500 }
    );
  }
}
