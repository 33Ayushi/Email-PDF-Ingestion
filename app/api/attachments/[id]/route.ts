import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Find the attachment
    const attachment = await prisma.pdfAttachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      return NextResponse.json(
        { success: false, error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // ❌ FILE DELETE REMOVED (Vercel does not support fs)

    // 2. Delete from database
    await prisma.pdfAttachment.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Attachment deleted (DB only)'
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
