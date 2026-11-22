export interface AnimateParams {
  element   : Element | null;
  keyframes : Keyframe[];
  options   : KeyframeAnimationOptions;
}

export interface AnimationScope {
  animate  : (params: AnimateParams) => Animation | null;
  finished : (animation: Animation | null) => Promise<void>;
  wait     : (ms: number) => Promise<void>;
  cancel   : () => void;
}
