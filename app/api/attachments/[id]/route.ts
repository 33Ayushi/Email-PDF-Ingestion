import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as fs from 'fs';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Find the attachment to get the file path
    const attachment = await prisma.pdfAttachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      return NextResponse.json(
        { success: false, error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // 2. Delete the physical file from disk
    if (attachment.savedPath && fs.existsSync(attachment.savedPath)) {
      try {
        fs.unlinkSync(attachment.savedPath);
      } catch (fileErr: any) {
        console.error(`Failed to delete file: ${fileErr.message}`);
      }
    }

    // 3. Delete from database
    await prisma.pdfAttachment.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Attachment deleted' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
