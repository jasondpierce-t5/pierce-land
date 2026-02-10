import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    // Build update object with only provided fields
    const updateData: any = {};
    if (body.bank_name !== undefined) updateData.bank_name = body.bank_name.trim();
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.line_of_credit_override !== undefined) {
      updateData.line_of_credit_override = body.line_of_credit_override;
    }
    if (body.interest_rate_pct_override !== undefined) {
      updateData.interest_rate_pct_override = body.interest_rate_pct_override;
    }
    if (body.total_head_override !== undefined) {
      updateData.total_head_override = body.total_head_override;
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
