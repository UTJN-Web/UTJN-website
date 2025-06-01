import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '../../../../lib/stripe'
import { ddbDocClient } from '../../../../lib/dynamodb'
import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"

const TABLE_NAME = process.env.TICKET_TABLE_NAME // Set this in your env variables

export async function POST(request) {
    const body = await request.text()
    const sig = headers().get('stripe-signature')

    try {
        const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object

            // Put ticket in DynamoDB
            const putParams = {
                TableName: TABLE_NAME,
                Item: {
                    sessionId: session.id,
                    eventId: session.metadata.eventId,
                    email: session.customer_details?.email || null,
                    status: 'purchased',
                    createdAt: new Date().toISOString(),
                }
            }

            await ddbDocClient.send(new PutCommand(putParams))
        }

        if (event.type === 'charge.refunded') {
            const charge = event.data.object
            const paymentIntentId = charge.payment_intent

            // Update ticket status to refunded
            const updateParams = {
                TableName: TABLE_NAME,
                Key: { sessionId: paymentIntentId },
                UpdateExpression: "set #status = :status",
                ExpressionAttributeNames: {
                    "#status": "status",
                },
                ExpressionAttributeValues: {
                    ":status": "refunded",
                }
            }

            await ddbDocClient.send(new UpdateCommand(updateParams))
        }

        return NextResponse.json({ received: true })
    } catch (err) {
        console.error('Stripe webhook error:', err.message)
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }
}