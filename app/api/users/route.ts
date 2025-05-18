// app/api/signup/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    const users = await prisma.user.findMany();
    return NextResponse.json(users);
}

export async function POST(req: Request) {
    const body = await req.json();
    const { name, email, sub } = body;
  
    const newUser = await prisma.user.create({
        data: {
            name,
            email,
            cognitoSub: sub,
        },
    });
  
    return NextResponse.json(newUser, { status: 201 });
}