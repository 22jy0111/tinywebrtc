/**
 * イベントの送信およびブロードキャスト時に使用される型定義
 */
export type ServerToClientEvents = {
  requestSDPOffer: () => void;
  broadcastSDPOffer: (sdpOffer : string) => void;
  broadcastICE: (ice : string) => void;
};

/**
 * イベント受信時に使用する型定義
 */
export type ClientToServerEvents = {
  join: (roomId : string) => void;
  responseSDPOffer: (sdpOffer : string) => void;
  responseSDPAnswer: (sdpOffer : string) => void;
  broadcastICE: (ice : string) => void;
  iceReceive: () => void;
};