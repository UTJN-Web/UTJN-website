'use client';

import { useState } from 'react';
//
const events = [
    {
        id: 'prod_SPD6TM43Q7MxCO',
        name: 'Networking Night',
        description: 'Join us for a night of networking with fellow Japanese students.',
        priceId: 'price_1RTIB5JVPAoDskPz2QmfgoBU', // Replace with real Stripe Price ID
    },
    {
        id: 'prod_SPD6cldB2HkVLN',
        name: 'Career Talk',
        description: 'Hear from Japanese alumni working in Canada and Japan.',
        priceId: 'price_1RTIB5JVPAoDskPz2QmfgoBU', // Replace with real Stripe Price ID
    },
];

export default function EventsPage() {
    const [loading, setLoading] = useState(false);

    async function handleCheckout(priceId: string) {
        setLoading(true);
        try {
            const res = await fetch('/api/checkout-sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priceId }),
            });

            if (!res.ok) throw new Error('Failed to create checkout session');

            const data = await res.json();

            // Redirect to Stripe Checkout page
            window.location.href = data.url;
        } catch (err) {
            alert('Error: ' + (err as Error).message);
            setLoading(false);
        }
    }

    return (
        <div className="max-w-4xl w-full px-4 py-8">
            <h1 className="text-4xl font-bold mb-6">Member Events</h1>
            <div className="grid gap-6">
                {events.map((event) => (
                    <div key={event.id} className="p-6 rounded-lg border border-gray-300 shadow">
                        <h2 className="text-2xl font-semibold mb-2">{event.name}</h2>
                        <p className="text-gray-700 mb-4">{event.description}</p>
                        <button
                            onClick={() => handleCheckout(event.priceId)}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Redirecting...' : 'Get a Ticket'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}