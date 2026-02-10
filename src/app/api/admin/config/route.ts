import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Query singleton config row
    const { data, error } = await supabase
      .from('plan_config')
      .select('*')
      .single();

    if (error) {
      // Check if table exists but no row found
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Configuration not found. Please ensure seed data has been applied.' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // =========================================================================
    // Validate required fields (all 43 config fields)
    // =========================================================================
    const requiredFields = [
      // Original fields (11)
      'market_price_500lb',
      'market_price_850lb',
      'hay_price_per_ton',
      'feed_cost_per_day',
      'purchase_weight_lbs',
      'sale_weight_lbs',
      'avg_daily_gain_lbs',
      'mortality_rate_pct',
      'interest_rate_pct',
      'loc_amount',
      'head_count',
      // Sale scenarios (2)
      'sale_price_low_per_cwt',
      'sale_price_high_per_cwt',
      // Spring turn (10)
      'spring_sale_weight_lbs',
      'spring_days_on_feed',
      'spring_health_cost_per_head',
      'spring_freight_in_per_head',
      'spring_mineral_cost_per_head',
      'spring_lrp_premium_per_head',
      'spring_marketing_commission_per_head',
      'spring_freight_out_per_head',
      'spring_death_loss_pct',
      'spring_misc_per_head',
      // Winter turn (10)
      'winter_sale_weight_lbs',
      'winter_days_on_feed',
      'winter_health_cost_per_head',
      'winter_freight_in_per_head',
      'winter_mineral_cost_per_head',
      'winter_lrp_premium_per_head',
      'winter_marketing_commission_per_head',
      'winter_freight_out_per_head',
      'winter_death_loss_pct',
      'winter_misc_per_head',
      // Winter feed (6)
      'hay_price_per_bale',
      'hay_bale_weight_lbs',
      'hay_daily_intake_lbs',
      'hay_waste_pct',
      'commodity_price_per_ton',
      'commodity_daily_intake_lbs',
    ];

    const missingFields = requiredFields.filter((field) => !(field in body));
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // =========================================================================
    // Validate string fields (operator info)
    // =========================================================================
    const stringFields = ['operator_name', 'operation_location'];
    for (const field of stringFields) {
      if (field in body) {
        if (typeof body[field] !== 'string' || body[field].trim().length === 0) {
          return NextResponse.json(
            { error: `Field ${field} must be a non-empty string` },
            { status: 400 }
          );
        }
        if (body[field].length > 255) {
          return NextResponse.json(
            { error: `Field ${field} must be 255 characters or less` },
            { status: 400 }
          );
        }
      }
    }

    // =========================================================================
    // Validate numeric fields (must be valid numbers >= 0)
    // =========================================================================
    const numericFields = [
      // Original numeric fields
      'market_price_500lb',
      'market_price_850lb',
      'hay_price_per_ton',
      'feed_cost_per_day',
      'avg_daily_gain_lbs',
      'mortality_rate_pct',
      'interest_rate_pct',
      'loc_amount',
      // Sale scenarios
      'sale_price_low_per_cwt',
      'sale_price_high_per_cwt',
      // Spring turn costs
      'spring_health_cost_per_head',
      'spring_freight_in_per_head',
      'spring_mineral_cost_per_head',
      'spring_lrp_premium_per_head',
      'spring_marketing_commission_per_head',
      'spring_freight_out_per_head',
      'spring_death_loss_pct',
      'spring_misc_per_head',
      // Winter turn costs
      'winter_health_cost_per_head',
      'winter_freight_in_per_head',
      'winter_mineral_cost_per_head',
      'winter_lrp_premium_per_head',
      'winter_marketing_commission_per_head',
      'winter_freight_out_per_head',
      'winter_death_loss_pct',
      'winter_misc_per_head',
      // Winter feed
      'hay_price_per_bale',
      'hay_daily_intake_lbs',
      'hay_waste_pct',
      'commodity_price_per_ton',
      'commodity_daily_intake_lbs',
    ];

    for (const field of numericFields) {
      if (typeof body[field] !== 'number' || isNaN(body[field])) {
        return NextResponse.json(
          { error: `Field ${field} must be a valid number` },
          { status: 400 }
        );
      }
      if (body[field] < 0) {
        return NextResponse.json(
          { error: `Field ${field} must be a positive number` },
          { status: 400 }
        );
      }
    }

    // =========================================================================
    // Validate positive numeric fields (must be > 0)
    // =========================================================================
    const positiveNumericFields = [
      'market_price_500lb',
      'market_price_850lb',
      'sale_price_low_per_cwt',
      'sale_price_high_per_cwt',
      'hay_price_per_bale',
      'commodity_price_per_ton',
    ];

    for (const field of positiveNumericFields) {
      if (body[field] <= 0) {
        return NextResponse.json(
          { error: `Field ${field} must be greater than zero` },
          { status: 400 }
        );
      }
    }

    // =========================================================================
    // Validate integer fields (must be whole numbers > 0)
    // =========================================================================
    const integerFields = [
      'purchase_weight_lbs',
      'sale_weight_lbs',
      'head_count',
      'spring_sale_weight_lbs',
      'spring_days_on_feed',
      'winter_sale_weight_lbs',
      'winter_days_on_feed',
      'hay_bale_weight_lbs',
    ];

    for (const field of integerFields) {
      if (!Number.isInteger(body[field])) {
        return NextResponse.json(
          { error: `Field ${field} must be a whole number` },
          { status: 400 }
        );
      }
      if (body[field] <= 0) {
        return NextResponse.json(
          { error: `Field ${field} must be a positive integer` },
          { status: 400 }
        );
      }
    }

    // Validate operator info integer fields (can be 0 for years_experience)
    if ('acres' in body) {
      if (!Number.isInteger(body.acres) || body.acres <= 0) {
        return NextResponse.json(
          { error: 'Field acres must be a positive integer' },
          { status: 400 }
        );
      }
    }

    if ('years_experience' in body) {
      if (!Number.isInteger(body.years_experience) || body.years_experience < 0) {
        return NextResponse.json(
          { error: 'Field years_experience must be a non-negative integer' },
          { status: 400 }
        );
      }
    }

    // =========================================================================
    // Validate percentage fields (must be 0-100)
    // =========================================================================
    const percentageFields = [
      'mortality_rate_pct',
      'spring_death_loss_pct',
      'winter_death_loss_pct',
      'hay_waste_pct',
    ];

    for (const field of percentageFields) {
      if (body[field] < 0 || body[field] > 100) {
        return NextResponse.json(
          { error: `Field ${field} must be between 0 and 100` },
          { status: 400 }
        );
      }
    }

    // =========================================================================
    // Update the singleton row (two-stage: SELECT id, then UPDATE WHERE id)
    // =========================================================================
    const { data: currentConfig, error: fetchError } = await supabase
      .from('plan_config')
      .select('id')
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    // Build the update object with all fields
    const updateData: Record<string, unknown> = {
      // Original fields
      market_price_500lb: body.market_price_500lb,
      market_price_850lb: body.market_price_850lb,
      hay_price_per_ton: body.hay_price_per_ton,
      feed_cost_per_day: body.feed_cost_per_day,
      purchase_weight_lbs: body.purchase_weight_lbs,
      sale_weight_lbs: body.sale_weight_lbs,
      avg_daily_gain_lbs: body.avg_daily_gain_lbs,
      mortality_rate_pct: body.mortality_rate_pct,
      interest_rate_pct: body.interest_rate_pct,
      loc_amount: body.loc_amount,
      head_count: body.head_count,
      // Sale scenarios
      sale_price_low_per_cwt: body.sale_price_low_per_cwt,
      sale_price_high_per_cwt: body.sale_price_high_per_cwt,
      // Spring turn
      spring_sale_weight_lbs: body.spring_sale_weight_lbs,
      spring_days_on_feed: body.spring_days_on_feed,
      spring_health_cost_per_head: body.spring_health_cost_per_head,
      spring_freight_in_per_head: body.spring_freight_in_per_head,
      spring_mineral_cost_per_head: body.spring_mineral_cost_per_head,
      spring_lrp_premium_per_head: body.spring_lrp_premium_per_head,
      spring_marketing_commission_per_head: body.spring_marketing_commission_per_head,
      spring_freight_out_per_head: body.spring_freight_out_per_head,
      spring_death_loss_pct: body.spring_death_loss_pct,
      spring_misc_per_head: body.spring_misc_per_head,
      // Winter turn
      winter_sale_weight_lbs: body.winter_sale_weight_lbs,
      winter_days_on_feed: body.winter_days_on_feed,
      winter_health_cost_per_head: body.winter_health_cost_per_head,
      winter_freight_in_per_head: body.winter_freight_in_per_head,
      winter_mineral_cost_per_head: body.winter_mineral_cost_per_head,
      winter_lrp_premium_per_head: body.winter_lrp_premium_per_head,
      winter_marketing_commission_per_head: body.winter_marketing_commission_per_head,
      winter_freight_out_per_head: body.winter_freight_out_per_head,
      winter_death_loss_pct: body.winter_death_loss_pct,
      winter_misc_per_head: body.winter_misc_per_head,
      // Winter feed
      hay_price_per_bale: body.hay_price_per_bale,
      hay_bale_weight_lbs: body.hay_bale_weight_lbs,
      hay_daily_intake_lbs: body.hay_daily_intake_lbs,
      hay_waste_pct: body.hay_waste_pct,
      commodity_price_per_ton: body.commodity_price_per_ton,
      commodity_daily_intake_lbs: body.commodity_daily_intake_lbs,
    };

    // Include optional operator info fields if provided
    if ('operator_name' in body) {
      updateData.operator_name = body.operator_name;
    }
    if ('operation_location' in body) {
      updateData.operation_location = body.operation_location;
    }
    if ('acres' in body) {
      updateData.acres = body.acres;
    }
    if ('years_experience' in body) {
      updateData.years_experience = body.years_experience;
    }

    // Update with the fetched id
    const { data, error } = await supabase
      .from('plan_config')
      .update(updateData)
      .eq('id', currentConfig.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
