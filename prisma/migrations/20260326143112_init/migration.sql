-- CreateTable
CREATE TABLE "EmailIngestionConfig" (
    "id" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "connectionType" TEXT NOT NULL,
    "host" TEXT,
    "port" INTEGER DEFAULT 993,
    "secure" BOOLEAN NOT NULL DEFAULT true,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailIngestionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdfAttachment" (
    "id" TEXT NOT NULL,
    "configId" TEXT,
    "fromAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "dateReceived" TIMESTAMP(3) NOT NULL,
    "attachmentFileName" TEXT NOT NULL,
    "savedPath" TEXT NOT NULL,
    "fileSizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PdfAttachment_pkey" PRIMARY KEY ("id")
);
