import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '../../../lib/stripe'

export async function POST(request) {
    try {
        const headersList = await headers()
        const origin = headersList.get('origin')

        const body = await request.json()
        const priceId = body.priceId
        const eventId = body.eventId

        if (!priceId) {
            return NextResponse.json({ error: 'Missing priceId' }, { status: 400 })
        }

        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/events`,
            metadata: {
                eventId: eventId, // ✅ replace dynamically based on event
            },
        });

        // ✅ Send the URL as JSON
        return NextResponse.json({ url: session.url })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode || 500 })
    }
}