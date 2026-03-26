import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkInboxForPDFs } from '@/lib/emailClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { configId } = body;

    if (!configId) {
      return NextResponse.json(
        { success: false, error: 'configId is required' },
        { status: 400 }
      );
    }

    // Fetch the config (including password this time)
    const config = await prisma.emailIngestionConfig.findUnique({
      where: { id: configId },
    });

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Email configuration not found' },
        { status: 404 }
      );
    }

    // Run inbox check
    const result = await checkInboxForPDFs(config);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      downloadedCount: result.downloadedCount,
      errors: result.errors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
