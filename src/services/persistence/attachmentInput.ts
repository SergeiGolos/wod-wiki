import type { AttachmentCreateInput } from '@/types/content-provider';

import type { AttachmentInput } from './types';

function isAttachmentDescriptor(input: File | AttachmentInput): input is AttachmentInput {
  if (typeof File !== 'undefined' && input instanceof File) {
    return false;
  }

  return ('file' in input && input.file !== undefined) || ('data' in input && input.data !== undefined);
}

export async function resolveAttachmentInput(input: File | AttachmentInput): Promise<AttachmentCreateInput> {
  const now = Date.now();
  if (!isAttachmentDescriptor(input)) {
    return {
      label: input.name,
      mimeType: input.type,
      data: await input.arrayBuffer(),
      timeSpan: { start: now, end: now },
    };
  }

  const file = 'file' in input ? input.file : undefined;
  const data = 'data' in input ? input.data : undefined;
  let resolvedData: ArrayBuffer | string;
  if (data !== undefined) {
    resolvedData = data;
  } else {
    if (!file) {
      throw new Error('Attachment input requires either file or data, but neither was provided');
    }
    resolvedData = await file.arrayBuffer();
  }

  return {
    id: input.id,
    label: input.label ?? file?.name ?? 'Attachment',
    mimeType: input.mimeType ?? file?.type ?? 'application/octet-stream',
    data: resolvedData,
    timeSpan: input.timeSpan ?? { start: now, end: now },
  };
}
