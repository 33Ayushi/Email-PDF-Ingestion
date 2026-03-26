import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch all configurations
export async function GET() {
  try {
    const configs = await prisma.emailIngestionConfig.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        emailAddress: true,
        connectionType: true,
        host: true,
        port: true,
        secure: true,
        username: true,
        createdAt: true,
        // Exclude password from response
      },
    });
    return NextResponse.json({ success: true, data: configs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new configuration
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { emailAddress, connectionType, host, port, secure, username, password } = body;

    if (!emailAddress || !connectionType || !username || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: emailAddress, connectionType, username, password' },
        { status: 400 }
      );
    }

    const config = await prisma.emailIngestionConfig.create({
      data: {
        emailAddress,
        connectionType: connectionType.toUpperCase(),
        host: host || null,
        port: port ? parseInt(port) : 993,
        secure: secure ?? true,
        username,
        password,
      },
    });

    return NextResponse.json({ success: true, data: { ...config, password: '***' } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
