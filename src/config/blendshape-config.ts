import { BlendShapeConfig } from '@/types/blendshape';

export const DEFAULT_BLENDSHAPE_CONFIG: BlendShapeConfig = {
  eyes: {
    eyeSize: {
      blendShapeNames: ['Eye_L', 'Eye_S'],
      valueMapping: { min: -1, max: 1, default: 0 },
      conversionType: 'linear'
    },
    eyeShape: {
      blendShapeNames: ['Eye_Up', 'Eye_Down'],
      valueMapping: { min: -1, max: 1, default: 0 },
      conversionType: 'linear'
    },
    eyeDistance: {
      blendShapeNames: ['Eye_Close', 'Eye_Far'],
      valueMapping: { min: -1, max: 1, default: 0 },
      conversionType: 'linear'
    }
  },
  nose: {
    noseWidth: {
      blendShapeNames: ['Nose_Thick', 'Nose_Thin'],
      valueMapping: { min: -1, max: 1, default: 0 },
      conversionType: 'linear'
    },
    noseHeight: {
      blendShapeNames: ['Nose_High', 'Nose_Low'],
      valueMapping: { min: -1, max: 1, default: 0 },
      conversionType: 'linear'
    }
  },
  mouth: {
    mouthWidth: {
      blendShapeNames: ['Mouth_Wide', 'Mouth_Narrow'],
      valueMapping: { min: -1, max: 1, default: 0 },
      conversionType: 'linear'
    },
    lipThickness: {
      blendShapeNames: ['Lips_Thick', 'Lips_Thin'],
      valueMapping: { min: -1, max: 1, default: 0 },
      conversionType: 'linear'
    }
  },
  face: {
    faceWidth: {
      blendShapeNames: ['Face_Round', 'Face_Long'],
      valueMapping: { min: -1, max: 1, default: 0 },
      conversionType: 'linear'
    },
    chinShape: {
      blendShapeNames: ['Chin_Sharp', 'Chin_Round'],
      valueMapping: { min: -1, max: 1, default: 0 },
      conversionType: 'linear'
    }
  }
};