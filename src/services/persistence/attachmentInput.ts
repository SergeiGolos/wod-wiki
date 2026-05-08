import type { AttachmentCreateInput } from '@/types/content-provider';

import type { AttachmentInput } from './types';

function isAttachmentDescriptor(input: File | AttachmentInput): input is AttachmentInput {
  if (typeof File !== 'undefined' && input instanceof File) {
    return false;
  }

  return 'file' in input || 'data' in input || 'id' in input || 'timeSpan' in input || 'label' in input || 'mimeType' in input;
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

  const file = input.file;
  if (!file && input.data === undefined) {
    throw new Error('Attachment input requires either file or data, but neither was provided');
  }

  return {
    id: input.id,
    label: input.label ?? file?.name ?? 'Attachment',
    mimeType: input.mimeType ?? file?.type ?? 'application/octet-stream',
    data: input.data ?? await file!.arrayBuffer(),
    timeSpan: input.timeSpan ?? { start: now, end: now },
  };
}
