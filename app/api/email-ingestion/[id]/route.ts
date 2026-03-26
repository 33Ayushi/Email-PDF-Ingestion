import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as fs from 'fs';

// GET - single config by id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const config = await prisma.emailIngestionConfig.findUnique({
      where: { id },
      select: {
        id: true,
        emailAddress: true,
        connectionType: true,
        host: true,
        port: true,
        secure: true,
        username: true,
        createdAt: true,
      },
    });

    if (!config) {
      return NextResponse.json({ success: false, error: 'Config not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update config
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { emailAddress, connectionType, host, port, secure, username, password } = body;

    const updateData: any = {};
    if (emailAddress) updateData.emailAddress = emailAddress;
    if (connectionType) updateData.connectionType = connectionType.toUpperCase();
    if (host !== undefined) updateData.host = host;
    if (port !== undefined) updateData.port = parseInt(port);
    if (secure !== undefined) updateData.secure = secure;
    if (username) updateData.username = username;
    if (password) updateData.password = password;

    const updated = await prisma.emailIngestionConfig.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: { ...updated, password: '***' } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Remove config and associated PDF files
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Find all attachments linked to this config
    const attachments = await prisma.pdfAttachment.findMany({
      where: { configId: id }
    });

    // 2. Physically delete each file from disk (Safe-guarded for Vercel)
    for (const attachment of attachments) {
      if (attachment.savedPath && fs.existsSync(attachment.savedPath)) {
        try {
          fs.unlinkSync(attachment.savedPath);
        } catch (fileErr: any) {
          // Silent on serverless environments
        }
      }
    }

    // 3. Delete attachment records from DB
    await prisma.pdfAttachment.deleteMany({
      where: { configId: id }
    });

    // 4. Delete the configuration
    await prisma.emailIngestionConfig.delete({
      where: { id: id }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Configuration and associated PDFs deleted successfully.` 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
