// app/api/signup/route.ts

import { NextResponse } from 'next/server';
import { initPrisma, prisma } from '@/lib/initPrisma'; 

export async function GET() {
    await initPrisma(); 
    const users = await prisma.user.findMany();
    return NextResponse.json(users);
}

export async function POST(req: Request) {
    await initPrisma(); 

    const body = await req.json();
    const { firstName, lastName, email, major, graduationYear, sub } = body;

    try {
        const newUser = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                major,
                graduationYear,
                cognitoSub: sub,
            },
        });

        return NextResponse.json(newUser, { status: 201 });

    } catch (error) {
        console.error('User creation failed:', error);
        return NextResponse.json({ error: 'User creation failed' }, { status: 500 });
    }
}
