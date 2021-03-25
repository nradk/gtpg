import Konva from "konva";

export interface Point {
    x: number,
    y: number
};

export interface Size {
    height: number;
    width: number;
}

export type MouseEventCallback = ((e: Konva.KonvaEventObject<MouseEvent>)
                                  => void);
export type RedrawCallback = () => void;
