import Konva from "konva";
import { getPosition } from "../util";

export class EditableText extends Konva.Text {
    constructor(config?: Konva.TextConfig) {
        super(config);
        // This implementation is mostly copied from
        // https://konvajs.org/docs/sandbox/Editable_Text.html, with some
        // modifications to get rid of the Transformer
        this.on('dblclick tbltap', () => {
            console.info("Edit start");
            this.hide();
            // Find the absolute position of text node
            const textPosition = this.absolutePosition();
            let stage: Konva.Stage = null;
            const ancestors = this.getAncestors().toArray();
            for (const anc of ancestors) {
                if (anc instanceof Konva.Layer) {
                    stage = anc.getStage();
                }
            }
            if (stage == null) {
                console.error("Could not find stage of EditableText!");
                this.show();
                return;
            }

            console.log("Stage container", stage.container());
            console.log("Stage offset", stage.container().offsetLeft,
                stage.container().offsetTop);
            stage.draggable(false);

            // Find position to place textarea in by adding the stage's
            // top-left co-ordinates
            const containerPos = getPosition(stage.container());
            const areaPosition = {
                x: containerPos.x + textPosition.x - this.offsetX(),
                y: containerPos.y + textPosition.y - this.offsetY()
            }

            // Create a textarea and style it
            const textarea = document.createElement('input');
            document.body.appendChild(textarea);

            // Apply styles to make the textarea appear as seamless as possible
            // on top of our Konva Text
            textarea.type = 'text';
            textarea.value = this.text();
            textarea.style.position = 'absolute';
            textarea.style.top = areaPosition.y + 'px';
            textarea.style.left = areaPosition.x + 'px';
            textarea.style.width = 'auto';
            textarea.style.height = this.height() - this.padding() * 2 + 5 + 'px';
            textarea.style.fontSize = this.fontSize() + 'px';
            textarea.style.border = 'none';
            textarea.style.padding = '0px';
            textarea.style.margin = '0px';
            textarea.style.overflow = 'hidden';
            textarea.style.background = 'none';
            textarea.style.outline = 'none';
            textarea.style.resize = 'none';
            textarea.style.lineHeight = this.lineHeight().toString();
            textarea.style.fontFamily = this.fontFamily();
            textarea.style.transformOrigin = 'left top';
            textarea.style.textAlign = this.align();
            textarea.style.color = this.fill();
            textarea.focus();
            textarea.select();

            const removeTextarea = () => {
                console.log("Removing textarea");
                stage.draggable(true);
                textarea.parentNode.removeChild(textarea);
                window.removeEventListener('click', handleOutsideClick);
                this.updateOffsets();
                this.show();
                this.draw();
            };

            textarea.addEventListener('keydown', (e: KeyboardEvent) => {
                // hide on enter
                if (e.key == "Enter") {
                    this.text(textarea.value);
                    removeTextarea();
                }
                // on esc do not set value back to node
                if (e.key == "Escape") {
                    removeTextarea();
                }
            });

            const handleOutsideClick = (e: MouseEvent) => {
                if (e.target !== textarea) {
                    this.text(textarea.value);
                    removeTextarea();
                }
            };
            setTimeout(() => {
                window.addEventListener('click', handleOutsideClick);
            });
        });
    }

    updateOffsets() {
        this.offsetX(this.width() / 2);
        this.offsetY(this.height() / 2);
    }
}
