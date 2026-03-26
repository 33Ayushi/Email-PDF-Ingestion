import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as fs from 'fs';
import { readFile } from 'fs/promises';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 1. Find the attachment to get the physical path
    const attachment = await prisma.pdfAttachment.findUnique({
      where: { id }
    });

    if (!attachment || !attachment.savedPath) {
      return new NextResponse('PDF Attachment not found', { status: 404 });
    }

    // 2. Check if file exists on disk
    if (!fs.existsSync(attachment.savedPath)) {
      return new NextResponse('Physical PDF file not found on disk', { status: 404 });
    }

    // 3. Read file and return as PDF stream
    const fileBuffer = await readFile(attachment.savedPath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${attachment.attachmentFileName}"`,
      },
    });
  } catch (error: any) {
    return new NextResponse(`Error opening PDF: ${error.message}`, { status: 500 });
  }
}
