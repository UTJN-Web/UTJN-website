// app/api/users/route.ts

import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        console.log('API route: forwarding users fetch to backend at:', backendUrl);
        
        const response = await fetch(`${backendUrl}/users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('Backend users fetch failed:', response.status, response.statusText);
            return NextResponse.json([], { status: response.status });
        }

        const users = await response.json();
        console.log('API route: users backend response success, count:', users.length);
        return NextResponse.json(users);
    } catch (error) {
        console.error('API route: users fetch error:', error);
        return NextResponse.json([], { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const body = await req.json();
        
        const response = await fetch(`${backendUrl}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Backend user creation failed:', errorData);
            return NextResponse.json({ error: 'User creation failed' }, { status: response.status });
        }

        const newUser = await response.json();
        return NextResponse.json(newUser, { status: 201 });

    } catch (error) {
        console.error('User creation failed:', error);
        return NextResponse.json({ error: 'User creation failed' }, { status: 500 });
    }
}
