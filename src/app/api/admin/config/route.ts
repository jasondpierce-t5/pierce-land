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

    // Validate required fields
    const requiredFields = [
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
    ];

    const missingFields = requiredFields.filter((field) => !(field in body));
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate numeric fields
    const numericFields = [
      'market_price_500lb',
      'market_price_850lb',
      'hay_price_per_ton',
      'feed_cost_per_day',
      'avg_daily_gain_lbs',
      'mortality_rate_pct',
      'interest_rate_pct',
      'loc_amount',
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

    // Validate integer fields
    const integerFields = ['purchase_weight_lbs', 'sale_weight_lbs', 'head_count'];
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

    // Additional validation for percentage fields
    if (body.mortality_rate_pct < 0 || body.mortality_rate_pct > 100) {
      return NextResponse.json(
        { error: 'Mortality rate must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Update the singleton row
    // Since this is a singleton, we need to get the id first
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

    // Update with the fetched id
    const { data, error } = await supabase
      .from('plan_config')
      .update({
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
      })
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
