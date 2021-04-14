import Konva from "konva";
import { Vector2 } from "../commontypes";

export function getMouseEventXY(e: Konva.KonvaEventObject<MouseEvent>): Vector2 {
    const absolutePosition = e.target.getAbsolutePosition();
    const x = e.evt.offsetX - absolutePosition.x;
    const y = e.evt.offsetY - absolutePosition.y;
    return [x, y];
}
