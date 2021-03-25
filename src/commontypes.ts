import Konva from "konva";

export interface Point {
    x: number,
    y: number
};

export type MouseEventCallback = ((e: Konva.KonvaEventObject<MouseEvent>)
                                  => void);
export type Layout = "circular" | "random";
export type RedrawCallback = () => void;

