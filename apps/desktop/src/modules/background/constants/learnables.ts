import { BACKGROUND_TEXTS, LEARNED_TEXTS } from '@/modules/background/constants/texts';
import type { Learnable } from '@/modules/background/interfaces/learnable';
import { deleteBackgroundModel, downloadBackgroundModel, getBackgroundModel } from '@/modules/background/services/backgroundModel';
import type { LearnableId } from '@/modules/background/types/learnableId';
import { PHOTO_TEXTS } from '@/modules/photos/constants/photos';
import { TRANSCRIBE_TEXTS } from '@/modules/transcribe/constants/transcribe';
import { deleteTranscribeModel, downloadTranscribeModel, getTranscribeModel } from '@/modules/transcribe/services/transcribe';
import { UPSCALE_TEXTS } from '@/modules/upscale/constants/texts';
import { deleteUpscaleModel, downloadUpscaleModel, getUpscaleModel } from '@/modules/upscale/services/upscale';
import { VIDEO_TOOL_TEXTS } from '@/modules/video/constants/texts';
import { deleteVideoTool, downloadVideoTool, getVideoTool } from '@/modules/video/services/videoTool';

export const LEARNABLES: Record<LearnableId, Learnable> = {
  background : {
    id        : 'background',
    texts     : {
      body       : BACKGROUND_TEXTS.learnBody,
      learning   : BACKGROUND_TEXTS.learning,
      taskTitle  : BACKGROUND_TEXTS.taskTitle,
      learned    : LEARNED_TEXTS.removeBg,
      deleteBody : LEARNED_TEXTS.confirmBody,
    },
    getStatus : getBackgroundModel,
    download  : downloadBackgroundModel,
    remove    : deleteBackgroundModel,
  },
  video      : {
    id        : 'video',
    texts     : {
      body       : VIDEO_TOOL_TEXTS.learnBody,
      learning   : VIDEO_TOOL_TEXTS.learning,
      taskTitle  : VIDEO_TOOL_TEXTS.taskTitle,
      learned    : VIDEO_TOOL_TEXTS.learned,
      deleteBody : VIDEO_TOOL_TEXTS.deleteBody,
    },
    getStatus : getVideoTool,
    download  : downloadVideoTool,
    remove    : deleteVideoTool,
  },
  photos     : {
    id        : 'photos',
    texts     : {
      body       : PHOTO_TEXTS.learnBody,
      learning   : PHOTO_TEXTS.learning,
      taskTitle  : PHOTO_TEXTS.taskTitle,
      learned    : VIDEO_TOOL_TEXTS.learned,
      deleteBody : VIDEO_TOOL_TEXTS.deleteBody,
    },
    getStatus : getVideoTool,
    download  : downloadVideoTool,
    remove    : deleteVideoTool,
  },
  'transcribe-fast'    : {
    id        : 'transcribe-fast',
    texts     : {
      body       : TRANSCRIBE_TEXTS.learnBody,
      learning   : TRANSCRIBE_TEXTS.learning,
      taskTitle  : TRANSCRIBE_TEXTS.learnTask,
      learned    : TRANSCRIBE_TEXTS.learnedFast,
      deleteBody : TRANSCRIBE_TEXTS.deleteBody,
    },
    getStatus : () => getTranscribeModel('fast'),
    download  : (taskId) => downloadTranscribeModel('fast', taskId),
    remove    : () => deleteTranscribeModel('fast'),
  },
  'transcribe-precise' : {
    id        : 'transcribe-precise',
    texts     : {
      body       : TRANSCRIBE_TEXTS.learnBody,
      learning   : TRANSCRIBE_TEXTS.learning,
      taskTitle  : TRANSCRIBE_TEXTS.learnTask,
      learned    : TRANSCRIBE_TEXTS.learnedBest,
      deleteBody : TRANSCRIBE_TEXTS.deleteBody,
    },
    getStatus : () => getTranscribeModel('precise'),
    download  : (taskId) => downloadTranscribeModel('precise', taskId),
    remove    : () => deleteTranscribeModel('precise'),
  },
  'upscale-fast'       : {
    id        : 'upscale-fast',
    texts     : {
      body       : UPSCALE_TEXTS.learnBody,
      learning   : UPSCALE_TEXTS.learning,
      taskTitle  : UPSCALE_TEXTS.learnTask,
      learned    : UPSCALE_TEXTS.learnedFast,
      deleteBody : UPSCALE_TEXTS.deleteBody,
    },
    getStatus : () => getUpscaleModel('fast'),
    download  : (taskId) => downloadUpscaleModel('fast', taskId),
    remove    : () => deleteUpscaleModel('fast'),
  },
  'upscale-detail'     : {
    id        : 'upscale-detail',
    texts     : {
      body       : UPSCALE_TEXTS.learnBody,
      learning   : UPSCALE_TEXTS.learning,
      taskTitle  : UPSCALE_TEXTS.learnTask,
      learned    : UPSCALE_TEXTS.learnedBest,
      deleteBody : UPSCALE_TEXTS.deleteBody,
    },
    getStatus : () => getUpscaleModel('detail'),
    download  : (taskId) => downloadUpscaleModel('detail', taskId),
    remove    : () => deleteUpscaleModel('detail'),
  },
};

// In Ajustes, in this order.
export const LEARNABLE_ORDER: LearnableId[] = ['background', 'video', 'transcribe-fast', 'transcribe-precise', 'upscale-fast', 'upscale-detail'];
