import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

import { stripe } from '../../../lib/stripe';

export async function POST(request) {
    try {
        const body = await request.json();
        const priceId = body.priceId;

        if (!priceId) {
            return NextResponse.json({ error: 'Missing priceId' }, { status: 400 });
        }

        const headersList = headers();
        const origin = headersList.get('origin');

        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/events?canceled=true`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err) {
        console.error('Stripe error:', err); // Add this line for server console error logging
        return NextResponse.json(
            { error: err.message },
            { status: err.statusCode || 500 }
        );
    }
}
