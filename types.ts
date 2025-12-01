export enum ActionType {
  Idle = '待机 (4帧)',
  Hit = '受击 (1帧)',
  Walk = '行走 (4帧)',
  Attack = '攻击 (5帧)',
}

export interface SpriteConfig {
  rowCount: number;
  colCount: number;
  actionMap: Record<string, { row: number; frames: number }>;
}

export interface ProcessOptions {
  targetFrameWidth: number;
  targetFrameHeight: number;
  tolerance: number; // 0-100 for color matching
  bgColor: { r: number; g: number; b: number } | null; // Auto-detected or user picked
  offsets: Record<string, { x: number; y: number }[]>; // 用于处理时传递帧偏移
  removalMode: 'edge' | 'color'; // 新增去背模式
}

export const DEFAULT_CONFIG: SpriteConfig = {
  rowCount: 4,
  colCount: 5, // Based on the max frames (Attack)
  actionMap: {
    [ActionType.Idle]: { row: 0, frames: 4 },
    [ActionType.Hit]: { row: 1, frames: 1 },
    [ActionType.Walk]: { row: 2, frames: 4 },
    [ActionType.Attack]: { row: 3, frames: 5 },
  },
};
