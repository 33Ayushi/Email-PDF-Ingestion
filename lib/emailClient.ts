import { ImapFlow } from 'imapflow';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from './prisma';

export interface EmailConfig {
  id: string;
  emailAddress: string;
  connectionType: string;
  host?: string | null;
  port?: number | null;
  secure?: boolean | null;
  username: string;
  password: string;
}

export interface DownloadResult {
  success: boolean;
  message: string;
  downloadedCount: number;
  errors: string[];
}

// Ensure pdfs directory exists
const PDF_DIR = path.join(process.cwd(), 'pdfs');

function ensurePdfDir() {
  if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR, { recursive: true });
  }
}

function getImapHost(config: EmailConfig): { host: string; port: number; secure: boolean } {
  const connectionType = config.connectionType.toUpperCase();

  if (connectionType === 'GMAIL') {
    return { host: 'imap.gmail.com', port: 993, secure: true };
  } else if (connectionType === 'OUTLOOK') {
    return { host: 'outlook.office365.com', port: 993, secure: true };
  } else {
    return {
      host: config.host || 'localhost',
      port: config.port || 993,
      secure: config.secure ?? true,
    };
  }
}

export async function checkInboxForPDFs(config: EmailConfig): Promise<DownloadResult> {
  ensurePdfDir();

  const result: DownloadResult = {
    success: false,
    message: '',
    downloadedCount: 0,
    errors: [],
  };

  const { host, port, secure } = getImapHost(config);
  console.log(`[Diagnostic] Connecting to ${host}:${port} (Secure: ${secure}) for user ${config.username}`);

  const client = new ImapFlow({
    host,
    port,
    secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
    logger: false,
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log(`[Diagnostic] Successfully connected to ${host}`);

    const lock = await client.getMailboxLock('INBOX');

    try {
      // Search for all emails
      const messages = client.fetch('1:*', {
        envelope: true,
        bodyStructure: true,
      });

      const messagesToProcess: { uid: number; envelope: any; bodyStructure: any }[] = [];

      for await (const msg of messages) {
        messagesToProcess.push({
          uid: msg.uid,
          envelope: msg.envelope,
          bodyStructure: msg.bodyStructure,
        });
      }

      console.log(`[Diagnostic] Found ${messagesToProcess.length} messages in INBOX`);

      for (const msgData of messagesToProcess) {
        const { uid, envelope, bodyStructure } = msgData;
        
        // Find PDF parts
        const pdfParts = findPdfParts(bodyStructure);
        
        if (pdfParts.length > 0) {
          console.log(`[Diagnostic] Found ${pdfParts.length} PDF part(s) in message UID ${uid} from ${envelope.from?.[0]?.address}`);
        }

        for (const part of pdfParts) {
          try {
            const filename =
              part.disposition?.parameters?.filename ||
              part.parameters?.name ||
              `attachment_${uid}_${Date.now()}.pdf`;

            // Ensure .pdf extension
            const safeFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
            const sanitizedFilename = safeFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filePath = path.join(PDF_DIR, sanitizedFilename);

            console.log(`[Diagnostic] Downloading attachment: ${sanitizedFilename}`);

            // Fetch the specific body part
            let download = await client.download(`${uid}`, part.part || '1', { uid: true });

            if (!download?.content) {
              result.errors.push(`Could not download part for message ${uid}`);
              continue;
            }

            // Write to file
            const writeStream = fs.createWriteStream(filePath);
            await new Promise<void>((resolve, reject) => {
              download!.content
                .pipe(writeStream)
                .on('finish', resolve)
                .on('error', reject);
            });

            const stats = fs.statSync(filePath);

            // Save metadata to database
            const fromAddress =
              envelope.from?.[0]
                ? `${envelope.from[0].name || ''} <${envelope.from[0].address || ''}>`.trim()
                : 'Unknown';

            await prisma.pdfAttachment.create({
              data: {
                configId: config.id,
                fromAddress: fromAddress.replace(/<>/g, '').trim() || 'Unknown',
                subject: envelope.subject || '(No Subject)',
                dateReceived: envelope.date || new Date(),
                attachmentFileName: sanitizedFilename,
                savedPath: filePath,
                fileSizeBytes: stats.size,
              },
            });

            result.downloadedCount++;
          } catch (partError: any) {
            console.error(`[Diagnostic] Error processing part in msg ${uid}: ${partError.message}`);
            result.errors.push(`Error processing part: ${partError.message}`);
          }
        }
      }

      result.success = true;
      result.message =
        result.downloadedCount > 0
          ? `Successfully downloaded ${result.downloadedCount} PDF(s)`
          : 'No PDF attachments found in inbox';
      
      console.log(`[Diagnostic] Finished scanning. Total downloaded: ${result.downloadedCount}`);
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (error: any) {
    result.success = false;
    result.message = `Connection failed: ${error.message}`;
    result.errors.push(error.message);
    console.error(`[Diagnostic] Connection error: ${error.message}`);

    try {
      await client.logout();
    } catch {}
  }

  return result;
}

interface BodyPart {
  type: string;
  subtype?: string;
  part?: string;
  parameters?: Record<string, string>;
  disposition?: {
    value?: string;
    parameters?: Record<string, string>;
  };
  childNodes?: BodyPart[];
}

function findPdfParts(structure: BodyPart, partPrefix: string = ''): BodyPart[] {
  const pdfParts: BodyPart[] = [];

  if (!structure) return pdfParts;

  // REASE ARCH: Better detection logic
  const type = (structure.type || '').toLowerCase();
  const subtype = (structure.subtype || '').toLowerCase();
  const filename = (structure.disposition?.parameters?.filename || structure.parameters?.name || '').toLowerCase();
  
  // Check if this part is a PDF
  const isPdf = 
    (type === 'application' && subtype === 'pdf') ||
    (filename.endsWith('.pdf')) ||
    (type === 'application' && subtype === 'octet-stream' && filename.endsWith('.pdf'));

  if (isPdf) {
    pdfParts.push({ ...structure, part: partPrefix || '1' });
  }

  // Recurse into child nodes (multipart)
  if (structure.childNodes && Array.isArray(structure.childNodes)) {
    structure.childNodes.forEach((child, index) => {
      // For ImapFlow, multipart parts are indexed 1, 2, 3...
      const childPart = partPrefix
        ? `${partPrefix}.${index + 1}`
        : `${index + 1}`;
      const childPdfs = findPdfParts(child, childPart);
      pdfParts.push(...childPdfs);
    });
  }

  return pdfParts;
}
