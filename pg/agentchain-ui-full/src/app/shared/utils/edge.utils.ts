import { CanvasNode, Point } from '../models/canvas';

export const NODE_W = 220;
export const NODE_H = 86;
export const OUT_X = NODE_W;
export const IN_X = 0;
export const PORT_Y = NODE_H / 2;

export function sourceAnchor(n: CanvasNode): Point { return { x: n.position.x + OUT_X, y: n.position.y + PORT_Y }; }
export function targetAnchor(n: CanvasNode): Point { return { x: n.position.x + IN_X, y: n.position.y + PORT_Y }; }

export function bezierBetween(start: Point, end: Point): string {
  const dx = Math.max(80, Math.abs(end.x - start.x) * 0.45);
  return `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
}

export function bezier(s: CanvasNode, t: CanvasNode): string {
  return bezierBetween(sourceAnchor(s), targetAnchor(t));
}

export function edgeMidpoint(s: CanvasNode, t: CanvasNode): Point {
  const a = sourceAnchor(s), b = targetAnchor(t);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 8 };
}
