// app/api/users/admin-status/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest) {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const body = await req.json();
        const { email, is_admin } = body;
        
        console.log('API route: updating admin status for', email, 'to', is_admin);
        
        const response = await fetch(`${backendUrl}/users/admin-status?email=${encodeURIComponent(email)}&is_admin=${is_admin}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Backend admin status update failed:', errorData);
            return NextResponse.json({ error: 'Failed to update admin status' }, { status: response.status });
        }

        const result = await response.json();
        console.log('API route: admin status update success');
        return NextResponse.json(result);
    } catch (error) {
        console.error('API route: admin status update error:', error);
        return NextResponse.json({ error: 'Failed to update admin status' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');
        
        if (!email) {
            return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
        }
        
        console.log('API route: getting admin status for', email);
        
        const response = await fetch(`${backendUrl}/users/admin-status?email=${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Backend admin status fetch failed:', errorData);
            return NextResponse.json({ error: 'Failed to get admin status' }, { status: response.status });
        }

        const result = await response.json();
        console.log('API route: admin status fetch success');
        return NextResponse.json(result);
    } catch (error) {
        console.error('API route: admin status fetch error:', error);
        return NextResponse.json({ error: 'Failed to get admin status' }, { status: 500 });
    }
} 