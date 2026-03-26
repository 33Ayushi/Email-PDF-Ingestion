import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const attachment = await prisma.pdfAttachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      return new NextResponse('PDF Attachment not found', { status: 404 });
    }

    // ⚠️ Vercel me local file serve nahi kar sakte
    // Isliye sirf metadata return kar rahe hain

    return NextResponse.json({
      success: true,
      message: "File access not supported on Vercel (use cloud storage)",
      data: attachment
    });

  } catch (error: any) {
    return new NextResponse(
      `Error fetching PDF: ${error.message}`,
      { status: 500 }
    );
  }
}
