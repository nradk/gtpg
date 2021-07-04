import Konva from "konva";
import { getPosition } from "../util";
import { GraphDrawing } from "../drawing/graphdrawing";
import { ToolName } from "../ui_handlers/tools";

export class EditableText extends Konva.Text {
    private textChangeCallback: (text: string) => void;

    constructor(private graphDrawing: GraphDrawing,
            private readonly editOn: Set<ToolName>, config?: Konva.TextConfig) {
        super(config);
        // This implementation is mostly copied from
        // https://konvajs.org/docs/sandbox/Editable_Text.html, with some
        // modifications to get rid of the Transformer
        this.on('dblclick dbltap', () => {
            // Handle events only on certain tools
            const currentTool = this.graphDrawing.getTools().getCurrentTool();
            if (!this.editOn.has(currentTool)) {
                return;
            }
            // Find the absolute position of text node
            const textPosition = this.absolutePosition();
            const stage = this.getStage();
            if (stage == null) {
                console.error("Could not find stage of EditableText!");
                this.show();
                return;
            }

            this.hide();
            stage.draggable(false);

            // Find position to place text input in by adding the stage's
            // top-left co-ordinates
            const containerPos = getPosition(stage.container());
            const areaPosition = {
                x: containerPos.x + textPosition.x - this.offsetX(),
                y: containerPos.y + textPosition.y - this.offsetY()
            }

            // Create a text input and style it
            const textinput = document.createElement('input');
            document.body.appendChild(textinput);

            // Apply styles to make the text input appear as seamless as
            // possible on top of our Konva Text
            textinput.type = 'text';
            textinput.value = this.text();
            textinput.style.position = 'absolute';
            textinput.style.top = areaPosition.y + 'px';
            textinput.style.left = areaPosition.x + 'px';
            textinput.style.width = 'auto';
            textinput.style.height = this.height() - this.padding() * 2 + 5 + 'px';
            textinput.style.fontSize = this.fontSize() + 'px';
            textinput.style.border = 'none';
            textinput.style.padding = '0px';
            textinput.style.margin = '0px';
            textinput.style.overflow = 'hidden';
            textinput.style.background = 'none';
            textinput.style.outline = 'none';
            textinput.style.resize = 'none';
            textinput.style.lineHeight = this.lineHeight().toString();
            textinput.style.fontFamily = this.fontFamily();
            textinput.style.transformOrigin = 'left top';
            textinput.style.textAlign = this.align();
            textinput.style.color = this.fill();
            textinput.focus();
            textinput.select();

            const removeTextarea = () => {
                stage.draggable(true);
                textinput.parentNode.removeChild(textinput);
                window.removeEventListener('click', handleOutsideClick);
                this.updateOffsets();
                this.show();
                this.draw();
            };

            textinput.addEventListener('keydown', (e: KeyboardEvent) => {
                // hide on enter
                if (e.key == "Enter") {
                    this.text(textinput.value);
                    this.textChangeCallback?.(textinput.value);
                    removeTextarea();
                }
                // on esc do not set value back to node
                if (e.key == "Escape") {
                    removeTextarea();
                }
            });

            const handleOutsideClick = (e: MouseEvent) => {
                if (e.target !== textinput) {
                    this.text(textinput.value);
                    this.textChangeCallback?.(textinput.value);
                    removeTextarea();
                }
            };
            setTimeout(() => {
                window.addEventListener('click', handleOutsideClick);
            });
        });
        let prevCursor: string = "default";
        this.on('mouseover', () => {
            const currentTool = this.graphDrawing.getTools().getCurrentTool();
            if (!this.editOn.has(currentTool)) {
                return;
            }
            const stage = this.getStage();
            prevCursor = stage.container().style.cursor;
            if (stage != null) {
                stage.container().style.cursor = 'text';
            }
        });
        this.on('mouseout', () => {
            const currentTool = this.graphDrawing.getTools().getCurrentTool();
            if (!this.editOn.has(currentTool)) {
                return;
            }
            const stage = this.getStage();
            if (stage != null) {
                stage.container().style.cursor = prevCursor;
            }
        });

    }

    updateOffsets() {
        this.offsetX(this.width() / 2);
        this.offsetY(this.height() / 2);
    }

    setTextChangeCallback(callback: (text: string) => void) {
        this.textChangeCallback = callback;
    }
}
