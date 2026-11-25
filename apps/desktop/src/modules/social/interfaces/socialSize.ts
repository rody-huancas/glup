// One size of a network (constants/sizes.json): what the screen shows and what goes in the name.
export interface SocialSize {
  id     : string;
  label  : string;
  // "Instagram historia": the name of the file is "<nombre> (Instagram historia).jpg".
  tag    : string;
  width  : number;
  height : number;
}

export interface SocialNetwork {
  id      : string;
  network : string;
  sizes   : SocialSize[];
}
